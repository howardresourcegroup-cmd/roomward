"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Plus, Trash2, Check, Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useRoles } from "@/lib/data/hooks";
import { togglePermission, createRole, deleteRole } from "@/lib/data/roles";
import { PERMISSION_CATALOG, ROLE_COLORS, ROLE_COLOR_OPTIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

export function RolesManager() {
  const { roles, loading, reload } = useRoles();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localPerms, setLocalPerms] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const selected = roles.find((r) => r.id === selectedId) ?? roles[0];

  useEffect(() => {
    if (!selectedId && roles.length) setSelectedId(roles[0].id);
  }, [roles, selectedId]);

  useEffect(() => {
    if (selected) setLocalPerms(new Set(selected.permissions ?? []));
  }, [selected]);

  const toggle = async (permission: string) => {
    if (!selected) return;
    const has = localPerms.has(permission);
    const next = new Set(localPerms);
    if (has) next.delete(permission); else next.add(permission);
    setLocalPerms(next);
    setSaving(permission);
    try { await togglePermission(selected.id, permission, !has); } catch { /* revert on error */ setLocalPerms(localPerms); }
    setSaving(null);
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading roles…</div>;
  }

  if (roles.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center space-y-3">
        <p>Roles aren&apos;t set up yet. Run migration <code className="text-muted-foreground">003_roles_permissions.sql</code> in Supabase, then refresh.</p>
      </div>
    );
  }

  const grantedCount = (r: Role) => r.permissions?.length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Roles &amp; Permissions</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Fully configurable — toggle any capability for any role.</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" />
          New Role
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
        {/* Role list */}
        <div className="space-y-1.5">
          {roles.map((r) => {
            const c = ROLE_COLORS[r.color] ?? ROLE_COLORS.zinc;
            const isSel = r.id === selected?.id;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={cn(
                  "w-full text-left rounded-xl border px-3 py-2.5 transition-all",
                  isSel ? cn(c.bg, c.border) : "border-border bg-foreground/[0.02] hover:bg-foreground/[0.04]"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", c.dot)} />
                  <span className={cn("text-sm font-medium truncate", isSel ? c.text : "text-foreground")}>{r.name}</span>
                  {r.is_system && <Lock className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Shield className="h-2.5 w-2.5" />{grantedCount(r)} perms</span>
                  <span className="flex items-center gap-1"><Users className="h-2.5 w-2.5" />{r._member_count ?? 0}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Permission matrix for selected role */}
        {selected && (
          <div className="glass-card p-5 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{selected.name}</h3>
                  {selected.is_system && (
                    <span className="text-[10px] text-muted-foreground bg-foreground/[0.05] border border-border px-1.5 py-0.5 rounded-md">System</span>
                  )}
                </div>
                {selected.description && <p className="text-xs text-muted-foreground mt-0.5">{selected.description}</p>}
              </div>
              {!selected.is_system && (
                <button
                  onClick={async () => { await deleteRole(selected.id); setSelectedId(null); reload(); }}
                  className="text-muted-foreground hover:text-red-400 transition-colors"
                  title="Delete role"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-5">
              {PERMISSION_CATALOG.map((group) => (
                <div key={group.area}>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{group.area}</p>
                  <div className="space-y-1">
                    {group.permissions.map((perm) => {
                      const on = localPerms.has(perm.key);
                      return (
                        <button
                          key={perm.key}
                          onClick={() => toggle(perm.key)}
                          className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-foreground/[0.03] transition-colors text-left group"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-foreground">{perm.label}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{perm.description}</p>
                          </div>
                          {/* Toggle switch */}
                          <span className={cn(
                            "relative h-5 w-9 rounded-full transition-colors shrink-0",
                            on ? "bg-indigo-500" : "bg-foreground/[0.08]",
                            saving === perm.key && "opacity-60"
                          )}>
                            <motion.span
                              layout
                              className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm"
                              animate={{ left: on ? 18 : 2 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <CreateRoleDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={(r) => { reload(); setSelectedId(r.id); }} />
    </div>
  );
}

function CreateRoleDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (r: Role) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("emerald");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const r = await createRole({ name: name.trim(), description: description.trim(), color });
      onCreated(r);
      onClose();
      setName(""); setDescription("");
    } catch { toast.error("Couldn't create the role. Please try again."); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Role</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="px-6 pb-2 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Role Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Groundskeeper" autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this role does" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Color</label>
              <div className="flex gap-2">
                {ROLE_COLOR_OPTIONS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={cn("h-7 w-7 rounded-lg border-2 transition-all", ROLE_COLORS[c].dot,
                      color === c ? "border-white scale-110" : "border-transparent opacity-60")} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              <Check className="h-3.5 w-3.5" />{saving ? "Creating…" : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
