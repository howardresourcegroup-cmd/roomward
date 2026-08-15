import type { WidgetId, DashboardWidgetPref, DashboardLayout } from "@/types";

// The dashboard widget catalog and the logic for reconciling a person's saved
// arrangement with it. Pure — no React, no data access — so the merge rules are
// unit-testable, which matters because they run against layouts saved by older
// versions of the app.

/**
 * Which part of the operation a widget speaks to. Used to group the Customize
 * dialog and to build each role's starting layout — not a permission boundary.
 * Anyone may add any widget they have permission to see; the department only
 * decides what they get *before* they've chosen.
 */
export type Department =
  | "Overview"
  | "Engineering"
  | "Housekeeping"
  | "Front Desk"
  | "Kitchen"
  | "Food & Beverage"
  | "Conferences & Events"
  | "Management";

export const DEPARTMENTS: Department[] = [
  "Overview", "Engineering", "Housekeeping", "Front Desk",
  "Kitchen", "Food & Beverage", "Conferences & Events", "Management",
];

export interface WidgetDef {
  id: WidgetId;
  title: string;
  description: string;
  department: Department;
  /** Permission required to see it at all. Undefined = everyone. */
  permission?: string;
  /** Shown by default for someone who has never customised anything. */
  defaultVisible: boolean;
  /** Columns on the 12-column desktop grid. */
  span: 4 | 6 | 8 | 12;
}

/** Bump when the catalog changes meaningfully. Stored with each saved layout. */
export const DASHBOARD_LAYOUT_VERSION = 2;

