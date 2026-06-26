"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Plus, Phone, Wrench, CheckCircle2, Clock, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useProfiles, useWorkOrders, usePermissions, useRoles } from "@/lib/data/hooks";
import { isMaintenanceRole } from "@/lib/permissions";
import { cn, getInitials } from "@/lib/utils";
import type { Profile, WorkOrder } from "@/types";

function TechCard({ tech, index, workOrders }: { tech: Profile; index: number; workOrders: WorkOrder[] }) {
  const assignedOrders = workOrders.filter(
    (w) => w.assigned_to === tech.id && w.status !== "completed" && w.status !== "cancelled"
  );
  const completedToday = workOrders.filter(
    (w) => w.assigned_to === tech.id && w.status === "completed"
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="glass-card p-5 space-y-4 hover:border-border transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-11 w-11">
              <AvatarFallback className="text-sm">{getInitials(tech.full_name)}</AvatarFallback>
            </Avatar>
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0f0f1a]",
              tech.is_available ? "bg-emerald-400" : "bg-amber-400"
            )} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{tech.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{tech.role}</p>
          </div>
        </div>
        <Badge variant={tech.is_available ? "success" : "warning"}>
          {tech.is_available ? "Available" : "On Task"}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-foreground/[0.03] border border-border p-2.5 text-center">
          <p className="text-lg font-bold text-foreground tabular-nums">{assignedOrders.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Active</p>
        </div>
        <div className="rounded-lg bg-foreground/[0.03] border border-border p-2.5 text-center">
          <p className="text-lg font-bold text-foreground tabular-nums">{completedToday}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Closed</p>
        </div>
        <div className="rounded-lg bg-foreground/[0.03] border border-border p-2.5 text-center">
          <p className="text-lg font-bold text-foreground tabular-nums">
            {assignedOrders.filter((w) => w.priority === "critical" || w.priority === "high").length}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Urgent</p>
        </div>
      </div>

      {/* Current task */}
      {assignedOrders[0] && (
        <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-2.5">
          <p className="text-[10px] text-indigo-400 font-medium uppercase tracking-wider mb-1">Current Task</p>
          <p className="text-xs text-foreground line-clamp-1">{assignedOrders[0].title}</p>
        </div>
      )}

      {/* Phone */}
      {tech.phone && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Phone className="h-3 w-3" />
          {tech.phone}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="secondary" className="flex-1 text-xs" asChild>
          <Link href={`/work-orders/new?assignee=${encodeURIComponent(tech.full_name)}`}>
            <Wrench className="h-3 w-3" />
            Assign Task
          </Link>
        </Button>
        <Button size="sm" variant="ghost" className="text-xs" asChild>
          <Link href="/work-orders">View All</Link>
        </Button>
      </div>
    </motion.div>
  );
}

export default function TechniciansPage() {
  const { profiles } = useProfiles();
  const { workOrders } = useWorkOrders();
  const { can } = usePermissions();
  const [showInvite, setShowInvite] = useState(false);
  const technicians = profiles.filter((p) => isMaintenanceRole(p.role) || p.role === "manager");
  const available = technicians.filter((t) => t.is_available).length;
  const busy = technicians.filter((t) => !t.is_available).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Technicians</h1>
          <div className="flex items-center gap-3 mt-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {available} available
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {busy} on task
            </span>
          </div>
        </div>
        {can("team.manage") && (
          <Button onClick={() => setShowInvite(true)}>
            <Plus className="h-4 w-4" />
            Add Technician
          </Button>
        )}
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Technicians", value: technicians.length, icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/15" },
          { label: "Resolved Today", value: workOrders.filter((w) => w.status === "completed").length, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/15" },
          { label: "Avg. Response", value: "28 min", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/15" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="glass-card p-4 flex items-center gap-3">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", bg)}>
              <Icon className={cn("h-4.5 w-4.5", color)} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Technician grid */}
      {technicians.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No technicians yet"
          description="Invite your maintenance team to start assigning and tracking work orders."
          action={can("team.manage") ? { label: "Add Technician", onClick: () => setShowInvite(true) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {technicians.map((t, i) => (
            <TechCard key={t.id} tech={t} index={i} workOrders={workOrders} />
          ))}
        </div>
      )}

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  );
}

function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { roles } = useRoles();
  const [form, setForm] = useState({ name: "", email: "", role: "maintenance" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ email: string; temp_password: string } | null>(null);

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

  const reset = () => { setResult(null); setForm({ name: "", email: "", role: "maintenance" }); setError(""); onClose(); };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{result ? "Teammate added" : "Invite Teammate"}</DialogTitle></DialogHeader>
        {result ? (
          <div className="px-6 pb-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground">{result.email}</span> can now sign in. Share these temporary credentials —
              they should change the password after first login.
            </p>
            <div className="rounded-lg bg-foreground/[0.03] border border-border p-3 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">email</span><span className="text-foreground">{result.email}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">password</span>
                <span className="flex items-center gap-2 text-foreground">
                  {result.temp_password}
                  <button onClick={() => navigator.clipboard.writeText(result.temp_password)} className="text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
                </span>
              </div>
            </div>
            <DialogFooter><Button onClick={reset}>Done</Button></DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="px-6 pb-2 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Full Name</label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Alex Rivera" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Email *</label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="alex@property.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Role</label>
                <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.filter((r) => r.slug !== "admin").map((r) => <SelectItem key={r.id} value={r.slug}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={reset}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.email.trim()}>{saving ? "Inviting…" : "Send Invite"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
