"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingDown, Clock, CheckCircle2, AlertTriangle, BarChart3, Moon, Table2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  useWorkOrders, useOrganization, useOccupancy, usePermissions,
  useHousekeeping, useHousekeepers, useFnbInventory, useBanquetEvents,
} from "@/lib/data/hooks";
import { OccupancyStat } from "@/components/analytics/occupancy-stat";
import { OccupancyTrend } from "@/components/analytics/occupancy-trend";
import { ReportViewer } from "@/components/reports/report-viewer";
import {
  REPORT_CATALOG, occupancyNightly, occupancyByWeekday, workOrdersByCategory,
  workOrderAging, housekeepingProductivity, stockBelowPar, banquetPipeline,
  type ReportTable,
} from "@/lib/reports";
import {
  addDays, toStayDate, lastNight, tomorrowNight, sameNightLastWeek, occupancyDelta,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { WorkOrder } from "@/types";

const CAT_COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444", "#52525b"];

// Build last-6-months opened/closed/critical from real work orders
function buildMonthly(orders: WorkOrder[]) {
  const months: { key: string; month: string; opened: number; closed: number; critical: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleString("en-US", { month: "short" }), opened: 0, closed: 0, critical: 0 });
  }
  const idx = (date: string) => {
    const d = new Date(date);
    return months.findIndex((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
  };
  for (const o of orders) {
    const oi = idx(o.created_at);
    if (oi >= 0) { months[oi].opened++; if (o.priority === "critical") months[oi].critical++; }
    if (o.completed_at) { const ci = idx(o.completed_at); if (ci >= 0) months[ci].closed++; }
  }
  return months;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{value: number; name: string; color: string}>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-xs">
      <p className="text-muted-foreground font-medium mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

type Tab = "overview" | "occupancy" | "data";

const RANGES = [
  { days: 7,  label: "7 nights" },
  { days: 30, label: "30 nights" },
  { days: 90, label: "90 nights" },
] as const;

export default function ReportsPage() {
  const { workOrders } = useWorkOrders();
  const { org } = useOrganization();
  const { can } = usePermissions();
  const canExport = can("reports.export");

  const [tab, setTab] = useState<Tab>("overview");
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [reportId, setReportId] = useState<string>("occupancy_nightly");

  // Widen the window past the range so week-over-week comparisons and the
  // forward forecast are both available without a second fetch.
  const today = toStayDate(new Date());
  const from = addDays(today, -(rangeDays + 7));
  const to = addDays(today, 14);
  const { snapshots, loading: occLoading } = useOccupancy(from, to);

  const { rooms } = useHousekeeping();
  const { housekeepers } = useHousekeepers();
  const { items: fnbItems } = useFnbInventory();
  const { events } = useBanquetEvents();

  // Bounded at both ends: "30 nights" means the last 30 nights, not 30 back plus
  // whatever forecast the fetch window happened to include. The trend chart below
  // still shows the forward view — that's a chart about where things are heading,
  // where this is a table of what happened.
  const inRangeSnaps = useMemo(
    () => snapshots.filter((s) => s.stay_date >= addDays(today, -rangeDays) && s.stay_date <= today),
    [snapshots, today, rangeDays]
  );

  const last = useMemo(() => lastNight(snapshots), [snapshots]);
  const tomorrow = useMemo(() => tomorrowNight(snapshots), [snapshots]);
  const lastDelta = useMemo(
    () => (last ? occupancyDelta(last, sameNightLastWeek(snapshots, last.stay_date)) : null),
    [last, snapshots]
  );
  const tomorrowDelta = useMemo(
    () => (tomorrow ? occupancyDelta(tomorrow, sameNightLastWeek(snapshots, tomorrow.stay_date)) : null),
    [tomorrow, snapshots]
  );

  const activeReport = REPORT_CATALOG.find((r) => r.id === reportId) ?? REPORT_CATALOG[0];
  const reportTable: ReportTable = useMemo(() => {
    switch (activeReport.id) {
      case "occupancy_nightly":  return occupancyNightly(inRangeSnaps);
      case "occupancy_dow":      return occupancyByWeekday(inRangeSnaps);
      case "wo_by_category":     return workOrdersByCategory(workOrders);
      case "wo_aging":           return workOrderAging(workOrders);
      case "hk_productivity":    return housekeepingProductivity(rooms, housekeepers);
      case "fnb_below_par":      return stockBelowPar(fnbItems);
      case "banquet_pipeline":   return banquetPipeline(events);
      default:                   return { columns: [], rows: [] };
    }
  }, [activeReport.id, inRangeSnaps, workOrders, rooms, housekeepers, fnbItems, events]);

  const { monthly, categories, kpis } = useMemo(() => {
    const monthly = buildMonthly(workOrders);

    // Category breakdown
    const catMap = new Map<string, number>();
    for (const o of workOrders) {
      const c = (o.category || "other").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
      catMap.set(c, (catMap.get(c) ?? 0) + 1);
    }
    const categories = [...catMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: CAT_COLORS[i % CAT_COLORS.length] }));

    // KPIs
    const completed = workOrders.filter((o) => o.completed_at);
    const resolutionHrs = completed.map((o) => (+new Date(o.completed_at!) - +new Date(o.created_at)) / 3.6e6);
    const avgRes = resolutionHrs.length ? resolutionHrs.reduce((a, b) => a + b, 0) / resolutionHrs.length : 0;
    const now = new Date();
    const criticalThisMonth = workOrders.filter((o) =>
      o.priority === "critical" && new Date(o.created_at).getMonth() === now.getMonth() && new Date(o.created_at).getFullYear() === now.getFullYear()
    ).length;
    const active = workOrders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length;
    const completionRate = workOrders.length ? Math.round((completed.length / workOrders.length) * 100) : 0;

    const kpis = [
      { label: "Avg. Resolution Time", value: avgRes > 0 ? `${avgRes.toFixed(1)}h` : "—", icon: Clock,        color: "text-indigo-400",  bg: "bg-indigo-500/15" },
      { label: "Completion Rate",      value: `${completionRate}%`,                       icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/15" },
      { label: "Open Work Orders",     value: String(active),                             icon: TrendingDown, color: "text-cyan-400",    bg: "bg-cyan-500/15" },
      { label: "Critical This Month",  value: String(criticalThisMonth),                  icon: AlertTriangle,color: "text-amber-400",   bg: "bg-amber-500/15" },
    ];

    return { monthly, categories, kpis };
  }, [workOrders]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Operations analytics{org?.name ? ` for ${org.name}` : ""}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex w-fit max-w-full overflow-x-auto rounded-lg border border-border p-0.5 gap-0.5">
        {([
          { key: "overview" as Tab,  icon: BarChart3, label: "Maintenance" },
          { key: "occupancy" as Tab, icon: Moon,      label: "Occupancy" },
          { key: "data" as Tab,      icon: Table2,    label: "Report viewer" },
        ]).map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap text-sm px-4 py-2 rounded-md transition-colors",
              tab === key ? "bg-foreground/[0.08] text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            )}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Occupancy ── */}
      {tab === "occupancy" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OccupancyStat kind="last_night" metrics={last} delta={lastDelta} deltaLabel="same night last week" loading={occLoading} />
            <OccupancyStat kind="tomorrow" metrics={tomorrow} delta={tomorrowDelta} deltaLabel="same night last week" loading={occLoading} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Show</span>
            {RANGES.map((r) => (
              <button key={r.days} onClick={() => setRangeDays(r.days)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors min-h-[32px]",
                  rangeDays === r.days
                    ? "border-indigo-500/60 bg-indigo-500/15 text-indigo-300"
                    : "border-border bg-foreground/[0.03] text-muted-foreground hover:text-foreground"
                )}>
                {r.label}
              </button>
            ))}
          </div>

          <OccupancyTrend snapshots={snapshots.filter((s) => s.stay_date >= addDays(today, -rangeDays))} />
        </div>
      )}

      {/* ── Report viewer ── */}
      {tab === "data" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {/* On a phone the sidebar list fills the whole first screen before you
              reach the report itself, so collapse it to a single control there. */}
          <label className="lg:hidden block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Report</span>
            <select
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              className="mt-1 w-full h-10 rounded-lg bg-foreground/[0.04] border border-border px-2 text-sm text-foreground"
            >
              {REPORT_CATALOG.map((r) => (
                <option key={r.id} value={r.id}>{r.group} — {r.name}</option>
              ))}
            </select>
          </label>

          <nav className="lg:col-span-1 glass-card p-3 space-y-3 hidden lg:block" aria-label="Reports">
            {Object.entries(
              REPORT_CATALOG.reduce<Record<string, typeof REPORT_CATALOG>>((acc, r) => {
                (acc[r.group] ??= []).push(r);
                return acc;
              }, {})
            ).map(([group, reports]) => (
              <div key={group}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">{group}</p>
                <div className="space-y-0.5">
                  {reports.map((r) => (
                    <button key={r.id} onClick={() => setReportId(r.id)}
                      aria-current={reportId === r.id ? "page" : undefined}
                      className={cn(
                        "w-full text-left rounded-md px-2 py-2 text-sm transition-colors min-h-[36px]",
                        reportId === r.id
                          ? "bg-indigo-500/15 text-indigo-300 font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
                      )}>
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="lg:col-span-3 space-y-4">
            {activeReport.group === "Occupancy" && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Period</span>
                {RANGES.map((r) => (
                  <button key={r.days} onClick={() => setRangeDays(r.days)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors min-h-[32px]",
                      rangeDays === r.days
                        ? "border-indigo-500/60 bg-indigo-500/15 text-indigo-300"
                        : "border-border bg-foreground/[0.03] text-muted-foreground hover:text-foreground"
                    )}>
                    {r.label}
                  </button>
                ))}
              </div>
            )}
            <ReportViewer
              title={activeReport.name}
              description={activeReport.description}
              table={reportTable}
              canExport={canExport}
            />
          </div>
        </div>
      )}

      {tab === "overview" && (
      <>
      {/* KPIs — computed from real work orders */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-3.5 w-3.5 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Work Order Volume</p>
          <p className="text-base font-semibold text-foreground mb-5">Last 6 Months</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="opened"  fill="#6366f1" radius={[3,3,0,0]} />
              <Bar dataKey="closed"  fill="#10b981" radius={[3,3,0,0]} />
              <Bar dataKey="critical"fill="#ef4444" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500" />Opened</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Closed</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />Critical</span>
          </div>
        </div>

        <div className="glass-card p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">By Category</p>
          <p className="text-base font-semibold text-foreground mb-3">Issue Breakdown</p>
          <div className="flex justify-center">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={categories} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {categories.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {categories.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </span>
                <span className="text-foreground font-medium">{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
