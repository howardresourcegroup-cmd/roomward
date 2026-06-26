// Pure dashboard-stats computation — no I/O, fully testable.
// fetchDashboardStats() in queries.ts pulls the rows from Supabase and hands
// them here, so the math (operational %, avg resolution, online techs, etc.)
// can be unit-tested without a database.

import type { DashboardStats } from "@/types";
import { isMaintenanceRole } from "@/lib/permissions";

export interface StatsSpaceRow { status: string }
export interface StatsWorkOrderRow {
  status: string;
  priority: string;
  completed_at: string | null;
  created_at: string;
}
export interface StatsProfileRow { role: string; is_available: boolean }

export function computeDashboardStats(
  spaces: StatsSpaceRow[],
  workOrders: StatsWorkOrderRow[],
  profiles: StatsProfileRow[],
  now: Date = new Date(),
): DashboardStats {
  const operational = spaces.filter((x) => x.status === "operational").length;
  const activeWo = workOrders.filter((x) => x.status !== "completed" && x.status !== "cancelled");

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // Real avg resolution from completed orders that have both timestamps.
  const resolved = workOrders.filter((x) => x.completed_at && x.created_at);
  const avgResolutionHours = resolved.length
    ? Math.round(
        (resolved.reduce(
          (sum, x) => sum + (new Date(x.completed_at!).getTime() - new Date(x.created_at).getTime()),
          0,
        ) / resolved.length) / 36e5 * 10,
      ) / 10
    : 0;

  return {
    active_issues: activeWo.length,
    operational_percent: spaces.length ? Math.round((operational / spaces.length) * 100) : 100,
    technicians_online: profiles.filter((x) => isMaintenanceRole(x.role) && x.is_available).length,
    critical_alerts: activeWo.filter((x) => x.priority === "critical").length,
    completed_today: workOrders.filter((x) => x.completed_at && new Date(x.completed_at) >= startOfToday).length,
    avg_resolution_hours: avgResolutionHours,
  };
}
