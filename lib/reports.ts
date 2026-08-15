import { toMetrics, formatCents, formatPct } from "@/lib/analytics";
import type {
  OccupancySnapshot, WorkOrder, FnbInventoryItem, BanquetEvent, Space, Profile,
} from "@/types";

// Report definitions and CSV serialisation. Pure functions over already-fetched
// data — no Supabase here, so every report's shape is unit-testable.

export type CellValue = string | number | null;

export interface ReportColumn {
  key: string;
  label: string;
  /** Right-align and use tabular figures. Set for anything counted or measured. */
  numeric?: boolean;
}

export interface ReportTable {
  columns: ReportColumn[];
  rows: Record<string, CellValue>[];
  /** Shown under the title — what the reader is actually looking at. */
  summary?: string;
}

export interface ReportDef {
  id: string;
  name: string;
  description: string;
  /** Which permission gates it, beyond reports.view. */
  group: "Occupancy" | "Maintenance" | "Housekeeping" | "Food & Beverage" | "Conferences & Events";
}

export const REPORT_CATALOG: ReportDef[] = [
  { id: "occupancy_nightly",   name: "Occupancy by night",      description: "Rooms sold, rate and RevPAR for each night in the period.", group: "Occupancy" },
  { id: "occupancy_dow",       name: "Occupancy by weekday",    description: "Average occupancy grouped by day of week — where the soft nights are.", group: "Occupancy" },
  { id: "wo_by_category",      name: "Work orders by category", description: "Volume and completion rate per maintenance category.", group: "Maintenance" },
  { id: "wo_aging",            name: "Open work order aging",   description: "Every unresolved job, oldest first.", group: "Maintenance" },
  { id: "hk_productivity",     name: "Housekeeping boards",     description: "Rooms assigned and completed per housekeeper.", group: "Housekeeping" },
  { id: "fnb_below_par",       name: "Stock below par",         description: "Every F&B line at or under its par level.", group: "Food & Beverage" },
  { id: "banquet_pipeline",    name: "Event pipeline",          description: "Booked and prospective events with quoted value.", group: "Conferences & Events" },
];

// ─── CSV ─────────────────────────────────────────────────────────────────────
/**
 * RFC 4180 quoting. A field is quoted when it contains a comma, quote, or
 * newline, and embedded quotes are doubled. A leading =, +, - or @ is prefixed
 * with a quote character so spreadsheet software treats it as text rather than
 * evaluating it as a formula.
 */
