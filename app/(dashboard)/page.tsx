"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Sparkles, SlidersHorizontal } from "lucide-react";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { WorkOrderCard } from "@/components/work-orders/work-order-card";
import { GettingStarted } from "@/components/dashboard/getting-started";
import { CustomizeDashboard } from "@/components/dashboard/customize-dashboard";
import { OccupancyStat } from "@/components/analytics/occupancy-stat";
import {
  HousekeepingProgressWidget, FnbLowStockWidget, UpcomingEventsWidget, UnknownWidget,
} from "@/components/dashboard/ops-widgets";
import { Button } from "@/components/ui/button";
import { WELCOME_SEEN_KEY } from "@/components/welcome-modal";
import { MOCK_STATS } from "@/lib/mock-data";
import { visibleWidgets } from "@/lib/dashboard-widgets";
import {
  addDays, toStayDate, lastNight, tomorrowNight, sameNightLastWeek, occupancyDelta,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type {
  WidgetId, DashboardStats, Building, ActivityItem, WorkOrder, OccupancyMetrics,
} from "@/types";
import {
  useWorkOrders, useDashboardStats, useCurrentProfile, usePermissions, useRecentActivity,
  useOrganization, useBuildings, useOccupancy, useDashboardLayout,
} from "@/lib/data/hooks";

const MetricsChart    = dynamic(() => import("@/components/dashboard/metrics-chart").then(m => ({ default: m.MetricsChart })), { ssr: false });
const ActivityFeed    = dynamic(() => import("@/components/dashboard/activity-feed").then(m => ({ default: m.ActivityFeed })), { ssr: false });
const BuildingHealth  = dynamic(() => import("@/components/dashboard/building-health").then(m => ({ default: m.BuildingHealth })), { ssr: false });
const RoomMasterPanel = dynamic(() => import("@/components/integrations/roommaster-panel").then(m => ({ default: m.RoomMasterPanel })), { ssr: false });
const IntegrationsPanel = dynamic(() => import("@/components/integrations/roommaster-panel").then(m => ({ default: m.IntegrationsPanel })), { ssr: false });
const EpturaPanel     = dynamic(() => import("@/components/integrations/eptura-panel").then(m => ({ default: m.EpturaPanel })), { ssr: false });
const MaintenanceDashboard = dynamic(() => import("@/components/dashboard/role-dashboards").then(m => ({ default: m.MaintenanceDashboard })), { ssr: false });
const HousekeepingDashboard = dynamic(() => import("@/components/dashboard/role-dashboards").then(m => ({ default: m.HousekeepingDashboard })), { ssr: false });
const FrontDeskDashboard = dynamic(() => import("@/components/dashboard/role-dashboards").then(m => ({ default: m.FrontDeskDashboard })), { ssr: false });

export default function DashboardPage() {
  const { workOrders } = useWorkOrders();
  const { buildings } = useBuildings();
  const stats = useDashboardStats();
  const profile = useCurrentProfile();
  const { can } = usePermissions();
  const activity = useRecentActivity();
  const { org } = useOrganization();
  const showIntegrations = can("integrations.manage");
  const now = new Date();

  const [customizing, setCustomizing] = useState(false);
  const { layout, save: saveLayout } = useDashboardLayout();
  const widgets = useMemo(() => visibleWidgets(layout, can), [layout, can]);

  // A fortnight either side covers last night, the forecast, and the
  // week-over-week comparison the stat tiles show.
  const today = toStayDate(now);
  const { snapshots, loading: occLoading } = useOccupancy(addDays(today, -14), addDays(today, 14));

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

  // Auto-start product tour when landing from /demo for the first time.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("rw:start_tour") !== "1") return;
    sessionStorage.removeItem("rw:start_tour");
    // If the welcome modal hasn't been dismissed yet, it's about to show and will
    // offer the tour via its own "Show me around" button. Auto-starting here too
    // would run two intros at once, so let the modal own the hand-off.
    if (localStorage.getItem(WELCOME_SEEN_KEY) !== "1") return;
    const t = setTimeout(() => window.dispatchEvent(new CustomEvent("rw:start-tour")), 1800);
    return () => clearTimeout(t);
  }, []);

  // Role-tailored home view — each role lands on what matters to them.
  // Managers/admins/viewers (and custom roles) get the full operations dashboard below.
  if (profile?.role_slug === "maintenance") return <MaintenanceDashboard profile={profile} />;
  if (profile?.role_slug === "housekeeping") return <HousekeepingDashboard profile={profile} />;
  if (profile?.role_slug === "front_desk") return <FrontDeskDashboard profile={profile} />;

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  const urgentOrders = workOrders
    .filter((w) => w.status !== "completed" && w.status !== "cancelled" &&
      (w.priority === "critical" || w.status === "in_progress"))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(now, "EEEE, MMMM d, yyyy")}{org?.name ? ` · ${org.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setCustomizing(true)}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Customize</span>
          </Button>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Local Time</p>
            <p className="text-2xl font-mono font-semibold text-foreground tabular-nums">
              {format(now, "h:mm a")}
            </p>
          </div>
        </div>
      </div>

      {/* Demo mode banner */}
      {org?.is_demo && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/[0.07] px-4 py-3">
          <div className="flex items-center gap-2.5 text-sm">
            <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
            <span className="text-indigo-200 font-medium">You&apos;re exploring the Roomward demo.</span>
            <span className="text-indigo-300/60 hidden sm:inline">This sandbox resets when you leave.</span>
          </div>
          <Link href="/signup" className="btn-primary text-xs h-8 px-3 shrink-0">
            Get started free <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <GettingStarted />

      {/* Modular grid — order and visibility come from this user's own layout. */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {widgets.map((w) => (
          <div key={w.id} className={cn("min-w-0", SPAN_CLASS[w.span])}>
            {renderWidget(w.id, {
              stats: stats ?? MOCK_STATS,
              buildings,
              activity,
              urgentOrders,
              occupancy: { last, tomorrow, lastDelta, tomorrowDelta, loading: occLoading },
            })}
          </div>
        ))}
      </div>

      {widgets.length === 0 && (
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-foreground font-medium">Your dashboard is empty</p>
          <p className="text-sm text-muted-foreground mt-1">
            Everything is hidden right now. Add a panel back to get your home view going.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setCustomizing(true)}>
            <SlidersHorizontal className="h-3.5 w-3.5" /> Customize
          </Button>
        </div>
      )}

      {/* Integrations — managers/admins only. Not user-arrangeable: these are
          setup surfaces rather than at-a-glance panels. */}
      {showIntegrations && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-5">
            <RoomMasterPanel />
            <EpturaPanel />
          </div>
          <IntegrationsPanel />
        </div>
      )}

      <CustomizeDashboard
        open={customizing}
        onOpenChange={setCustomizing}
        layout={layout}
        onSave={saveLayout}
        can={can}
      />
    </div>
  );
}

// Static class names — Tailwind can't see an interpolated `xl:col-span-${n}`.
const SPAN_CLASS: Record<4 | 6 | 8 | 12, string> = {
  4: "xl:col-span-4",
  6: "xl:col-span-6",
  8: "xl:col-span-8",
  12: "xl:col-span-12",
};

interface WidgetData {
  stats: DashboardStats;
  buildings: Building[];
  activity: ActivityItem[];
  urgentOrders: WorkOrder[];
  occupancy: {
    last: OccupancyMetrics | null;
    tomorrow: OccupancyMetrics | null;
    lastDelta: number | null;
    tomorrowDelta: number | null;
    loading: boolean;
  };
}

function renderWidget(id: WidgetId, d: WidgetData) {
  switch (id) {
    case "stats":
      return <div data-tour="stats"><StatsGrid stats={d.stats} /></div>;

    case "occupancy_last_night":
      return <OccupancyStat kind="last_night" metrics={d.occupancy.last} delta={d.occupancy.lastDelta} deltaLabel="same night last week" loading={d.occupancy.loading} />;

    case "occupancy_forecast":
      return <OccupancyStat kind="tomorrow" metrics={d.occupancy.tomorrow} delta={d.occupancy.tomorrowDelta} deltaLabel="same night last week" loading={d.occupancy.loading} />;

    case "urgent_work_orders":
      return (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Active &amp; Critical</h2>
            <Link href="/work-orders" className="tap-relaxed text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              View all →
            </Link>
          </div>
          {d.urgentOrders.length === 0 ? (
            <div className="glass-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Nothing critical right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {d.urgentOrders.map((o, i) => <WorkOrderCard key={o.id} order={o} index={i} />)}
            </div>
          )}
        </div>
      );

    case "metrics_chart":     return <MetricsChart />;
    case "building_health":   return <BuildingHealth buildings={d.buildings} />;
    case "activity_feed":     return <div className="h-[320px]"><ActivityFeed items={d.activity.slice(0, 6)} /></div>;
    case "housekeeping_progress": return <HousekeepingProgressWidget />;
    case "fnb_low_stock":     return <FnbLowStockWidget />;
    case "upcoming_events":   return <UpcomingEventsWidget />;
    default:                  return <UnknownWidget title={id} />;
  }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
