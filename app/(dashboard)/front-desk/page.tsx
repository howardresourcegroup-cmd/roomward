"use client";

import { useState, useMemo } from "react";
import { ConciergeBell, BedDouble, CheckCircle2, AlertCircle, Clock, WrenchIcon, Send, Loader2 } from "lucide-react";
import { useHousekeeping, usePermissions, useCurrentProfile } from "@/lib/data/hooks";
import { createWorkOrder } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/client";
import { PageLoader } from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { HousekeepingStatus, WorkOrderPriority } from "@/types";

const HK_CONFIG: Record<HousekeepingStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  dirty:          { label: "Needs Cleaning",  color: "text-red-400",     bg: "bg-red-500/[0.07]",     border: "border-red-500/20",     icon: AlertCircle },
  in_progress:    { label: "Being Cleaned",   color: "text-blue-400",    bg: "bg-blue-500/[0.07]",    border: "border-blue-500/20",    icon: Clock },
  cleaned:        { label: "Awaiting Inspect",color: "text-cyan-400",    bg: "bg-cyan-500/[0.07]",    border: "border-cyan-500/20",    icon: Clock },
  ready:          { label: "Ready",           color: "text-emerald-400", bg: "bg-emerald-500/[0.07]", border: "border-emerald-500/20", icon: CheckCircle2 },
  out_of_service: { label: "Out of Service",  color: "text-muted-foreground",    bg: "bg-zinc-500/[0.07]",    border: "border-border/20",    icon: WrenchIcon },
};

const CATEGORIES = ["General", "Plumbing", "Electrical", "HVAC", "Furniture", "Cleaning", "Safety", "Other"];
const PRIORITIES: { value: WorkOrderPriority; label: string; color: string }[] = [
  { value: "low",      label: "Low",      color: "text-muted-foreground" },
  { value: "medium",   label: "Medium",   color: "text-blue-400" },
  { value: "high",     label: "High",     color: "text-amber-400" },
  { value: "critical", label: "Critical", color: "text-red-400" },
];

export default function FrontDeskPage() {
  const { rooms, loading } = useHousekeeping();
  const { can } = usePermissions();
  const me = useCurrentProfile();
  const [tab, setTab] = useState<"status" | "request">("status");

  // Work order form state
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority]     = useState<WorkOrderPriority>("medium");
  const [category, setCategory]     = useState("General");
  const [spaceId, setSpaceId]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  const byStatus = useMemo(() => {
    const map: Record<HousekeepingStatus, typeof rooms> = {
      dirty: [], in_progress: [], cleaned: [], ready: [], out_of_service: [],
    };
    for (const r of rooms) (map[r.housekeeping_status ?? "ready"] ??= []).push(r);
    return map;
  }, [rooms]);

  const readyCount = byStatus.ready.length;
  const dirtyCount = byStatus.dirty.length + byStatus.in_progress.length + byStatus.cleaned.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !me) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user!.id).single();
      await createWorkOrder({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        category,
        space_id: spaceId || null,
        assigned_to: null,
        organization_id: profile!.organization_id,
        created_by: user!.id,
      });
      setTitle(""); setDescription(""); setPriority("medium"); setCategory("General"); setSpaceId("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
    } catch { toast.error("Couldn't submit the request. Please try again."); }
    setSubmitting(false);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/20">
            <ConciergeBell className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Front Desk</h1>
            <div className="flex items-center gap-3 mt-1 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />{readyCount} ready for check-in
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <BedDouble className="h-3.5 w-3.5" />{dirtyCount} not ready
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Live
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-card/50 rounded-xl w-fit">
        {[
          { key: "status",  label: "Room Status" },
          { key: "request", label: "Submit Work Order", hidden: !can("work_orders.create") },
        ].filter(t => !t.hidden).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all",
              tab === key
                ? "bg-zinc-700 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Room Status Tab */}
      {tab === "status" && (
        <div className="space-y-4">
          {(["ready", "cleaned", "in_progress", "dirty", "out_of_service"] as HousekeepingStatus[]).map((status) => {
            const cfg = HK_CONFIG[status];
            const StatusIcon = cfg.icon;
            const list = byStatus[status];
            if (!list.length) return null;
            return (
              <div key={status} className={cn("rounded-xl border p-4", cfg.bg, cfg.border)}>
                <div className="flex items-center gap-2 mb-3">
                  <StatusIcon className={cn("h-4 w-4", cfg.color)} />
                  <span className={cn("text-sm font-semibold", cfg.color)}>{cfg.label}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.color, "border", cfg.border)}>
                    {list.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {list.map((room) => (
                    <span
                      key={room.id}
                      className="px-2.5 py-1 rounded-lg bg-card/60 border border-border/50 text-foreground text-xs font-medium"
                    >
                      {room.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          {rooms.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">No rooms configured yet.</div>
          )}
        </div>
      )}

      {/* Submit Work Order Tab */}
      {tab === "request" && can("work_orders.create") && (
        <div className="max-w-lg">
          {submitted && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-emerald-400 text-sm">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              Work order submitted — a technician will be assigned shortly.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Issue title *</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. AC not cooling in Room 204"
                required
                className="w-full rounded-lg bg-card/80 border border-border px-3 py-2 text-sm text-foreground placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>

            {/* Room */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Room (optional)</label>
              <select
                value={spaceId}
                onChange={e => setSpaceId(e.target.value)}
                className="w-full rounded-lg bg-card/80 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
              >
                <option value="">— No specific room —</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Category + Priority row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full rounded-lg bg-card/80 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as WorkOrderPriority)}
                  className="w-full rounded-lg bg-card/80 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                >
                  {PRIORITIES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the issue in more detail…"
                rows={3}
                className="w-full rounded-lg bg-card/80 border border-border px-3 py-2 text-sm text-foreground placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 resize-none"
              />
            </div>

            <Button type="submit" disabled={submitting || !title.trim()} className="w-full gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? "Submitting…" : "Submit Work Order"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
