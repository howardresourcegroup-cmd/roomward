"use client";

import { useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { toMetrics, formatCents, toStayDate } from "@/lib/analytics";
import type { OccupancySnapshot } from "@/types";

// Validated against the dark chart surface (#0f0f1a) with the palette checker:
// lightness band, chroma, CVD separation, and contrast all pass. The two rate
// series sit at ΔE 6.4 under tritanopia, which is only permissible with a
// secondary encoding — so both are direct-labelled in the legend and the
// tooltip names every value.
const INK_OCCUPANCY = "#6366f1";
const INK_ADR = "#6366f1";
const INK_REVPAR = "#0891b2";

interface Row {
  stay_date: string;
  label: string;
  /** Split into two keys so the forecast can render dashed without a second axis. */
  actual: number | null;
  forecast: number | null;
  adr: number | null;
  revpar: number | null;
  is_actual: boolean;
}

function buildRows(snapshots: OccupancySnapshot[]): Row[] {
  const sorted = [...snapshots].sort((a, b) => a.stay_date.localeCompare(b.stay_date));
  const rows = sorted.map((s) => {
    const m = toMetrics(s);
    return {
      stay_date: s.stay_date,
      label: `${s.stay_date.slice(5, 7)}/${s.stay_date.slice(8, 10)}`,
      actual: m.is_actual ? m.occupancy_pct : null,
      forecast: m.is_actual ? null : m.occupancy_pct,
      adr: m.adr_cents == null ? null : m.adr_cents / 100,
      revpar: m.revpar_cents == null ? null : m.revpar_cents / 100,
      is_actual: m.is_actual,
    };
  });

  // Bridge the seam: without this the dashed forecast line starts one night
  // adrift from where the solid actual line stops, and the series reads as a gap.
  const lastActual = rows.map((r) => r.actual != null).lastIndexOf(true);
  if (lastActual >= 0 && lastActual + 1 < rows.length) {
    rows[lastActual].forecast = rows[lastActual].actual;
  }
  return rows;
}

const ChartTooltip = ({ active, payload, label, unit }: {
  active?: boolean;
  payload?: Array<{ value: number | null; name: string; color: string; dataKey: string }>;
  label?: string;
  unit: "pct" | "money";
}) => {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null);
  if (rows.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-xs">
      <p className="text-muted-foreground font-medium mb-2">{label}</p>
      {rows.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-foreground">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <span className="font-semibold tabular-nums">
            {unit === "pct" ? `${Math.round(p.value as number)}%` : formatCents(Math.round((p.value as number) * 100))}
          </span>
        </div>
      ))}
    </div>
  );
};

function LegendRow({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span
            className="inline-block h-0 w-4 shrink-0"
            style={{
              borderTop: `2px ${i.dashed ? "dashed" : "solid"} ${i.color}`,
            }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Occupancy over time. Rate lives in its own chart below rather than on a second
 * y-axis — two scales on one plot invite comparisons the geometry doesn't support.
 */
export function OccupancyTrend({ snapshots, showRates = true }: { snapshots: OccupancySnapshot[]; showRates?: boolean }) {
  const rows = useMemo(() => buildRows(snapshots), [snapshots]);
  const todayLabel = useMemo(() => {
    const today = toStayDate(new Date());
    return rows.find((r) => r.stay_date === today)?.label;
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="glass-card p-5">
        <p className="text-sm text-muted-foreground text-center py-10">
          No occupancy history for this period yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Occupancy</p>
            <p className="text-base font-semibold text-foreground mt-0.5">Nightly trend</p>
          </div>
          <LegendRow items={[
            { label: "Actual", color: INK_OCCUPANCY },
            { label: "Forecast", color: INK_OCCUPANCY, dashed: true },
          ]} />
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="occFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={INK_OCCUPANCY} stopOpacity={0.28} />
                <stop offset="95%" stopColor={INK_OCCUPANCY} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#8b8b9e", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis
              tick={{ fill: "#8b8b9e", fontSize: 11 }} tickLine={false} axisLine={false}
              domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`}
            />
            <RechartsTooltip content={<ChartTooltip unit="pct" />} />
            {todayLabel && (
              <ReferenceLine
                x={todayLabel} stroke="rgba(255,255,255,0.25)" strokeDasharray="2 3"
                label={{ value: "today", position: "insideTopRight", fill: "#8b8b9e", fontSize: 10 }}
              />
            )}
            <Area
              type="monotone" dataKey="actual" name="Actual"
              stroke={INK_OCCUPANCY} strokeWidth={2} fill="url(#occFill)"
              connectNulls={false} dot={false} activeDot={{ r: 4 }}
            />
            <Area
              type="monotone" dataKey="forecast" name="Forecast"
              stroke={INK_OCCUPANCY} strokeWidth={2} strokeDasharray="5 4" fill="none"
              connectNulls={false} dot={false} activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {showRates && (
        <div className="glass-card p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rate</p>
              <p className="text-base font-semibold text-foreground mt-0.5">ADR &amp; RevPAR</p>
            </div>
            <LegendRow items={[
              { label: "ADR", color: INK_ADR },
              { label: "RevPAR", color: INK_REVPAR, dashed: true },
            ]} />
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#8b8b9e", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis
                tick={{ fill: "#8b8b9e", fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <RechartsTooltip content={<ChartTooltip unit="money" />} />
              <Line type="monotone" dataKey="adr" name="ADR" stroke={INK_ADR} strokeWidth={2} dot={false} connectNulls />
              <Line
                type="monotone" dataKey="revpar" name="RevPAR" stroke={INK_REVPAR}
                strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
