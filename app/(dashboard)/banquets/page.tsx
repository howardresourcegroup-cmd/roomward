"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format, isSameDay } from "date-fns";
import {
  PartyPopper, CalendarDays, Users, MapPin, Projector, Utensils,
  CircleDollarSign, Clock, ListChecks, TriangleAlert, Plus, Pencil,
} from "lucide-react";
import { PageLoader } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useBanquetEvents, usePermissions, useBuildingDetail, useBuildings } from "@/lib/data/hooks";
import { EventForm } from "@/components/banquets/event-form";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { BanquetEvent, EventStatus, SetupStyle } from "@/types";

type Tab = "upcoming" | "today" | "all";

const STATUS_STYLE: Record<EventStatus, { label: string; cls: string }> = {
  inquiry:     { label: "Inquiry",     cls: "text-zinc-300 bg-zinc-500/15 border-zinc-500/30" },
  tentative:   { label: "Tentative",   cls: "text-amber-300 bg-amber-500/15 border-amber-500/30" },
  confirmed:   { label: "Confirmed",   cls: "text-indigo-300 bg-indigo-500/15 border-indigo-500/30" },
  in_progress: { label: "In progress", cls: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30" },
  completed:   { label: "Completed",   cls: "text-muted-foreground bg-foreground/[0.04] border-border" },
  cancelled:   { label: "Cancelled",   cls: "text-red-300 bg-red-500/15 border-red-500/30" },
};

const SETUP_LABEL: Record<SetupStyle, string> = {
  theater: "Theater",
  classroom: "Classroom",
  banquet_rounds: "Banquet rounds",
  u_shape: "U-shape",
  boardroom: "Boardroom",
  reception: "Reception",
  hollow_square: "Hollow square",
};

/** Events that still represent work to do, in the order they'll happen. */
function isForward(e: BanquetEvent, now: Date): boolean {
  return e.status !== "cancelled" && e.status !== "completed" && new Date(e.ends_at) >= now;
}

export default function BanquetsPage() {
  const { events, loading, error, reload, create, update } = useBanquetEvents();
  const { can } = usePermissions();
  const canManage = can("banquets.manage");
  const [tab, setTab] = useState<Tab>("upcoming");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BanquetEvent | null>(null);

  // Event spaces to book. Conference rooms and ballrooms are the realistic
  // candidates; offering every guest room would bury them.
  const { buildings } = useBuildings();
  const { spaces } = useBuildingDetail(buildings[0]?.id ?? "");
  const bookableSpaces = useMemo(
    () => spaces.filter((s) => ["conference", "event_space", "dining", "amenity"].includes(s.type)),
    [spaces]
  );

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (e: BanquetEvent) => { setEditing(e); setFormOpen(true); };

  const now = new Date();

  const { upcoming, todays, committedCents, guestsToday } = useMemo(() => {
    const upcoming = events
      .filter((e) => isForward(e, now))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

    const todays = events.filter(
      (e) => e.status !== "cancelled" && isSameDay(new Date(e.starts_at), now)
    );

    const committedCents = events
      .filter((e) => e.status === "confirmed" || e.status === "in_progress")
      .reduce((sum, e) => sum + (e.quoted_cents ?? 0), 0);

    const guestsToday = todays.reduce((sum, e) => sum + e.headcount, 0);

    return { upcoming, todays, committedCents, guestsToday };
    // `now` is intentionally excluded — recomputing on every tick would thrash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const list = tab === "today" ? todays : tab === "all" ? [...events].sort((a, b) => b.starts_at.localeCompare(a.starts_at)) : upcoming;

  const depositsOutstanding = useMemo(
    () => upcoming.filter((e) => (e.status === "confirmed" || e.status === "in_progress") && !e.deposit_paid),
    [upcoming]
  );

  if (loading) return <PageLoader />;
  if (error) return <ErrorState what="the event calendar" onRetry={reload} />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Banquets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conference and event rentals — bookings, room setup, AV and catering.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={openNew}>
            <Plus className="h-3.5 w-3.5" /> Book event
          </Button>
        )}
      </div>

      {/* Headline figures */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Today" value={String(todays.length)} sub={`${guestsToday} guests`} icon={CalendarDays} tone="text-indigo-400" />
        <Stat label="Upcoming" value={String(upcoming.length)} sub="not yet held" icon={PartyPopper} tone="text-violet-400" />
        <Stat label="Committed" value={formatCents(committedCents)} sub="confirmed value" icon={CircleDollarSign} tone="text-emerald-400" />
        <Stat
          label="Deposits due" value={String(depositsOutstanding.length)}
          sub={depositsOutstanding.length === 0 ? "all collected" : "confirmed, unpaid"}
          icon={depositsOutstanding.length > 0 ? TriangleAlert : ListChecks}
          tone={depositsOutstanding.length > 0 ? "text-amber-400" : "text-muted-foreground"}
        />
      </div>

      {/* Tabs */}
      <div className="flex w-fit max-w-full overflow-x-auto rounded-lg border border-border p-0.5 gap-0.5">
        {([
          { key: "upcoming" as Tab, label: `Upcoming (${upcoming.length})` },
          { key: "today" as Tab,    label: `Today (${todays.length})` },
          { key: "all" as Tab,      label: `All (${events.length})` },
        ]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap text-sm px-4 py-2 rounded-md transition-colors",
              tab === key ? "bg-foreground/[0.08] text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            )}>
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={PartyPopper}
          title={tab === "today" ? "Nothing on today" : "No events booked"}
          description={
            tab === "today"
              ? "No events are scheduled in the function space today."
              : "Conference and banquet bookings will appear here with their setup, AV and catering requirements."
          }
          action={canManage && tab !== "today" ? { label: "Book your first event", onClick: openNew } : undefined}
          hint={canManage ? undefined : "Ask a manager to add a booking."}
        />
      ) : (
        <div className="space-y-3">
          {list.map((e, i) => (
            <EventCard key={e.id} event={e} index={i} onEdit={canManage ? () => openEdit(e) : undefined} />
          ))}
        </div>
      )}

      <EventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        spaces={bookableSpaces}
        event={editing}
        onSubmit={async (input) => {
          if (editing) await update(editing.id, input);
          else await create(input);
        }}
      />
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon, tone }: {
  label: string; value: string; sub: string; icon: React.ElementType; tone: string;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <Icon className={cn("h-3.5 w-3.5", tone)} />
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function EventCard({ event: e, index, onEdit }: { event: BanquetEvent; index: number; onEdit?: () => void }) {
  const status = STATUS_STYLE[e.status] ?? STATUS_STYLE.inquiry;
  const start = new Date(e.starts_at);
  const end = new Date(e.ends_at);
  const setupAt = e.setup_starts_at ? new Date(e.setup_starts_at) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2) }}
      className="glass-card p-4"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">{e.name}</h3>
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5 border", status.cls)}>
              {status.label}
            </span>
            {!e.deposit_paid && (e.status === "confirmed" || e.status === "in_progress") && (
              <span className="text-[10px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5 border text-amber-300 bg-amber-500/15 border-amber-500/30">
                Deposit due
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{e.client_name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p className="text-sm font-semibold text-foreground tabular-nums">
            {formatCents(e.quoted_cents)}
          </p>
          {onEdit && (
            <button
              onClick={onEdit}
              aria-label={`Edit ${e.name}`}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-border text-xs">
        <Detail icon={CalendarDays} label={format(start, "EEE d MMM")} sub={`${format(start, "h:mm a")} – ${format(end, "h:mm a")}`} />
        <Detail icon={MapPin} label={e.space?.name ?? "Space TBD"} sub={SETUP_LABEL[e.setup_style] ?? e.setup_style} />
        <Detail icon={Users} label={`${e.headcount} guests`} sub={e.deposit_paid ? "Deposit paid" : "Deposit outstanding"} />
        <Detail
          icon={Clock}
          label={setupAt ? `Setup ${format(setupAt, "h:mm a")}` : "Setup TBD"}
          sub={setupAt ? `Room ready by ${format(start, "h:mm a")}` : "Not scheduled"}
        />
      </div>

      {(e.av_needs.length > 0 || e.catering_notes) && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {e.av_needs.length > 0 && (
            <div className="flex items-start gap-2">
              <Projector className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {e.av_needs.map((need) => (
                  <span key={need} className="text-[11px] text-muted-foreground bg-foreground/[0.04] border border-border rounded px-1.5 py-0.5">
                    {need}
                  </span>
                ))}
              </div>
            </div>
          )}
          {e.catering_notes && (
            <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <Utensils className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {e.catering_notes}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

function Detail({ icon: Icon, label, sub }: { icon: React.ElementType; label: string; sub: string }) {
  return (
    <div className="flex items-start gap-1.5 min-w-0">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-foreground truncate">{label}</p>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </div>
    </div>
  );
}