// `defaultVisible` is the fallback for a role with no entry in ROLE_DEFAULTS
// below — in practice managers and admins. Departmental roles get their own
// starting set, and anyone can then add or remove whatever they like.
export const DASHBOARD_WIDGETS: WidgetDef[] = [
  // ── Overview ────────────────────────────────────────────────────────────
  { id: "stats",                 title: "Operations stats",      description: "Active issues, uptime, technicians online.",        department: "Overview",     defaultVisible: true,  span: 12 },
  { id: "activity_feed",         title: "Recent activity",       description: "The latest changes across the property.",           department: "Overview",     defaultVisible: true,  span: 4 },
  { id: "building_health",       title: "Portfolio health",      description: "Operational share per building.",                   department: "Overview",     defaultVisible: true,  span: 4, permission: "buildings.view" },

  // ── Engineering ─────────────────────────────────────────────────────────
  { id: "urgent_work_orders",    title: "Needs attention",       description: "Critical and in-progress jobs.",                    department: "Engineering",  defaultVisible: true,  span: 8, permission: "work_orders.view" },
  { id: "my_work_queue",         title: "My work queue",         description: "Jobs assigned to you, by state.",                   department: "Engineering",  defaultVisible: false, span: 12, permission: "work_orders.view" },
  { id: "metrics_chart",         title: "Work order trend",      description: "Opened vs closed over the week.",                   department: "Engineering",  defaultVisible: true,  span: 8, permission: "reports.view" },
  { id: "wo_backlog",            title: "Backlog by category",   description: "Where open work is piling up, and how old it is.",  department: "Engineering",  defaultVisible: false, span: 6, permission: "work_orders.view" },
  { id: "asset_health",          title: "Asset health",          description: "Equipment degraded, failed, or due for service.",   department: "Engineering",  defaultVisible: false, span: 6, permission: "assets.view" },

  // ── Housekeeping ────────────────────────────────────────────────────────
  { id: "housekeeping_progress", title: "Board progress",        description: "How far along each housekeeper's board is.",        department: "Housekeeping", defaultVisible: false, span: 6 },
  { id: "room_turnover",         title: "Room turnover",         description: "Dirty, in progress, awaiting inspection, ready.",   department: "Housekeeping", defaultVisible: false, span: 12 },
  { id: "my_rooms",              title: "My rooms",              description: "The rooms assigned to you today.",                  department: "Housekeeping", defaultVisible: false, span: 6 },

  // ── Front Desk ──────────────────────────────────────────────────────────
  { id: "rooms_ready",           title: "Rooms ready",           description: "What you can check a guest into right now.",        department: "Front Desk",   defaultVisible: false, span: 6 },
  { id: "guest_room_issues",     title: "Guest room issues",     description: "Open work orders in occupied and arriving rooms.",  department: "Front Desk",   defaultVisible: false, span: 6, permission: "work_orders.view" },
  { id: "occupancy_last_night",  title: "Last night",            description: "Settled occupancy, ADR and RevPAR.",                department: "Front Desk",   defaultVisible: true,  span: 6, permission: "reports.view" },
  // Only one occupancy tile is on by default — both are empty until a PMS feeds
  // the property, and two identical "no data yet" panels read as breakage.
  { id: "occupancy_forecast",    title: "Tomorrow — anticipated",description: "Forecast occupancy and expected arrivals.",         department: "Front Desk",   defaultVisible: false, span: 6, permission: "reports.view" },

  // ── Kitchen ─────────────────────────────────────────────────────────────
  { id: "temp_compliance",       title: "Temperature compliance",description: "Latest reading per unit, and anything out of range.",department: "Kitchen",     defaultVisible: false, span: 6, permission: "fnb.view" },
  { id: "kitchen_prep",          title: "Covers to prepare",     description: "Guests in-house tonight plus event headcount.",     department: "Kitchen",      defaultVisible: false, span: 6, permission: "fnb.view" },

  // ── Food & Beverage ─────────────────────────────────────────────────────
  { id: "fnb_low_stock",         title: "Reorder list",          description: "Stock lines at or below par.",                      department: "Food & Beverage", defaultVisible: false, span: 6, permission: "fnb.view" },
  { id: "outlet_status",         title: "Outlet status",         description: "What's open now, with hours and stock warnings.",   department: "Food & Beverage", defaultVisible: false, span: 6, permission: "fnb.view" },

  // ── Conferences & Events ────────────────────────────────────────────────
  { id: "events_today",          title: "On today",              description: "Events in house, with setup and teardown times.",   department: "Conferences & Events", defaultVisible: false, span: 6, permission: "banquets.view" },
  { id: "upcoming_events",       title: "Upcoming events",       description: "The next conference and event bookings.",           department: "Conferences & Events", defaultVisible: false, span: 6, permission: "banquets.view" },
  { id: "event_pipeline",        title: "Event pipeline",        description: "Committed value, deposits outstanding, by status.", department: "Conferences & Events", defaultVisible: false, span: 6, permission: "banquets.view" },

  // ── Management ──────────────────────────────────────────────────────────
  { id: "team_availability",     title: "Team on shift",         description: "Who is marked available, by role.",                 department: "Management",   defaultVisible: false, span: 6, permission: "team.view" },
  { id: "revenue_snapshot",      title: "Revenue snapshot",      description: "Room revenue last night plus committed event value.", department: "Management", defaultVisible: false, span: 6, permission: "reports.view" },
];

const BY_ID = new Map<WidgetId, WidgetDef>(DASHBOARD_WIDGETS.map((w) => [w.id, w]));

export function getWidget(id: WidgetId): WidgetDef | undefined {
  return BY_ID.get(id);
}

/**
 * The starting dashboard for each role, in render order.
 *
 * This replaces the hardcoded per-role dashboards that used to short-circuit the
 * home page: a housekeeper's first view is still about their rooms, but it is now
 * an ordinary layout they can rearrange, rather than a fixed screen. Roles absent
 * here (manager, admin, custom) fall back to each widget's `defaultVisible`.
 *
 * Only widgets listed are visible; the rest of the catalog is still one click
 * away in Customize.
 */
