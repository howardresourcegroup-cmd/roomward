import type { WidgetId, DashboardWidgetPref, DashboardLayout } from "@/types";

// The dashboard widget catalog and the logic for reconciling a person's saved
// arrangement with it. Pure — no React, no data access — so the merge rules are
// unit-testable, which matters because they run against layouts saved by older
// versions of the app.

export interface WidgetDef {
  id: WidgetId;
  title: string;
  description: string;
  /** Permission required to see it at all. Undefined = everyone. */
  permission?: string;
  /** Shown by default for someone who has never customised anything. */
  defaultVisible: boolean;
  /** Columns on the 12-column desktop grid. */
  span: 4 | 6 | 8 | 12;
}

/** Bump when the catalog changes meaningfully. Stored with each saved layout. */
export const DASHBOARD_LAYOUT_VERSION = 1;

export const DASHBOARD_WIDGETS: WidgetDef[] = [
  { id: "stats",                 title: "Operations stats",     description: "Active issues, uptime, technicians online.",       defaultVisible: true,  span: 12 },
  { id: "occupancy_last_night",  title: "Last night",           description: "Settled occupancy, ADR and RevPAR.",               defaultVisible: true,  span: 6, permission: "reports.view" },
  // Only one occupancy tile is on by default. Both are empty until a PMS feeds
  // the property, and two identical "no data yet" panels side by side reads as
  // something broken rather than something not yet connected.
  { id: "occupancy_forecast",    title: "Tomorrow — anticipated",description: "Forecast occupancy and expected arrivals.",        defaultVisible: false, span: 6, permission: "reports.view" },
  { id: "urgent_work_orders",    title: "Needs attention",      description: "Critical and in-progress jobs.",                   defaultVisible: true,  span: 8, permission: "work_orders.view" },
  { id: "building_health",       title: "Portfolio health",     description: "Operational share per building.",                  defaultVisible: true,  span: 4, permission: "buildings.view" },
  { id: "metrics_chart",         title: "Work order trend",     description: "Opened vs closed over the week.",                  defaultVisible: true,  span: 8, permission: "reports.view" },
  { id: "activity_feed",         title: "Recent activity",      description: "The latest changes across the property.",          defaultVisible: true,  span: 4 },
  { id: "housekeeping_progress", title: "Housekeeping progress",description: "How far along each housekeeper's board is.",       defaultVisible: false, span: 6 },
  { id: "fnb_low_stock",         title: "F&B reorder list",     description: "Stock lines at or below par.",                     defaultVisible: false, span: 6, permission: "fnb.view" },
  { id: "upcoming_events",       title: "Upcoming events",      description: "The next banquet and conference bookings.",        defaultVisible: false, span: 6, permission: "banquets.view" },
];

const BY_ID = new Map<WidgetId, WidgetDef>(DASHBOARD_WIDGETS.map((w) => [w.id, w]));

export function getWidget(id: WidgetId): WidgetDef | undefined {
  return BY_ID.get(id);
}

export function defaultLayout(): DashboardLayout {
  return {
    version: DASHBOARD_LAYOUT_VERSION,
    widgets: DASHBOARD_WIDGETS.map((w) => ({ id: w.id, visible: w.defaultVisible })),
  };
}

/**
 * Reconcile a saved arrangement with the current catalog.
 *
 * Two things have to survive a release: a widget the catalog no longer has must
 * be dropped rather than crash a render, and a widget added since the layout was
 * saved must appear rather than be invisible forever. New widgets are appended
 * at the end with their default visibility — inserting them mid-board would
 * rearrange a dashboard someone deliberately ordered.
 */
export function resolveLayout(saved: DashboardLayout | null | undefined): DashboardWidgetPref[] {
  if (!saved || !Array.isArray(saved.widgets) || saved.widgets.length === 0) {
    return defaultLayout().widgets;
  }

  const seen = new Set<WidgetId>();
  const kept: DashboardWidgetPref[] = [];

  for (const pref of saved.widgets) {
    if (!pref || !BY_ID.has(pref.id) || seen.has(pref.id)) continue; // unknown or duplicate
    seen.add(pref.id);
    kept.push({ id: pref.id, visible: pref.visible !== false });
  }

  for (const w of DASHBOARD_WIDGETS) {
    if (seen.has(w.id)) continue;
    kept.push({ id: w.id, visible: w.defaultVisible });
  }

  return kept;
}

/** The widgets to actually render: resolved, permitted, and visible. */
export function visibleWidgets(
  saved: DashboardLayout | null | undefined,
  can: (permission: string) => boolean
): WidgetDef[] {
  return resolveLayout(saved)
    .filter((p) => p.visible)
    .map((p) => BY_ID.get(p.id))
    .filter((w): w is WidgetDef => !!w)
    .filter((w) => !w.permission || can(w.permission));
}

/** Move a widget one slot up or down, returning a new array. */
export function reorder(prefs: DashboardWidgetPref[], id: WidgetId, direction: "up" | "down"): DashboardWidgetPref[] {
  const i = prefs.findIndex((p) => p.id === id);
  if (i === -1) return prefs;
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= prefs.length) return prefs; // already at the edge

  const next = [...prefs];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function toggleVisible(prefs: DashboardWidgetPref[], id: WidgetId): DashboardWidgetPref[] {
  return prefs.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p));
}