export function escapeCsvField(value: CellValue): string {
  if (value == null) return "";
  let s = String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCSV(table: ReportTable): string {
  const header = table.columns.map((c) => escapeCsvField(c.label)).join(",");
  const body = table.rows.map((r) => table.columns.map((c) => escapeCsvField(r[c.key] ?? null)).join(","));
  return [header, ...body].join("\r\n");
}

/** Safe, dated filename for a report download. */
export function reportFilename(reportName: string, today = new Date()): string {
  const slug = reportName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const d = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return `${slug}-${d}.csv`;
}

// ─── Builders ────────────────────────────────────────────────────────────────
const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function occupancyNightly(snapshots: OccupancySnapshot[]): ReportTable {
  const rows = [...snapshots]
    .sort((a, b) => b.stay_date.localeCompare(a.stay_date))
    .map((s) => {
      const m = toMetrics(s);
      return {
        stay_date: m.stay_date,
        basis: m.is_actual ? "Actual" : "Forecast",
        rooms_sold: m.rooms_occupied,
        sellable: m.rooms_sellable,
        occupancy: formatPct(m.occupancy_pct, 1),
        arrivals: m.arrivals,
        departures: m.departures,
        adr: formatCents(m.adr_cents),
        revpar: formatCents(m.revpar_cents),
      };
    });

  return {
    columns: [
      { key: "stay_date", label: "Night" },
      { key: "basis", label: "Basis" },
      { key: "rooms_sold", label: "Rooms sold", numeric: true },
      { key: "sellable", label: "Sellable", numeric: true },
      { key: "occupancy", label: "Occupancy", numeric: true },
      { key: "arrivals", label: "Arrivals", numeric: true },
      { key: "departures", label: "Departures", numeric: true },
      { key: "adr", label: "ADR", numeric: true },
      { key: "revpar", label: "RevPAR", numeric: true },
    ],
    rows,
    summary: `${rows.length} night${rows.length === 1 ? "" : "s"}`,
  };
}

export function occupancyByWeekday(snapshots: OccupancySnapshot[]): ReportTable {
  const buckets = new Map<number, { pct: number[]; sold: number }>();
  for (const s of snapshots) {
    if (!s.is_actual) continue; // forecast would distort a historical average
    const m = toMetrics(s);
    const dow = new Date(`${s.stay_date}T12:00:00Z`).getUTCDay();
    const b = buckets.get(dow) ?? { pct: [], sold: 0 };
    b.pct.push(m.occupancy_pct);
    b.sold += m.rooms_occupied;
    buckets.set(dow, b);
  }

  const rows = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dow, b]) => ({
      weekday: DOW[dow],
      nights: b.pct.length,
      avg_occupancy: formatPct(b.pct.reduce((x, y) => x + y, 0) / b.pct.length, 1),
      room_nights: b.sold,
    }));

  return {
    columns: [
      { key: "weekday", label: "Weekday" },
      { key: "nights", label: "Nights", numeric: true },
      { key: "avg_occupancy", label: "Avg occupancy", numeric: true },
      { key: "room_nights", label: "Room nights", numeric: true },
    ],
    rows,
    summary: "Settled nights only — forecast excluded",
  };
}

export function workOrdersByCategory(orders: WorkOrder[]): ReportTable {
  const buckets = new Map<string, { total: number; done: number; critical: number }>();
  for (const o of orders) {
    const b = buckets.get(o.category) ?? { total: 0, done: 0, critical: 0 };
    b.total++;
    if (o.status === "completed") b.done++;
    if (o.priority === "critical") b.critical++;
    buckets.set(o.category, b);
  }

  const rows = [...buckets.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([category, b]) => ({
      category,
      total: b.total,
      completed: b.done,
      open: b.total - b.done,
      critical: b.critical,
      completion: formatPct(b.total === 0 ? 0 : (b.done / b.total) * 100),
    }));

  return {
    columns: [
      { key: "category", label: "Category" },
      { key: "total", label: "Total", numeric: true },
      { key: "completed", label: "Completed", numeric: true },
      { key: "open", label: "Open", numeric: true },
      { key: "critical", label: "Critical", numeric: true },
      { key: "completion", label: "Completion", numeric: true },
    ],
    rows,
    summary: `${orders.length} work order${orders.length === 1 ? "" : "s"}`,
  };
}

export function workOrderAging(orders: WorkOrder[], now = new Date()): ReportTable {
  const rows = orders
    .filter((o) => o.status !== "completed" && o.status !== "cancelled")
    // Oldest first: age descending is the same as created_at ascending.
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((o) => ({
      title: o.title,
      room: o.space?.name ?? "—",
      priority: o.priority,
      status: o.status,
      assignee: o.assignee?.full_name ?? "Unassigned",
      age_days: Math.max(0, Math.floor((now.getTime() - new Date(o.created_at).getTime()) / 86_400_000)),
    }));

  return {
    columns: [
      { key: "title", label: "Work order" },
      { key: "room", label: "Location" },
      { key: "priority", label: "Priority" },
      { key: "status", label: "Status" },
      { key: "assignee", label: "Assigned to" },
      { key: "age_days", label: "Age (days)", numeric: true },
    ],
    rows,
    summary: `${rows.length} still open`,
  };
}