export const ROLE_DEFAULTS: Record<string, WidgetId[]> = {
  maintenance: ["my_work_queue", "urgent_work_orders", "asset_health", "wo_backlog", "activity_feed"],
  technician:  ["my_work_queue", "urgent_work_orders", "asset_health", "wo_backlog", "activity_feed"], // legacy alias
  housekeeping:["my_rooms", "room_turnover", "housekeeping_progress", "activity_feed"],
  front_desk:  ["rooms_ready", "occupancy_last_night", "guest_room_issues", "events_today"],
  hr:          ["team_availability", "stats", "activity_feed"],
  viewer:      ["stats", "building_health", "activity_feed"],
};

/** Role-appropriate starting layout. Order here is the render order. */
export function defaultLayoutForRole(roleSlug?: string | null): DashboardLayout {
  const preferred = roleSlug ? ROLE_DEFAULTS[roleSlug] : undefined;

  if (!preferred) {
    return {
      version: DASHBOARD_LAYOUT_VERSION,
      widgets: DASHBOARD_WIDGETS.map((w) => ({ id: w.id, visible: w.defaultVisible })),
    };
  }

  // Listed widgets first, in the order given; everything else follows, hidden,
  // so the full catalog stays reachable from Customize without cluttering.
  const chosen = preferred.filter((id) => BY_ID.has(id));
  const rest = DASHBOARD_WIDGETS.map((w) => w.id).filter((id) => !chosen.includes(id));

  return {
    version: DASHBOARD_LAYOUT_VERSION,
    widgets: [
      ...chosen.map((id) => ({ id, visible: true })),
      ...rest.map((id) => ({ id, visible: false })),
    ],
  };
}

export function defaultLayout(): DashboardLayout {
  return defaultLayoutForRole(null);
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
export function resolveLayout(
  saved: DashboardLayout | null | undefined,
  roleSlug?: string | null
): DashboardWidgetPref[] {
  if (!saved || !Array.isArray(saved.widgets) || saved.widgets.length === 0) {
    return defaultLayoutForRole(roleSlug).widgets;
  }

  const seen = new Set<WidgetId>();
  const kept: DashboardWidgetPref[] = [];

  for (const pref of saved.widgets) {
    if (!pref || !BY_ID.has(pref.id) || seen.has(pref.id)) continue; // unknown or duplicate
    seen.add(pref.id);
    kept.push({ id: pref.id, visible: pref.visible !== false });
  }

  // Widgets added since this layout was saved. They arrive hidden rather than at
  // their catalog default: someone who has arranged their dashboard shouldn't
  // find new panels inserted into it by an upgrade.
  for (const w of DASHBOARD_WIDGETS) {
    if (seen.has(w.id)) continue;
    kept.push({ id: w.id, visible: false });
  }

  return kept;
}

/** The widgets to actually render: resolved, permitted, and visible. */
export function visibleWidgets(
  saved: DashboardLayout | null | undefined,
  can: (permission: string) => boolean,
  roleSlug?: string | null
): WidgetDef[] {
  return resolveLayout(saved, roleSlug)
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

/**
 * Move a widget past its nearest *visible* neighbour.
 *
 * The editor only lists visible widgets when arranging order, so a plain
 * `reorder` would swap with whatever hidden entry happens to sit adjacent in the
 * array and appear to do nothing. This skips hidden entries so one click always
 * moves the widget one place on screen.
 */
export function reorderVisible(
  prefs: DashboardWidgetPref[],
  id: WidgetId,
  direction: "up" | "down"
): DashboardWidgetPref[] {
  const i = prefs.findIndex((p) => p.id === id);
  if (i === -1 || !prefs[i].visible) return prefs;

  const step = direction === "up" ? -1 : 1;
  let j = i + step;
  while (j >= 0 && j < prefs.length && !prefs[j].visible) j += step;
  if (j < 0 || j >= prefs.length) return prefs; // no visible neighbour that way

  const next = [...prefs];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function toggleVisible(prefs: DashboardWidgetPref[], id: WidgetId): DashboardWidgetPref[] {
  return prefs.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p));
}
