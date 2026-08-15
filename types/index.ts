export type SpaceStatus =
  | "operational"
  | "needs_maintenance"
  | "offline"
  | "cleaning_required"
  | "inspection_due"
  | "emergency";

export type HousekeepingStatus =
  | "dirty"
  | "in_progress"
  | "cleaned"
  | "ready"
  | "out_of_service";

// Live PMS occupancy — "is there a guest in the room right now?"
export type Occupancy = "vacant" | "occupied" | "arriving" | "departing";

export type WorkOrderStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "waiting_parts"
  | "completed"
  | "cancelled";

export type WorkOrderPriority = "low" | "medium" | "high" | "critical";

// Canonical role slugs, matching the `roles` table (migration 003) plus `hr`
// (migration 014). The legacy `profiles.role` text column may still hold
// "technician" for field maintenance staff (demo seed + team-invite path) —
// treat it as an alias of "maintenance". See isMaintenanceRole() in lib/permissions.
export type UserRole =
  | "admin"
  | "manager"
  | "maintenance"
  | "housekeeping"
  | "front_desk"
  | "viewer"
  | "hr"
  | "technician"; // legacy alias of "maintenance"

export type AssetStatus = "operational" | "degraded" | "failed" | "maintenance";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "starter" | "pro" | "enterprise";
  is_demo?: boolean;
  demo_expires_at?: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  full_name: string;
  email?: string | null;
  avatar_url: string | null;
  role: UserRole;
  role_id?: string | null;
  role_slug?: string;   // virtual — resolved role slug (admin/manager/maintenance/housekeeping/front_desk/viewer/custom)
  phone: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  type: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  // virtual
  floors?: Floor[];
  _floor_count?: number;
  _space_count?: number;
  _issue_count?: number;
  _emergency_count?: number;
}

export interface Floor {
  id: string;
  building_id: string;
  name: string;
  level: number;
  grid_cols: number;
  grid_rows: number;
  scale_ft_per_cell?: number | null;  // feet per grid cell; null = no scale set
  created_at: string;
  spaces?: Space[];
}

export interface Space {
  id: string;
  floor_id: string;
  name: string;
  type: string;
  status: SpaceStatus;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  qr_code: string | null;
  notes: string | null;
  sq_ft?: number | null;              // manual override; null = computed from cells × floor scale
  guest_name?: string | null;
  checked_in_at?: string | null;
  expected_checkout_at?: string | null;
  housekeeping_status?: HousekeepingStatus;
  occupancy?: Occupancy;
  /** Housekeeper responsible for this room today. Null = unassigned. */
  housekeeper_id?: string | null;
  housekeeping_assigned_at?: string | null;
  created_at: string;
  updated_at: string;
  // virtual
  floor?: Floor & { building?: Building };
  open_work_orders?: number;
  housekeeper?: Pick<Profile, "id" | "full_name" | "avatar_url"> | null; // virtual (joined)
}

export interface Asset {
  id: string;
  space_id: string | null;
  organization_id: string;
  name: string;
  type: string | null;
  model: string | null;
  serial_number: string | null;
  status: AssetStatus;
  last_maintenance_at: string | null;
  next_maintenance_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: string;
  organization_id: string;
  space_id: string | null;
  asset_id: string | null;
  created_by: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  category: string;
  photos: string[];
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // virtual
  space?: Space & { floor?: Floor & { building?: Building } };
  assignee?: Profile;
  creator?: Profile;
  _comment_count?: number;
}

export interface WorkOrderComment {
  id: string;
  work_order_id: string;
  author_id: string;
  content: string;
  photos: string[];
  created_at: string;
  author?: Profile;
}

export interface TechnicianAssignment {
  id: string;
  work_order_id: string;
  technician_id: string;
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: "work_order" | "alert" | "system";
  read: boolean;
  data: Record<string, unknown>;
  created_at: string;
}

// ─── Roles & permissions (RBAC) ───────────────────────────────────────────────
export interface Role {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  is_system: boolean;
  created_at: string;
  // virtual
  permissions?: string[];
  _member_count?: number;
}

// ─── Team chat ────────────────────────────────────────────────────────────────
export interface Channel {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  organization_id: string;
  author_id: string;
  body: string;
  work_order_id: string | null;
  space_id: string | null;
  edited: boolean;
  created_at: string;
  // virtual
  author?: Profile;
}

// ─── Corporate / audit ───────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  organization_id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  resource_label: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface Announcement {
  id: string;
  organization_id: string;
  author_id: string | null;
  title: string;
  body: string;
  target_roles: string[];
  pinned: boolean;
  created_at: string;
  updated_at: string;
  // virtual (joined)
  author?: { full_name: string | null; avatar_url: string | null } | null;
}

// UI helper types
export interface DashboardStats {
  active_issues: number;
  operational_percent: number;
  technicians_online: number;
  critical_alerts: number;
  completed_today: number;
  avg_resolution_hours: number;
}

export interface ActivityItem {
  id: string;
  type: "work_order_created" | "work_order_updated" | "status_changed" | "tech_assigned" | "comment_added";
  title: string;
  description: string;
  user: { name: string; avatar?: string };
  timestamp: string;
  meta?: Record<string, string>;
}

