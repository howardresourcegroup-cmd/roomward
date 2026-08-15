// Modular permission catalog — the single source of truth.
// Each permission is a granular key grouped by area. The Roles matrix UI is
// generated from this, and usePermissions() checks against it.
// Add a new capability here and it automatically appears in the role editor.

export interface PermissionDef {
  key: string;
  label: string;
  description: string;
}

export interface PermissionGroup {
  area: string;
  permissions: PermissionDef[];
}

export const PERMISSION_CATALOG: PermissionGroup[] = [
  {
    area: "Dashboard",
    permissions: [
      { key: "dashboard.view", label: "View dashboard", description: "See the operations overview" },
    ],
  },
  {
    area: "Buildings & Spaces",
    permissions: [
      { key: "buildings.view", label: "View buildings", description: "See buildings, floors and rooms" },
      { key: "buildings.create", label: "Create buildings", description: "Add new facilities" },
      { key: "buildings.edit", label: "Edit buildings", description: "Change building details" },
      { key: "buildings.delete", label: "Delete buildings", description: "Remove facilities" },
      { key: "buildings.edit_layout", label: "Edit floor layout", description: "Use the floor plan builder" },
      { key: "spaces.update_status", label: "Update room status", description: "Change a room's operational status" },
    ],
  },
  {
    area: "Work Orders",
    permissions: [
      { key: "work_orders.view", label: "View work orders", description: "See maintenance jobs" },
      { key: "work_orders.create", label: "Create work orders", description: "Log new issues" },
      { key: "work_orders.edit", label: "Edit & update", description: "Change status, add notes" },
      { key: "work_orders.assign", label: "Assign technicians", description: "Dispatch jobs to staff" },
      { key: "work_orders.complete", label: "Complete jobs", description: "Mark work orders done" },
      { key: "work_orders.delete", label: "Delete work orders", description: "Remove work orders" },
    ],
  },
  {
    area: "Team",
    permissions: [
      { key: "team.view", label: "View team", description: "See technicians and staff" },
      { key: "team.manage", label: "Manage team", description: "Invite, edit, assign roles" },
    ],
  },
  {
    area: "Assets",
    permissions: [
      { key: "assets.view", label: "View assets", description: "See the equipment registry" },
      { key: "assets.manage", label: "Manage assets", description: "Add and edit assets" },
    ],
  },
  {
    area: "Communication",
    permissions: [
      { key: "chat.participate", label: "Team chat", description: "Read and send messages" },
    ],
  },
  {
    area: "Housekeeping",
    permissions: [
      { key: "housekeeping.assign", label: "Assign rooms", description: "Give housekeepers their room boards" },
    ],
  },
  {
    area: "Reports",
    permissions: [
      { key: "reports.view", label: "View reports", description: "See analytics and KPIs" },
      { key: "reports.export", label: "Export reports", description: "Download report data as CSV" },
    ],
  },
  {
    area: "Food & Beverage",
    permissions: [
      { key: "fnb.view", label: "View F&B", description: "See outlets, stock levels and temperature logs" },
      { key: "fnb.manage", label: "Manage F&B", description: "Edit outlets, count stock, record temperatures" },
    ],
  },
  {
    // Keys stay `banquets.*` while the UI says "Conferences & Events" — they are
    // stored in role_permissions rows on live orgs, so renaming them is a data
    // migration for a label change. Same split CLAUDE.md draws for `facilityflow`.
    area: "Conferences & Events",
    permissions: [
      { key: "banquets.view", label: "View events", description: "See the conference & event calendar" },
      { key: "banquets.manage", label: "Manage events", description: "Book, edit and cancel events" },
    ],
  },
  {
    area: "Administration",
    permissions: [
      { key: "integrations.manage", label: "Manage integrations", description: "Connect/sync PMS & CMMS systems" },
      { key: "settings.manage", label: "Manage settings", description: "Edit organization settings" },
      { key: "roles.manage", label: "Manage roles", description: "Configure roles & permissions" },
    ],
  },
];

// Flat list of every permission key
export const ALL_PERMISSIONS: string[] = PERMISSION_CATALOG.flatMap((g) =>
  g.permissions.map((p) => p.key)
);

// ─── Role-slug helpers ────────────────────────────────────────────────────────
// The roles table uses the slug "maintenance" for field techs, but the legacy
// profiles.role text column historically stored "technician" (demo seed +
// team-invite path). Treat them as equivalent so counts/filters never miss one.
// Single source of truth — use this instead of inline `role === "technician"`.
export function isMaintenanceRole(role?: string | null): boolean {
  return role === "maintenance" || role === "technician";
}

// Role accent colors used in the UI
export const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  red:    { bg: "bg-red-500/15",    text: "text-red-400",    border: "border-red-500/30",    dot: "bg-red-400" },
  indigo: { bg: "bg-indigo-500/15", text: "text-indigo-400", border: "border-indigo-500/30", dot: "bg-indigo-400" },
  amber:  { bg: "bg-amber-500/15",  text: "text-amber-400",  border: "border-amber-500/30",  dot: "bg-amber-400" },
  cyan:   { bg: "bg-cyan-500/15",   text: "text-cyan-400",   border: "border-cyan-500/30",   dot: "bg-cyan-400" },
  violet: { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30", dot: "bg-violet-400" },
  emerald:{ bg: "bg-emerald-500/15",text: "text-emerald-400",border: "border-emerald-500/30",dot: "bg-emerald-400" },
  zinc:   { bg: "bg-zinc-700/40",   text: "text-zinc-400",   border: "border-zinc-600/40",   dot: "bg-zinc-400" },
};

export const ROLE_COLOR_OPTIONS = Object.keys(ROLE_COLORS);
