"use client";

import Link from "next/link";
import { useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowRight, CircleCheck, TriangleAlert, Package, Wrench,
  Thermometer, Store, CalendarClock, CircleDollarSign, Users, ChefHat, DoorOpen,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WorkOrderCard } from "@/components/work-orders/work-order-card";
import {
  useWorkOrders, useHousekeeping, useAssets, useFnbTempLogs, useFnbOutlets,
  useFnbInventory, useBanquetEvents, useCurrentProfile, useProfiles, useOccupancy,
} from "@/lib/data/hooks";
import { formatCents, formatPct, toStayDate, addDays, lastNight } from "@/lib/analytics";
import { isMaintenanceRole } from "@/lib/permissions";
import { cn, getInitials } from "@/lib/utils";

// Department-specific dashboard panels. Each one is self-fetching so the
// dashboard can compose them in whatever order the user has chosen, and each is
// backed by data the app genuinely holds — no invented metrics.

export function WidgetShell({
  eyebrow, title, href, linkLabel, children, className,
}: {
  eyebrow: string; title: string; href?: string; linkLabel?: string;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("glass-card p-5 h-full", className)}>
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{eyebrow}</p>
          <p className="text-base font-semibold text-foreground mt-0.5 truncate">{title}</p>
        </div>
        {href && (
          <Link href={href} className="tap-relaxed text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors shrink-0">
            {linkLabel ?? "View all"} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Tile({ label, value, tone = "text-foreground" }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-foreground/[0.02] p-3">
      <p className={cn("text-xl font-bold tabular-nums", tone)}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground text-center py-6">{children}</p>;
}

// ─── Engineering ─────────────────────────────────────────────────────────────
/** The technician's own queue — what the hardcoded maintenance dashboard used to show. */
export function MyWorkQueueWidget() {
  const { workOrders } = useWorkOrders();
  const me = useCurrentProfile();

  const { active, inProgress, waiting, doneToday } = useMemo(() => {
    const mine = workOrders.filter((w) => w.assigned_to === me?.id);
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    return {
      active: mine.filter((w) => w.status !== "completed" && w.status !== "cancelled"),
      inProgress: mine.filter((w) => w.status === "in_progress").length,
      waiting: mine.filter((w) => w.status === "waiting_parts").length,
      doneToday: mine.filter((w) => w.completed_at && new Date(w.completed_at) >= midnight).length,
    };
  }, [workOrders, me?.id]);

  return (
    <WidgetShell eyebrow="Engineering" title="My work queue" href="/work-orders" linkLabel="All jobs">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Tile label="Assigned to you" value={active.length} tone="text-indigo-400" />
        <Tile label="In progress" value={inProgress} tone="text-blue-400" />
        <Tile label="Waiting on parts" value={waiting} tone="text-amber-400" />
        <Tile label="Completed today" value={doneToday} tone="text-emerald-400" />
      </div>
      {active.length === 0 ? (
        <p className="text-sm text-emerald-400 text-center py-4 flex items-center justify-center gap-2">
          <CircleCheck className="h-4 w-4" /> You&apos;re all caught up.
        </p>
      ) : (
        <div className="space-y-2">
          {active.slice(0, 4).map((o, i) => <WorkOrderCard key={o.id} order={o} index={i} />)}
          {active.length > 4 && <p className="text-xs text-muted-foreground pt-1">+{active.length - 4} more</p>}
        </div>
      )}
    </WidgetShell>
  );
}

/** Where open work is piling up, and how stale the oldest is. */
export function WorkOrderBacklogWidget() {
  const { workOrders } = useWorkOrders();

  const rows = useMemo(() => {
    const open = workOrders.filter((w) => w.status !== "completed" && w.status !== "cancelled");
    const by = new Map<string, { count: number; oldest: number }>();
    for (const w of open) {
      const b = by.get(w.category) ?? { count: 0, oldest: 0 };
      b.count++;
      const age = Date.now() - new Date(w.created_at).getTime();
      if (age > b.oldest) b.oldest = age;
      by.set(w.category, b);
    }
    return [...by.entries()]
      .map(([category, b]) => ({ category, ...b, days: Math.floor(b.oldest / 86_400_000) }))
      .sort((a, b) => b.count - a.count);
  }, [workOrders]);

  return (
    <WidgetShell eyebrow="Engineering" title="Backlog by category" href="/reports" linkLabel="Reports">
      {rows.length === 0 ? (
        <p className="text-sm text-emerald-400 text-center py-6 flex items-center justify-center gap-2">
          <CircleCheck className="h-4 w-4" /> No open work orders.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.slice(0, 6).map((r) => (
            <div key={r.category} className="flex items-center gap-3 text-sm">
              <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-foreground capitalize flex-1 truncate">{r.category.replace(/_/g, " ")}</span>
              <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                oldest {r.days}d
              </span>
              <span className="text-sm font-semibold text-foreground tabular-nums w-6 text-right shrink-0">{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}

/** Equipment that is degraded, failed, or past due for service. */
export function AssetHealthWidget() {
  const { assets } = useAssets();

  const { failed, degraded, dueSoon, overdue } = useMemo(() => {
    const now = Date.now();
    const soon = now + 14 * 86_400_000;
    return {
      failed: assets.filter((a) => a.status === "failed"),
      degraded: assets.filter((a) => a.status === "degraded" || a.status === "maintenance"),
      overdue: assets.filter((a) => a.next_maintenance_at && new Date(a.next_maintenance_at).getTime() < now),
      dueSoon: assets.filter((a) => {
        if (!a.next_maintenance_at) return false;
        const t = new Date(a.next_maintenance_at).getTime();
        return t >= now && t <= soon;
      }),
    };
  }, [assets]);

  const attention = [...failed, ...overdue].slice(0, 5);

  return (
    <WidgetShell eyebrow="Engineering" title="Asset health" href="/assets" linkLabel="Registry">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Tile label="Failed" value={failed.length} tone={failed.length ? "text-red-400" : "text-muted-foreground"} />
        <Tile label="Degraded" value={degraded.length} tone={degraded.length ? "text-amber-400" : "text-muted-foreground"} />
        <Tile label="Service overdue" value={overdue.length} tone={overdue.length ? "text-amber-400" : "text-muted-foreground"} />
        <Tile label="Due in 14 days" value={dueSoon.length} />
      </div>
      {attention.length === 0
        ? <p className="text-sm text-emerald-400 flex items-center gap-2"><CircleCheck className="h-4 w-4" /> Nothing needs attention.</p>
        : (
          <div className="space-y-1.5">
            {attention.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <Package className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-foreground truncate flex-1">{a.name}</span>
                <span className="text-[11px] text-muted-foreground shrink-0 capitalize">{a.status}</span>
              </div>
            ))}
          </div>
        )}
    </WidgetShell>
  );
}

// ─── Housekeeping ────────────────────────────────────────────────────────────
export function RoomTurnoverWidget() {
  const { rooms } = useHousekeeping();
  const by = (s: string) => rooms.filter((r) => (r.housekeeping_status ?? "ready") === s);
  const dirty = by("dirty");

  return (
    <WidgetShell eyebrow="Housekeeping" title="Room turnover" href="/housekeeping" linkLabel="Board">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Tile label="To clean" value={dirty.length} tone={dirty.length ? "text-red-400" : "text-muted-foreground"} />
        <Tile label="In progress" value={by("in_progress").length} tone="text-blue-400" />
        <Tile label="Awaiting inspection" value={by("cleaned").length} tone="text-cyan-400" />
        <Tile label="Ready" value={by("ready").length} tone="text-emerald-400" />
      </div>
      {dirty.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {dirty.slice(0, 14).map((r) => (
            <span key={r.id} className="text-[11px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1">
              {r.name}
            </span>
          ))}
          {dirty.length > 14 && <span className="text-[11px] text-muted-foreground px-1 py-1">+{dirty.length - 14}</span>}
        </div>
      )}
    </WidgetShell>
  );
}

/** A housekeeper's own board. */
export function MyRoomsWidget() {
  const { rooms } = useHousekeeping();
  const me = useCurrentProfile();
  const mine = useMemo(() => rooms.filter((r) => r.housekeeper_id === me?.id), [rooms, me?.id]);
  const done = mine.filter((r) => ["cleaned", "ready"].includes(r.housekeeping_status ?? "ready")).length;
  const pct = mine.length === 0 ? 0 : Math.round((done / mine.length) * 100);

  return (
    <WidgetShell eyebrow="Housekeeping" title="My rooms" href="/housekeeping" linkLabel="Board">
      {mine.length === 0 ? (
        <Quiet>No rooms assigned to you today.</Quiet>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-bold text-foreground tabular-nums">{done}<span className="text-base text-muted-foreground font-normal"> of {mine.length} done</span></span>
            <span className={cn("text-sm font-semibold tabular-nums", pct === 100 ? "text-emerald-400" : "text-muted-foreground")}>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-foreground/[0.06] overflow-hidden mb-3">
            <div className={cn("h-full rounded-full", pct === 100 ? "bg-emerald-400" : "bg-indigo-400")} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {mine.map((r) => {
              const isDone = ["cleaned", "ready"].includes(r.housekeeping_status ?? "ready");
              return (
                <span key={r.id} className={cn(
                  "text-[11px] rounded-md border px-2 py-1",
                  isDone
                    ? "text-muted-foreground border-border line-through decoration-1"
                    : "text-foreground border-border bg-foreground/[0.03]"
                )}>{r.name}</span>
              );
            })}
          </div>
        </>
      )}
    </WidgetShell>
  );
}

// ─── Front Desk ──────────────────────────────────────────────────────────────
export function RoomsReadyWidget() {
  const { rooms } = useHousekeeping();
  const ready = rooms.filter((r) => (r.housekeeping_status ?? "ready") === "ready");
  const turning = rooms.filter((r) => ["dirty", "in_progress", "cleaned"].includes(r.housekeeping_status ?? "ready"));
  const arriving = rooms.filter((r) => r.occupancy === "arriving");

  return (
    <WidgetShell eyebrow="Front Desk" title="Rooms ready" href="/housekeeping" linkLabel="Board">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 shrink-0">
          <DoorOpen className="h-7 w-7 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-3xl font-bold text-foreground tabular-nums">
            {ready.length}<span className="text-base text-muted-foreground font-normal"> ready</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {turning.length} still turning over · {arriving.length} arriving today
          </p>
        </div>
      </div>
      {arriving.length > ready.length && (
        <p className="mt-3 text-xs text-amber-400 flex items-center gap-1.5">
          <TriangleAlert className="h-3.5 w-3.5" />
          More arrivals than ready rooms — check the board.
        </p>
      )}
    </WidgetShell>
  );
}

export function GuestRoomIssuesWidget() {
  const { workOrders } = useWorkOrders();
  const { rooms } = useHousekeeping();

  // Issues in rooms with a guest in them, or one on the way, are the ones the
  // desk will hear about. A fault in a vacant room can wait for the queue.
  const issues = useMemo(() => {
    const hot = new Set(
      rooms.filter((r) => r.occupancy === "occupied" || r.occupancy === "arriving").map((r) => r.id)
    );
    return workOrders.filter(
      (w) => w.status !== "completed" && w.status !== "cancelled" && w.space_id && hot.has(w.space_id)
    );
  }, [workOrders, rooms]);

  return (
    <WidgetShell eyebrow="Front Desk" title="Guest room issues" href="/work-orders" linkLabel="All jobs">
      {issues.length === 0 ? (
        <p className="text-sm text-emerald-400 py-4 text-center flex items-center justify-center gap-2">
          <CircleCheck className="h-4 w-4" /> No open issues in occupied rooms.
        </p>
      ) : (
        <div className="space-y-2">
          {issues.slice(0, 4).map((o, i) => <WorkOrderCard key={o.id} order={o} index={i} />)}
          {issues.length > 4 && <p className="text-xs text-muted-foreground pt-1">+{issues.length - 4} more</p>}
        </div>
      )}
    </WidgetShell>
  );
}

// ─── Kitchen ─────────────────────────────────────────────────────────────────
export function TempComplianceWidget() {
  const { logs } = useFnbTempLogs();

  // One row per unit — its most recent reading. An old failure that has since
  // been corrected is history, not an open problem.
  const latest = useMemo(() => {
    const m = new Map<string, typeof logs[number]>();
    for (const l of logs) if (!m.has(l.equipment_label)) m.set(l.equipment_label, l);
    return [...m.values()].sort((a, b) => Number(a.in_range) - Number(b.in_range));
  }, [logs]);

  const failing = latest.filter((l) => !l.in_range).length;

  return (
    <WidgetShell eyebrow="Kitchen" title="Temperature compliance" href="/food-beverage" linkLabel="Log">
      {latest.length === 0 ? (
        <Quiet>No readings logged yet.</Quiet>
      ) : (
        <>
          <p className={cn("text-sm mb-3 flex items-center gap-2", failing ? "text-red-400" : "text-emerald-400")}>
            {failing ? <TriangleAlert className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}
            {failing ? `${failing} unit${failing === 1 ? "" : "s"} out of range` : "All units in range"}
          </p>
          <div className="space-y-1.5">
            {latest.slice(0, 6).map((l) => (
              <div key={l.id} className="flex items-center gap-2 text-sm">
                <Thermometer className={cn("h-3.5 w-3.5 shrink-0", l.in_range ? "text-muted-foreground" : "text-red-400")} />
                <span className="text-foreground truncate flex-1">{l.equipment_label}</span>
                <span className={cn("text-xs tabular-nums shrink-0", l.in_range ? "text-muted-foreground" : "text-red-400 font-semibold")}>
                  {l.temp_f}°F
                </span>
                <span className="text-[10px] text-muted-foreground/70 tabular-nums shrink-0 hidden sm:inline w-14 text-right">
                  {formatDistanceToNow(new Date(l.created_at))} ago
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </WidgetShell>
  );
}

/** How many people the kitchen is cooking for: guests in house plus event covers. */
export function KitchenPrepWidget() {
  const { rooms } = useHousekeeping();
  const { events } = useBanquetEvents();

  const occupied = rooms.filter((r) => r.occupancy === "occupied" || r.occupancy === "arriving").length;
  const todaysEvents = useMemo(() => {
    const today = toStayDate(new Date());
    return events.filter(
      (e) => e.status !== "cancelled" && e.starts_at.slice(0, 10) === today
    );
  }, [events]);
  const eventCovers = todaysEvents.reduce((n, e) => n + e.headcount, 0);

  return (
    <WidgetShell eyebrow="Kitchen" title="Covers to prepare" href="/events" linkLabel="Events">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Tile label="Rooms in house" value={occupied} />
        <Tile label="Event covers" value={eventCovers} tone={eventCovers ? "text-violet-400" : "text-muted-foreground"} />
        <Tile label="Events today" value={todaysEvents.length} />
      </div>
      {todaysEvents.length === 0 ? (
        <p className="text-xs text-muted-foreground">No events on today — room dining only.</p>
      ) : (
        <div className="space-y-1.5">
          {todaysEvents.map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-sm">
              <ChefHat className="h-3.5 w-3.5 text-violet-400 shrink-0" />
              <span className="text-foreground truncate flex-1">{e.name}</span>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {format(new Date(e.starts_at), "h:mm a")} · {e.headcount}
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}

// ─── Food & Beverage ─────────────────────────────────────────────────────────
export function OutletStatusWidget() {
  const { outlets } = useFnbOutlets();
  const { items } = useFnbInventory();

  const lowByOutlet = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) if (i.on_hand <= i.par_level && i.outlet_id) m.set(i.outlet_id, (m.get(i.outlet_id) ?? 0) + 1);
    return m;
  }, [items]);

  return (
    <WidgetShell eyebrow="Food &amp; Beverage" title="Outlet status" href="/food-beverage" linkLabel="Outlets">
      {outlets.length === 0 ? (
        <Quiet>No outlets set up yet.</Quiet>
      ) : (
        <div className="space-y-2">
          {outlets.map((o) => {
            const low = lowByOutlet.get(o.id) ?? 0;
            return (
              <div key={o.id} className="flex items-center gap-2 text-sm">
                <Store className={cn("h-3.5 w-3.5 shrink-0", o.is_open ? "text-emerald-400" : "text-muted-foreground")} />
                <span className="text-foreground truncate flex-1">{o.name}</span>
                {low > 0 && (
                  <span className="text-[10px] text-amber-400 shrink-0">{low} to reorder</span>
                )}
                <span className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5 border shrink-0",
                  o.is_open
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                    : "text-muted-foreground bg-foreground/[0.04] border-border"
                )}>{o.is_open ? "Open" : "Closed"}</span>
              </div>
            );
          })}
        </div>
      )}
    </WidgetShell>
  );
}

// ─── Conferences & Events ────────────────────────────────────────────────────
export function EventsTodayWidget() {
  const { events } = useBanquetEvents();

  const todays = useMemo(() => {
    const today = toStayDate(new Date());
    return events
      .filter((e) => e.status !== "cancelled" && e.starts_at.slice(0, 10) === today)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [events]);

  return (
    <WidgetShell eyebrow="Conferences &amp; Events" title="On today" href="/events" linkLabel="Calendar">
      {todays.length === 0 ? (
        <Quiet>Nothing in the function space today.</Quiet>
      ) : (
        <div className="space-y-2.5">
          {todays.map((e) => (
            <div key={e.id} className="flex items-start gap-2">
              <CalendarClock className="h-3.5 w-3.5 text-violet-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{e.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {format(new Date(e.starts_at), "h:mm a")}–{format(new Date(e.ends_at), "h:mm a")}
                  {e.setup_starts_at ? ` · setup ${format(new Date(e.setup_starts_at), "h:mm a")}` : ""}
                  {e.space?.name ? ` · ${e.space.name}` : ""}
                </p>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">{e.headcount}</span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}

export function EventPipelineWidget() {
  const { events } = useBanquetEvents();

  const { committed, tentative, depositsDue, byStatus } = useMemo(() => {
    const live = events.filter((e) => e.status !== "cancelled");
    const committed = live
      .filter((e) => ["confirmed", "in_progress", "completed"].includes(e.status))
      .reduce((n, e) => n + (e.quoted_cents ?? 0), 0);
    const tentative = live
      .filter((e) => ["inquiry", "tentative"].includes(e.status))
      .reduce((n, e) => n + (e.quoted_cents ?? 0), 0);
    const depositsDue = live.filter(
      (e) => ["confirmed", "in_progress"].includes(e.status) && !e.deposit_paid
    ).length;

    const byStatus = new Map<string, number>();
    for (const e of live) byStatus.set(e.status, (byStatus.get(e.status) ?? 0) + 1);
    return { committed, tentative, depositsDue, byStatus };
  }, [events]);

  return (
    <WidgetShell eyebrow="Conferences &amp; Events" title="Event pipeline" href="/events" linkLabel="Calendar">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Tile label="Committed" value={formatCents(committed)} tone="text-emerald-400" />
        <Tile label="In discussion" value={formatCents(tentative)} tone="text-amber-400" />
        <Tile label="Deposits due" value={depositsDue} tone={depositsDue ? "text-amber-400" : "text-muted-foreground"} />
      </div>
      {byStatus.size === 0 ? (
        <p className="text-xs text-muted-foreground">No events booked yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {[...byStatus.entries()].map(([status, n]) => (
            <span key={status} className="text-[11px] text-muted-foreground bg-foreground/[0.04] border border-border rounded px-2 py-1 capitalize">
              {status.replace(/_/g, " ")}: <span className="text-foreground font-medium tabular-nums">{n}</span>
            </span>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}

// ─── Management ──────────────────────────────────────────────────────────────
export function TeamAvailabilityWidget() {
  const { profiles } = useProfiles();

  const groups = useMemo(() => {
    const m = new Map<string, { total: number; available: number }>();
    for (const p of profiles) {
      const key = isMaintenanceRole(p.role) ? "maintenance" : p.role;
      const g = m.get(key) ?? { total: 0, available: 0 };
      g.total++;
      if (p.is_available) g.available++;
      m.set(key, g);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [profiles]);

  const onShift = profiles.filter((p) => p.is_available);

  return (
    <WidgetShell eyebrow="Management" title="Team on shift" href="/technicians" linkLabel="Team">
      {profiles.length === 0 ? (
        <Quiet>No team members yet.</Quiet>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold text-foreground tabular-nums">{onShift.length}</span>
            <span className="text-sm text-muted-foreground">of {profiles.length} marked available</span>
          </div>
          <div className="space-y-1.5 mb-3">
            {groups.map(([role, g]) => (
              <div key={role} className="flex items-center gap-2 text-sm">
                <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-foreground capitalize flex-1 truncate">{role.replace(/_/g, " ")}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {g.available}/{g.total}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {onShift.slice(0, 10).map((p) => (
              <Avatar key={p.id} className="h-6 w-6" title={p.full_name}>
                <AvatarImage src={p.avatar_url ?? undefined} />
                <AvatarFallback className="text-[9px]">{getInitials(p.full_name)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </>
      )}
    </WidgetShell>
  );
}

/** Room revenue for the settled night, alongside committed event value. */
export function RevenueSnapshotWidget() {
  const today = toStayDate(new Date());
  const { snapshots } = useOccupancy(addDays(today, -8), today);
  const { events } = useBanquetEvents();

  const last = useMemo(() => lastNight(snapshots), [snapshots]);
  const weekRoomRevenue = useMemo(
    () => snapshots
      .filter((s) => s.is_actual)
      .reduce((n, s) => n + (s.adr_cents ?? 0) * s.rooms_occupied, 0),
    [snapshots]
  );
  const committed = useMemo(
    () => events
      .filter((e) => ["confirmed", "in_progress"].includes(e.status))
      .reduce((n, e) => n + (e.quoted_cents ?? 0), 0),
    [events]
  );

  return (
    <WidgetShell eyebrow="Management" title="Revenue snapshot" href="/reports" linkLabel="Reports">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Tile
          label="Rooms last night"
          value={last ? formatCents((last.adr_cents ?? 0) * last.rooms_occupied) : "—"}
        />
        <Tile label="Rooms, last 7 nights" value={weekRoomRevenue ? formatCents(weekRoomRevenue) : "—"} />
        <Tile label="Events committed" value={formatCents(committed)} tone="text-emerald-400" />
        <Tile label="Occupancy last night" value={last ? formatPct(last.occupancy_pct) : "—"} />
      </div>
      {!last && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <CircleDollarSign className="h-3.5 w-3.5 shrink-0" />
          Room figures arrive once a PMS is connected. Event value is live.
        </p>
      )}
    </WidgetShell>
  );
}
