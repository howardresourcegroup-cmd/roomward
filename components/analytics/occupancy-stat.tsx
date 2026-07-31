"use client";

import { motion } from "framer-motion";
import { Moon, Sunrise, TrendingUp, TrendingDown, Minus, LogIn, LogOut, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPct, formatCents, formatDeltaPts } from "@/lib/analytics";
import type { OccupancyMetrics } from "@/types";

// A single night's headline number. Per the form heuristic this is a stat tile,
// not a chart — one figure with its supporting detail, so it stays readable at a
// glance from across a back office.

interface Props {
  kind: "last_night" | "tomorrow";
  metrics: OccupancyMetrics | null;
  /** Percentage-point change vs. the comparable night. Null hides the chip. */
  delta?: number | null;
  deltaLabel?: string;
  loading?: boolean;
}

const COPY = {
  last_night: {
    icon: Moon,
    eyebrow: "Last night",
    empty: "No settled figures for last night yet.",
  },
  tomorrow: {
    icon: Sunrise,
    eyebrow: "Tomorrow — anticipated",
    empty: "No forecast for tomorrow yet.",
  },
} as const;

export function OccupancyStat({ kind, metrics, delta = null, deltaLabel, loading }: Props) {
  const { icon: Icon, eyebrow, empty } = COPY[kind];

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="h-3 w-24 rounded bg-foreground/[0.06] animate-pulse" />
        <div className="h-9 w-28 rounded bg-foreground/[0.06] animate-pulse mt-3" />
        <div className="h-3 w-40 rounded bg-foreground/[0.06] animate-pulse mt-3" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span className="text-xs font-medium uppercase tracking-wider">{eyebrow}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-3 flex items-center gap-1.5">
          <CircleHelp className="h-3.5 w-3.5 shrink-0" />
          {empty}
        </p>
      </div>
    );
  }

  const DeltaIcon = delta == null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaTone =
    delta == null || Math.abs(delta) < 0.05
      ? "text-muted-foreground"
      : delta > 0 ? "text-emerald-400" : "text-amber-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span className="text-xs font-medium uppercase tracking-wider">{eyebrow}</span>
        </div>
        {/* Forecast is labelled, never implied by styling alone. */}
        {!metrics.is_actual && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 rounded px-1.5 py-0.5">
            Forecast
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mt-2.5">
        <span className="text-3xl font-bold text-foreground tabular-nums">
          {formatPct(metrics.occupancy_pct)}
        </span>
        {delta != null && (
          <span className={cn("flex items-center gap-1 text-xs font-medium", deltaTone)}>
            <DeltaIcon className="h-3.5 w-3.5" />
            {formatDeltaPts(delta)}
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-1 tabular-nums">
        {metrics.rooms_occupied} of {metrics.rooms_sellable} sellable
        {metrics.rooms_total !== metrics.rooms_sellable && (
          <span className="text-muted-foreground/70">
            {" "}· {metrics.rooms_total - metrics.rooms_sellable} out of service
          </span>
        )}
        {deltaLabel && delta != null && <span className="text-muted-foreground/70"> · vs {deltaLabel}</span>}
      </p>

      <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border">
        <Metric label="Arrivals" value={String(metrics.arrivals)} icon={LogIn} />
        <Metric label="Departures" value={String(metrics.departures)} icon={LogOut} />
        <Metric label="ADR" value={formatCents(metrics.adr_cents)} />
        <Metric label="RevPAR" value={formatCents(metrics.revpar_cents)} />
      </div>
    </motion.div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}{label}
      </p>
      <p className="text-sm font-semibold text-foreground tabular-nums mt-0.5">{value}</p>
    </div>
  );
}
