"use client";

import Link from "next/link";
import { BedDouble, CircleCheck, AlertTriangle, ArrowRight, Plus } from "lucide-react";
import { useWorkOrders, useHousekeeping } from "@/lib/data/hooks";
import { WorkOrderCard } from "@/components/work-orders/work-order-card";
import { cn } from "@/lib/utils";
import type { Profile, Space } from "@/types";

function StatChip({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="glass-card p-4">
      <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function Greeting({ name, sub }: { name: string; sub: string }) {
  const h = new Date().getHours();
  const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">{g}, {name}</h1>
      <p className="text-sm text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

// ─── Maintenance Tech ─────────────────────────────────────────────────────────
export function MaintenanceDashboard({ profile }: { profile: Profile }) {
  const { workOrders } = useWorkOrders();
  const mine = workOrders.filter((w) => w.assigned_to === profile.id);
  const active = mine.filter((w) => w.status !== "completed" && w.status !== "cancelled");
  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <Greeting name={profile.full_name.split(" ")[0]} sub="Here's your work queue." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatChip label="Assigned to you" value={active.length} color="text-indigo-400" />
        <StatChip label="In progress" value={mine.filter((w) => w.status === "in_progress").length} color="text-blue-400" />
        <StatChip label="Waiting on parts" value={mine.filter((w) => w.status === "waiting_parts").length} color="text-amber-400" />
        <StatChip label="Completed today" value={mine.filter((w) => w.completed_at && new Date(w.completed_at) >= today).length} color="text-emerald-400" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Your active jobs</h2>
          <Link href="/work-orders" className="tap-relaxed text-xs text-indigo-400 hover:text-indigo-300">All work orders →</Link>
        </div>
        {active.length === 0 ? (
          <div className="glass-card p-8 text-center text-sm text-muted-foreground">
            <CircleCheck className="h-6 w-6 text-emerald-400 mx-auto mb-2" /> You&apos;re all caught up.
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((o, i) => <WorkOrderCard key={o.id} order={o} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Housekeeping ─────────────────────────────────────────────────────────────
export function HousekeepingDashboard({ profile }: { profile: Profile }) {
  const { rooms } = useHousekeeping();
  const by = (s: string) => rooms.filter((r) => (r.housekeeping_status ?? "ready") === s);
  const dirty = by("dirty");

  return (
    <div className="space-y-6 max-w-4xl">
      <Greeting name={profile.full_name.split(" ")[0]} sub="Today's room turnover." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatChip label="To clean" value={dirty.length} color="text-red-400" />
        <StatChip label="In progress" value={by("in_progress").length} color="text-blue-400" />
        <StatChip label="Awaiting inspection" value={by("cleaned").length} color="text-cyan-400" />
        <StatChip label="Ready" value={by("ready").length} color="text-emerald-400" />
      </div>

      <Link href="/housekeeping" className="glass-card p-5 flex items-center justify-between hover:border-border transition-colors group">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
            <BedDouble className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Open the Housekeeping Board</p>
            <p className="text-xs text-muted-foreground">Update room status as you clean — front desk sees it live.</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
      </Link>

      {dirty.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Rooms to clean</h2>
          <div className="flex flex-wrap gap-2">
            {dirty.map((r) => (
              <span key={r.id} className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5">{r.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Front Desk ───────────────────────────────────────────────────────────────
export function FrontDeskDashboard({ profile }: { profile: Profile }) {
  const { rooms } = useHousekeeping();
  const { workOrders } = useWorkOrders();
  const ready = rooms.filter((r) => (r.housekeeping_status ?? "ready") === "ready");
  const notReady = rooms.filter((r) => ["dirty", "in_progress", "cleaned"].includes(r.housekeeping_status ?? "ready"));
  const guestIssues = workOrders.filter((w) =>
    w.status !== "completed" && w.status !== "cancelled" &&
    (w.space as (Space & { name?: string }) | undefined)?.name?.match(/room|suite|cabin/i)
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <Greeting name={profile.full_name.split(" ")[0]} sub="Front desk overview." />
        <Link href="/work-orders/new" className="btn-primary text-sm h-9">
          <Plus className="h-4 w-4" /> Report an issue
        </Link>
      </div>

      {/* Big readiness number */}
      <div className="glass-card p-6 bg-gradient-to-br from-emerald-500/[0.08] to-transparent border-emerald-500/15">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <CircleCheck className="h-7 w-7 text-emerald-400" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground tabular-nums">{ready.length}<span className="text-lg text-muted-foreground font-normal"> rooms ready</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">{notReady.length} still being turned over · updates live from housekeeping</p>
          </div>
        </div>
      </div>

      <Link href="/housekeeping" className="tap-relaxed text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">
        View full housekeeping board <ArrowRight className="h-3 w-3" />
      </Link>

      {guestIssues.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Open issues in guest rooms
          </h2>
          <div className="space-y-2">
            {guestIssues.slice(0, 5).map((o, i) => <WorkOrderCard key={o.id} order={o} index={i} />)}
          </div>
        </div>
      )}
    </div>
  );
}