// ─── Occupancy analytics ─────────────────────────────────────────────────────
// One row per property per night. `stay_date` is the night *begun* — the row for
// 2026-07-29 describes the night of the 29th into the 30th, which is what hotels
// mean by "last night". Rows for future dates are the forecast: `is_actual`
// false, driven by confirmed reservations from the PMS.
export interface OccupancySnapshot {
  id: string;
  organization_id: string;
  building_id: string | null;
  stay_date: string;              // YYYY-MM-DD
  rooms_total: number;
  rooms_occupied: number;
  rooms_out_of_service: number;
  arrivals: number;
  departures: number;
  adr_cents: number | null;       // average daily rate
  is_actual: boolean;             // true = settled history, false = forecast
  created_at: string;
  updated_at: string;
}

/** Derived per-night metrics — computed, never stored. See lib/analytics.ts. */
export interface OccupancyMetrics {
  stay_date: string;
  rooms_total: number;
  rooms_occupied: number;
  rooms_sellable: number;         // total minus out-of-service
  occupancy_pct: number;          // occupied / sellable
  arrivals: number;
  departures: number;
  adr_cents: number | null;
  revpar_cents: number | null;    // revenue per available room
  is_actual: boolean;
}

// ─── Food & Beverage ─────────────────────────────────────────────────────────
export type OutletKind = "restaurant" | "bar" | "cafe" | "room_service" | "banquet_kitchen";
export type FnbUnit = "each" | "case" | "lb" | "kg" | "liter" | "gallon" | "bottle";

export interface FnbOutlet {
  id: string;
  organization_id: string;
  space_id: string | null;
  name: string;
  kind: OutletKind;
  is_open: boolean;
  opens_at: string | null;        // "07:00"
  closes_at: string | null;       // "22:00"
  seats: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // virtual
  _low_stock_count?: number;
  _open_work_orders?: number;
}

/** Stock line. Reorder is needed when on_hand <= par_level. */
export interface FnbInventoryItem {
  id: string;
  organization_id: string;
  outlet_id: string | null;
  name: string;
  category: string | null;        // "produce" | "dairy" | "liquor" | "dry goods" …
  unit: FnbUnit;
  on_hand: number;
  par_level: number;
  unit_cost_cents: number | null;
  supplier: string | null;
  last_counted_at: string | null;
  created_at: string;
  updated_at: string;
  // virtual
  outlet?: Pick<FnbOutlet, "id" | "name"> | null;
}

/**
 * Food-safety temperature log. Kept here rather than in a generic readings table
 * because the pass/fail band is regulatory and differs per equipment type.
 */
export interface FnbTempLog {
  id: string;
  organization_id: string;
  outlet_id: string | null;
  asset_id: string | null;
  equipment_label: string;
  temp_f: number;
  min_f: number;
  max_f: number;
  in_range: boolean;
  logged_by: string | null;
  note: string | null;
  created_at: string;
  // virtual
  logger?: Pick<Profile, "id" | "full_name"> | null;
}

// ─── Banquets / conference rentals ───────────────────────────────────────────
export type EventStatus = "inquiry" | "tentative" | "confirmed" | "in_progress" | "completed" | "cancelled";
export type SetupStyle = "theater" | "classroom" | "banquet_rounds" | "u_shape" | "boardroom" | "reception" | "hollow_square";

export interface BanquetEvent {
  id: string;
  organization_id: string;
  space_id: string | null;
  name: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  status: EventStatus;
  setup_style: SetupStyle;
  headcount: number;
  starts_at: string;
  ends_at: string;
  setup_starts_at: string | null;   // room must be ready by starts_at
  teardown_ends_at: string | null;
  quoted_cents: number | null;
  deposit_paid: boolean;
  av_needs: string[];               // "projector", "mics: 2", …
  catering_notes: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // virtual
  space?: Pick<Space, "id" | "name"> | null;
}

// ─── Modular dashboard ───────────────────────────────────────────────────────
/** Stable ids for dashboard widgets. See DASHBOARD_WIDGETS in lib/dashboard-widgets.ts. */
export type WidgetId =
  // Overview
  | "stats"
  | "activity_feed"
  | "building_health"
  // Engineering
  | "urgent_work_orders"
  | "my_work_queue"
  | "metrics_chart"
  | "wo_backlog"
  | "asset_health"
  // Housekeeping
  | "housekeeping_progress"
  | "room_turnover"
  | "my_rooms"
  // Front desk
  | "rooms_ready"
  | "guest_room_issues"
  | "occupancy_last_night"
  | "occupancy_forecast"
  // Kitchen
  | "temp_compliance"
  | "kitchen_prep"
  // Food & Beverage
  | "fnb_low_stock"
  | "outlet_status"
  // Conferences & Events
  | "events_today"
  | "upcoming_events"
  | "event_pipeline"
  // Management
  | "team_availability"
  | "revenue_snapshot";

export interface DashboardWidgetPref {
  id: WidgetId;
  visible: boolean;
}

/** Per-user dashboard arrangement. Order of the array is the render order. */
export interface DashboardLayout {
  widgets: DashboardWidgetPref[];
  /** Bumped when the built-in widget catalog changes so we can merge in new ones. */
  version: number;
}
