"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, UserCog, Copy, Check, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProfiles, useRoles, useCurrentProfile } from "@/lib/data/hooks";
import { assignRole } from "@/lib/data/roles";
import { getInitials, cn } from "@/lib/utils";
import type { Profile } from "@/types";

export function TeamManager() {
  const { profiles, loading } = useProfiles();
  const { roles } = useRoles();
  const me = useCurrentProfile();
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<Profile | null>(null);
  const [changingRole, setChangingRole] = useState<Profile | null>(null);
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);

  const filtered = profiles.filter(p =>
    !search || p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const confirmRemove = async () => {
    if (!pendingRemove) return;
    const userId = pendingRemove.id;
    setRemovingId(userId);
    try {
      const res = await fetch("/api/team/remove", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error();
      refresh();
      setPendingRemove(null);
    } catch { toast.error("Couldn't remove the team member. Please try again."); }
    setRemovingId(null);
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground text-sm">Loading team…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search members…"
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Button size="sm" onClick={() => setShowInvite(true)}>
          <Plus className="h-3.5 w-3.5" />
          Invite
        </Button>
      </div>

      <div className="divide-y divide-white/[0.05]">
        {filtered.map(profile => (
          <div key={profile.id} className="flex items-center gap-3 py-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="text-xs">{getInitials(profile.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile.full_name || "(no name)"}</p>
              <p className="text-xs text-muted-foreground truncate">{profile.email ?? ""}</p>
            </div>
            <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-foreground/[0.05] text-muted-foreground border border-border shrink-0">
              {profile.role_slug ?? profile.role ?? "—"}
            </span>
            {profile.id !== me?.id && (
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setChangingRole(profile)} title="Change role">
                  <UserCog className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon" variant="ghost"
                  className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => setPendingRemove(profile)}
                  disabled={removingId === profile.id}
                  title="Remove from organization"
                >
                  {removingId === profile.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )}
            {profile.id === me?.id && (
              <span className="text-[10px] text-muted-foreground shrink-0">you</span>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-muted-foreground text-sm">No team members found.</p>
        )}
      </div>

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} />
      {changingRole && (
        <ChangeRoleModal
          profile={changingRole}
          roles={roles}
          onClose={() => setChangingRole(null)}
          onDone={() => { setChangingRole(null); refresh(); }}
        />
      )}

      <ConfirmDialog
        open={!!pendingRemove}
        onOpenChange={(o) => !o && setPendingRemove(null)}
        title={`Remove ${pendingRemove?.full_name ?? "this member"}?`}
        description="They'll lose access to this organization immediately. This cannot be undone."
        confirmLabel="Remove member"
        destructive
        loading={!!removingId}
        onConfirm={confirmRemove}
      />
    </div>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────
function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { roles } = useRoles();
  const [form, setForm] = useState({ name: "", email: "", role: "maintenance" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ email: string; temp_password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) return;
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Invite failed"); setSaving(false); return; }
      setResult({ email: data.email, temp_password: data.temp_password });
    } catch { setError("Connection error"); }
    setSaving(false);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(`Email: ${result!.email}\nPassword: ${result!.temp_password}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => { setResult(null); setForm({ name: "", email: "", role: "maintenance" }); setError(""); setCopied(false); onClose(); };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{result ? "Member added" : "Invite Team Member"}</DialogTitle></DialogHeader>
        {result ? (
          <div className="px-6 pb-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{result.email}</span> can now sign in. Share these credentials — they should change the password after first login.
            </p>
            <div className="rounded-lg bg-card border border-border p-3 space-y-2 font-mono text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">email</span><span className="text-foreground">{result.email}</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">password</span><span className="text-foreground">{result.temp_password}</span></div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="secondary" onClick={copyAll} className="gap-2">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy credentials"}
              </Button>
              <Button onClick={reset}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="px-6 pb-2 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Full name</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Alex Rivera" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Email *</label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="alex@property.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Role</label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.filter(r => r.slug !== "admin").map(r => (
                      <SelectItem key={r.id} value={r.slug}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={reset}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.email.trim()}>
                {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Inviting…</> : "Add member"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Change Role Modal ─────────────────────────────────────────────────────────
function ChangeRoleModal({ profile, roles, onClose, onDone }: {
  profile: Profile;
  roles: import("@/types").Role[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [roleId, setRoleId] = useState(profile.role_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    setSaving(true); setError("");
    try {
      await assignRole(profile.id, role.id, role.slug);
      onDone();
    } catch { setError("Failed to update role"); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Change role — {profile.full_name}</DialogTitle></DialogHeader>
        <div className={cn("px-6 pb-2 space-y-3")}>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent>
              {roles.filter(r => r.slug !== "admin").map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !roleId}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
