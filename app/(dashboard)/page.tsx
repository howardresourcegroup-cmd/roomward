"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { format } from "date-fns";
import { useEffect } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { WorkOrderCard } from "@/components/work-orders/work-order-card";
import { GettingStarted } from "@/components/dashboard/getting-started";
import { WELCOME_SEEN_KEY } from "@/components/welcome-modal";
import { MOCK_STATS } from "@/lib/mock-data";
import { useWorkOrders, useDashboardStats, useCurrentProfile, usePermissions, useRecentActivity, useOrganization, useBuildings } from "@/lib/data/hooks";

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
        <div className="text-right hidden sm:block">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Local Time</p>
          <p className="text-2xl font-mono font-semibold text-foreground tabular-nums">
            {format(now, "h:mm a")}
          </p>
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

      {/* Stats */}
      <div data-tour="stats">
        <StatsGrid stats={stats ?? MOCK_STATS} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left */}
        <div className="xl:col-span-2 space-y-5">
          <MetricsChart />

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Active &amp; Critical</h2>
              <Link href="/work-orders" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {urgentOrders.map((o, i) => (
                <WorkOrderCard key={o.id} order={o} index={i} />
              ))}
            </div>
          </div>

          {/* Integrations — managers/admins only */}
          {showIntegrations && <RoomMasterPanel />}
          {showIntegrations && <EpturaPanel />}
        </div>

        {/* Right */}
        <div className="space-y-5">
          <GettingStarted />
          <div className="h-[320px]">
            <ActivityFeed items={activity.slice(0, 6)} />
          </div>
          <BuildingHealth buildings={buildings} />
          {showIntegrations && <IntegrationsPanel />}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
