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
  created_at: string;
  updated_at: string;
  // virtual
  floor?: Floor & { building?: Building };
  open_work_orders?: number;
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
