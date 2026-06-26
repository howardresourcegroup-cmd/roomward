import { describe, it, expect } from "vitest";
import {
  computeDashboardStats,
  type StatsSpaceRow,
  type StatsWorkOrderRow,
  type StatsProfileRow,
} from "./stats";

const NOW = new Date("2026-06-25T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 36e5).toISOString();

describe("computeDashboardStats", () => {
  it("computes operational percent from space statuses", () => {
    const spaces: StatsSpaceRow[] = [
      { status: "operational" }, { status: "operational" },
      { status: "needs_maintenance" }, { status: "offline" },
    ];
    const stats = computeDashboardStats(spaces, [], [], NOW);
    expect(stats.operational_percent).toBe(50); // 2 of 4
  });

  it("returns 100% operational when there are no spaces", () => {
    expect(computeDashboardStats([], [], [], NOW).operational_percent).toBe(100);
  });

  it("counts active issues and critical alerts, excluding completed/cancelled", () => {
    const wo: StatsWorkOrderRow[] = [
      { status: "open", priority: "critical", completed_at: null, created_at: hoursAgo(1) },
      { status: "in_progress", priority: "high", completed_at: null, created_at: hoursAgo(2) },
      { status: "completed", priority: "critical", completed_at: hoursAgo(1), created_at: hoursAgo(3) },
      { status: "cancelled", priority: "low", completed_at: null, created_at: hoursAgo(4) },
    ];
    const stats = computeDashboardStats([], wo, [], NOW);
    expect(stats.active_issues).toBe(2);
    expect(stats.critical_alerts).toBe(1); // completed critical not counted
  });

  it("averages resolution time over orders with both timestamps", () => {
    const wo: StatsWorkOrderRow[] = [
      { status: "completed", priority: "low", completed_at: hoursAgo(0), created_at: hoursAgo(2) }, // 2h
      { status: "completed", priority: "low", completed_at: hoursAgo(0), created_at: hoursAgo(4) }, // 4h
    ];
    expect(computeDashboardStats([], wo, [], NOW).avg_resolution_hours).toBe(3);
  });

  it("counts only today's completions", () => {
    const wo: StatsWorkOrderRow[] = [
      { status: "completed", priority: "low", completed_at: hoursAgo(1), created_at: hoursAgo(3) }, // today
      { status: "completed", priority: "low", completed_at: hoursAgo(36), created_at: hoursAgo(40) }, // yesterday
    ];
    expect(computeDashboardStats([], wo, [], NOW).completed_today).toBe(1);
  });

  it("counts online maintenance staff under both 'technician' and 'maintenance' slugs", () => {
    const profiles: StatsProfileRow[] = [
      { role: "technician", is_available: true },   // legacy slug
      { role: "maintenance", is_available: true },   // table slug
      { role: "maintenance", is_available: false },  // offline — not counted
      { role: "manager", is_available: true },       // not maintenance
    ];
    expect(computeDashboardStats([], [], profiles, NOW).technicians_online).toBe(2);
  });
});
