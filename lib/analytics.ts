import type { OccupancySnapshot, OccupancyMetrics } from "@/types";

// Occupancy math, kept pure and free of Supabase so it can be unit-tested.
//
// Date convention throughout: `stay_date` is the night *begun*. The row dated
// 2026-07-29 describes the night of the 29th into the 30th — which is what a
// hotelier means by "last night" on the morning of the 30th. Everything here
// works on YYYY-MM-DD strings rather than Date objects, because local-midnight
// Date arithmetic silently shifts across DST and would slide a night by one.

/** YYYY-MM-DD for a Date, in local time (not UTC — the property's own calendar). */
export function toStayDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Shift a YYYY-MM-DD by whole days without touching local time / DST.
 *
 * The tempting version — build a local-midnight Date, add delta × 86 400 000 ms,
 * read it back with local getters — is wrong on the night the clocks go back.
 * In America/New_York, "2026-11-01" + 1 day yields 2026-11-01 again, because the
 * 25-hour day leaves the result at 23:00 on the same date. Doing the arithmetic
 * in UTC on a date-only value sidesteps offsets entirely.
 */
export function addDays(stayDate: string, delta: number): string {
  const [y, m, d] = stayDate.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + delta * 86_400_000;
  const dt = new Date(t);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Rooms that could actually be sold: total minus out-of-service. Occupancy is
 * measured against this, not against the full room count — otherwise taking a
 * room offline for maintenance would read as a drop in demand.
 */
export function sellableRooms(s: Pick<OccupancySnapshot, "rooms_total" | "rooms_out_of_service">): number {
  return Math.max(0, s.rooms_total - s.rooms_out_of_service);
}

export function toMetrics(s: OccupancySnapshot): OccupancyMetrics {
  const sellable = sellableRooms(s);
  const occupancy_pct = sellable === 0 ? 0 : (s.rooms_occupied / sellable) * 100;
  // RevPAR is ADR × occupancy — revenue per *available* room, so it deliberately
  // spreads the night's room revenue across every sellable room, sold or not.
  const revpar_cents =
    s.adr_cents == null || sellable === 0
      ? null
      : Math.round((s.adr_cents * s.rooms_occupied) / sellable);

  return {
    stay_date: s.stay_date,
    rooms_total: s.rooms_total,
    rooms_occupied: s.rooms_occupied,
    rooms_sellable: sellable,
    occupancy_pct,
    arrivals: s.arrivals,
    departures: s.departures,
    adr_cents: s.adr_cents,
    revpar_cents,
    is_actual: s.is_actual,
  };
}

function findByDate(snapshots: OccupancySnapshot[], stayDate: string): OccupancySnapshot | null {
  return snapshots.find((s) => s.stay_date === stayDate) ?? null;
}

/** The night that just ended — stay_date = today − 1. */
export function lastNight(snapshots: OccupancySnapshot[], today = new Date()): OccupancyMetrics | null {
  const s = findByDate(snapshots, addDays(toStayDate(today), -1));
  return s ? toMetrics(s) : null;
}

/** Tonight, in progress — stay_date = today. */
export function tonight(snapshots: OccupancySnapshot[], today = new Date()): OccupancyMetrics | null {
  const s = findByDate(snapshots, toStayDate(today));
  return s ? toMetrics(s) : null;
}

/** Anticipated for tomorrow night — stay_date = today + 1. Normally a forecast. */
export function tomorrowNight(snapshots: OccupancySnapshot[], today = new Date()): OccupancyMetrics | null {
  const s = findByDate(snapshots, addDays(toStayDate(today), 1));
  return s ? toMetrics(s) : null;
}

/**
 * Percentage-point change between two occupancy readings. Returns null when
 * there's nothing to compare against, so callers can omit the delta rather than
 * render a misleading 0%.
 */
export function occupancyDelta(current: OccupancyMetrics | null, prior: OccupancyMetrics | null): number | null {
  if (!current || !prior) return null;
  return current.occupancy_pct - prior.occupancy_pct;
}

/** Same night one week earlier — the right comparison for a weekday-shaped business. */
export function sameNightLastWeek(
  snapshots: OccupancySnapshot[],
  stayDate: string
): OccupancyMetrics | null {
  const s = findByDate(snapshots, addDays(stayDate, -7));
  return s ? toMetrics(s) : null;
}

export interface OccupancyRangeSummary {
  nights: number;
  avg_occupancy_pct: number;
  total_room_nights: number;
  avg_adr_cents: number | null;
  avg_revpar_cents: number | null;
  peak: OccupancyMetrics | null;
  trough: OccupancyMetrics | null;
}

/**
 * Aggregate a set of nights. ADR is weighted by rooms sold — an unweighted mean
 * would let a near-empty night at a high rate distort the average rate paid.
 */
export function summarizeRange(snapshots: OccupancySnapshot[]): OccupancyRangeSummary {
  const metrics = snapshots.map(toMetrics);
  if (metrics.length === 0) {
    return {
      nights: 0, avg_occupancy_pct: 0, total_room_nights: 0,
      avg_adr_cents: null, avg_revpar_cents: null, peak: null, trough: null,
    };
  }

  const totalRoomNights = metrics.reduce((a, m) => a + m.rooms_occupied, 0);
  const avgOcc = metrics.reduce((a, m) => a + m.occupancy_pct, 0) / metrics.length;

  let revenueCents = 0;
  let roomsWithRate = 0;
  for (const m of metrics) {
    if (m.adr_cents != null) {
      revenueCents += m.adr_cents * m.rooms_occupied;
      roomsWithRate += m.rooms_occupied;
    }
  }
  const avgAdr = roomsWithRate === 0 ? null : Math.round(revenueCents / roomsWithRate);

  const withRevpar = metrics.filter((m) => m.revpar_cents != null);
  const avgRevpar = withRevpar.length === 0
    ? null
    : Math.round(withRevpar.reduce((a, m) => a + (m.revpar_cents ?? 0), 0) / withRevpar.length);

  const sorted = [...metrics].sort((a, b) => a.occupancy_pct - b.occupancy_pct);

  return {
    nights: metrics.length,
    avg_occupancy_pct: avgOcc,
    total_room_nights: totalRoomNights,
    avg_adr_cents: avgAdr,
    avg_revpar_cents: avgRevpar,
    peak: sorted[sorted.length - 1] ?? null,
    trough: sorted[0] ?? null,
  };
}

/** Chronological slice between two stay dates, inclusive. */
export function inRange(snapshots: OccupancySnapshot[], from: string, to: string): OccupancySnapshot[] {
  return snapshots
    .filter((s) => s.stay_date >= from && s.stay_date <= to)
    .sort((a, b) => a.stay_date.localeCompare(b.stay_date));
}

// ─── Formatting ──────────────────────────────────────────────────────────────
export function formatPct(pct: number, digits = 0): string {
  return `${pct.toFixed(digits)}%`;
}

export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Signed percentage-point label, e.g. "+4.2 pts". Null renders as an em dash. */
export function formatDeltaPts(delta: number | null): string {
  if (delta == null) return "—";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)} pts`;
}
