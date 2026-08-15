"use client";

import Link from "next/link";
import { useMemo } from "react";
import { format } from "date-fns";
import { Sparkles, PackageSearch, PartyPopper, ArrowRight, CircleCheck, TriangleAlert } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useHousekeeping, useHousekeepers, useFnbInventory, useBanquetEvents } from "@/lib/data/hooks";
import { formatCents } from "@/lib/analytics";
import { cn, getInitials } from "@/lib/utils";

// The smaller dashboard panels that draw on the newer operational data. Each is
// self-fetching so the dashboard can compose them in any order the user chooses
// without threading props through a layout it doesn't control.

function WidgetShell({
  title, eyebrow, href, linkLabel, children,
}: {
  title: string; eyebrow: string; href?: string; linkLabel?: string; children: React.ReactNode;
}) {
  return (
    <div className="glass-card p-5 h-full">
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

/** How far along each housekeeper's board is. */
export function HousekeepingProgressWidget() {
  const { rooms } = useHousekeeping();
  const { housekeepers } = useHousekeepers();

  const boards = useMemo(() => {
    const by = new Map<string, { assigned: number; done: number }>();
    for (const r of rooms) {
      if (!r.housekeeper_id) continue;
      const b = by.get(r.housekeeper_id) ?? { assigned: 0, done: 0 };
      b.assigned++;
      if (r.housekeeping_status === "cleaned" || r.housekeeping_status === "ready") b.done++;
      by.set(r.housekeeper_id, b);
    }
    return [...by.entries()]
      .map(([id, b]) => ({
        id,
        name: housekeepers.find((p) => p.id === id)?.full_name
          ?? rooms.find((r) => r.housekeeper_id === id)?.housekeeper?.full_name
          ?? "Unknown",
        avatar: housekeepers.find((p) => p.id === id)?.avatar_url ?? null,
        ...b,
      }))
      .sort((a, b) => b.assigned - a.assigned);
  }, [rooms, housekeepers]);

  const unassigned = rooms.filter((r) => !r.housekeeper_id && (r.housekeeping_status ?? "ready") !== "out_of_service").length;

  return (
    <WidgetShell eyebrow="Housekeeping" title="Board progress" href="/housekeeping" linkLabel="Board">
      {boards.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No rooms assigned yet today.</p>
      ) : (
        <div className="space-y-3">
          {boards.slice(0, 5).map((b) => {
            const pct = b.assigned === 0 ? 0 : Math.round((b.done / b.assigned) * 100);
            return (
              <div key={b.id}>
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarImage src={b.avatar ?? undefined} />
                    <AvatarFallback className="text-[9px]">{getInitials(b.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground truncate flex-1">{b.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">{b.done}/{b.assigned}</span>
                </div>
                <div className="h-1 w-full rounded-full bg-foreground/[0.06] overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", pct === 100 ? "bg-emerald-400" : "bg-indigo-400")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {unassigned > 0 && (
            <p className="text-xs text-amber-400 flex items-center gap-1.5 pt-1">
              <TriangleAlert className="h-3 w-3" /> {unassigned} room{unassigned === 1 ? "" : "s"} unassigned
            </p>
          )}
        </div>
      )}
    </WidgetShell>
  );
}

/** F&B lines at or below par. */
export function FnbLowStockWidget() {
  const { items } = useFnbInventory();
  const low = useMemo(
    () => items.filter((i) => i.on_hand <= i.par_level)
      .sort((a, b) => (a.on_hand - a.par_level) - (b.on_hand - b.par_level)),
    [items]
  );

  return (
    <WidgetShell eyebrow="Food &amp; Beverage" title="Reorder list" href="/food-beverage" linkLabel="Inventory">
      {low.length === 0 ? (
        <p className="text-sm text-emerald-400 py-4 text-center flex items-center justify-center gap-2">
          <CircleCheck className="h-4 w-4" /> Everything above par.
        </p>
      ) : (
        <div className="space-y-2">
          {low.slice(0, 6).map((i) => (
            <div key={i.id} className="flex items-center gap-2 text-sm">
              <PackageSearch className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="text-foreground truncate flex-1">{i.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {i.on_hand}/{i.par_level} {i.unit}
              </span>
            </div>
          ))}
          {low.length > 6 && (
            <p className="text-xs text-muted-foreground pt-1">+{low.length - 6} more</p>
          )}
        </div>
      )}
    </WidgetShell>
  );
}

/** The next few banquet bookings. */
export function UpcomingEventsWidget() {
  const { events } = useBanquetEvents();
  const now = Date.now();

  const upcoming = useMemo(
    () => events
      .filter((e) => e.status !== "cancelled" && e.status !== "completed" && new Date(e.ends_at).getTime() >= now)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .slice(0, 5),
    // `now` is a render-time constant; re-filtering on every tick isn't wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events]
  );

  return (
    <WidgetShell eyebrow="Conferences & Events" title="Upcoming events" href="/events" linkLabel="Calendar">
      {upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nothing booked yet.</p>
      ) : (
        <div className="space-y-2.5">
          {upcoming.map((e) => (
            <div key={e.id} className="flex items-start gap-2">
              <PartyPopper className="h-3.5 w-3.5 text-violet-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{e.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {format(new Date(e.starts_at), "EEE d MMM, h:mm a")} · {e.headcount} guests
                  {e.space?.name ? ` · ${e.space.name}` : ""}
                </p>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {formatCents(e.quoted_cents)}
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}

/** Placeholder used when a catalog entry has no renderer wired up yet. */
export function UnknownWidget({ title }: { title: string }) {
  return (
    <div className="glass-card p-5">
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Sparkles className="h-4 w-4" /> {title} isn&apos;t available yet.
      </p>
    </div>
  );
}