export function housekeepingProductivity(rooms: Space[], staff: Profile[]): ReportTable {
  const byPerson = new Map<string, { assigned: number; done: number }>();
  for (const r of rooms) {
    if (!r.housekeeper_id) continue;
    const b = byPerson.get(r.housekeeper_id) ?? { assigned: 0, done: 0 };
    b.assigned++;
    if (r.housekeeping_status === "cleaned" || r.housekeeping_status === "ready") b.done++;
    byPerson.set(r.housekeeper_id, b);
  }

  const nameOf = (id: string) =>
    staff.find((p) => p.id === id)?.full_name
    ?? rooms.find((r) => r.housekeeper_id === id)?.housekeeper?.full_name
    ?? "Unknown";

  const rows = [...byPerson.entries()]
    .sort((a, b) => b[1].assigned - a[1].assigned)
    .map(([id, b]) => ({
      housekeeper: nameOf(id),
      assigned: b.assigned,
      completed: b.done,
      remaining: b.assigned - b.done,
      progress: formatPct(b.assigned === 0 ? 0 : (b.done / b.assigned) * 100),
    }));

  const unassigned = rooms.filter((r) => !r.housekeeper_id).length;
  return {
    columns: [
      { key: "housekeeper", label: "Housekeeper" },
      { key: "assigned", label: "Assigned", numeric: true },
      { key: "completed", label: "Completed", numeric: true },
      { key: "remaining", label: "Remaining", numeric: true },
      { key: "progress", label: "Progress", numeric: true },
    ],
    rows,
    summary: unassigned > 0 ? `${unassigned} room${unassigned === 1 ? "" : "s"} unassigned` : "Every room assigned",
  };
}

export function stockBelowPar(items: FnbInventoryItem[]): ReportTable {
  const rows = items
    .filter((i) => i.on_hand <= i.par_level)
    .sort((a, b) => (a.on_hand - a.par_level) - (b.on_hand - b.par_level))
    .map((i) => ({
      item: i.name,
      outlet: i.outlet?.name ?? "—",
      category: i.category ?? "—",
      on_hand: `${i.on_hand} ${i.unit}`,
      par_level: `${i.par_level} ${i.unit}`,
      shortfall: Number((i.par_level - i.on_hand).toFixed(2)),
      supplier: i.supplier ?? "—",
    }));

  return {
    columns: [
      { key: "item", label: "Item" },
      { key: "outlet", label: "Outlet" },
      { key: "category", label: "Category" },
      { key: "on_hand", label: "On hand", numeric: true },
      { key: "par_level", label: "Par", numeric: true },
      { key: "shortfall", label: "Shortfall", numeric: true },
      { key: "supplier", label: "Supplier" },
    ],
    rows,
    summary: `${rows.length} line${rows.length === 1 ? "" : "s"} to reorder`,
  };
}

export function banquetPipeline(events: BanquetEvent[]): ReportTable {
  const live = events.filter((e) => e.status !== "cancelled");
  const rows = [...live]
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((e) => ({
      event: e.name,
      client: e.client_name,
      space: e.space?.name ?? "—",
      date: e.starts_at.slice(0, 10),
      status: e.status,
      headcount: e.headcount,
      setup: e.setup_style.replace(/_/g, " "),
      quoted: formatCents(e.quoted_cents),
      deposit: e.deposit_paid ? "Paid" : "Outstanding",
    }));

  const committed = live
    .filter((e) => e.status === "confirmed" || e.status === "in_progress" || e.status === "completed")
    .reduce((sum, e) => sum + (e.quoted_cents ?? 0), 0);

  return {
    columns: [
      { key: "event", label: "Event" },
      { key: "client", label: "Client" },
      { key: "space", label: "Space" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status" },
      { key: "headcount", label: "Guests", numeric: true },
      { key: "setup", label: "Setup" },
      { key: "quoted", label: "Quoted", numeric: true },
      { key: "deposit", label: "Deposit" },
    ],
    rows,
    summary: `${formatCents(committed)} committed across ${rows.length} event${rows.length === 1 ? "" : "s"}`,
  };
}
