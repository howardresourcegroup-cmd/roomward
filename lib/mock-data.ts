import type {
  Building, Floor, Space, WorkOrder, Profile, ActivityItem, DashboardStats,
  OccupancySnapshot, FnbOutlet, FnbInventoryItem, FnbTempLog, BanquetEvent,
  HousekeepingStatus,
} from "@/types";
import { addDays, toStayDate } from "@/lib/analytics";

// ─── Organization ─────────────────────────────────────────────────────────────
export const DEMO_ORG = {
  id: "org-amicolola",
  name: "Grandview Resort & Lodge",
  slug: "amicalola-falls",
  plan: "pro" as const,
};

// ─── Team ─────────────────────────────────────────────────────────────────────
export const MOCK_PROFILES: Profile[] = [
  { id: "t1", organization_id: "org-amicolola", full_name: "Marcus Webb",    avatar_url: null, role: "technician", phone: "706-265-0101", is_available: false, created_at: "2024-01-10T00:00:00Z", updated_at: "2024-01-10T00:00:00Z" },
  { id: "t2", organization_id: "org-amicolola", full_name: "Priya Patel",    avatar_url: null, role: "technician", phone: "706-265-0102", is_available: true,  created_at: "2024-01-10T00:00:00Z", updated_at: "2024-01-10T00:00:00Z" },
  { id: "t3", organization_id: "org-amicolola", full_name: "James Okafor",   avatar_url: null, role: "technician", phone: "706-265-0103", is_available: true,  created_at: "2024-01-10T00:00:00Z", updated_at: "2024-01-10T00:00:00Z" },
  { id: "t4", organization_id: "org-amicolola", full_name: "Sofia Reyes",    avatar_url: null, role: "technician", phone: "706-265-0104", is_available: false, created_at: "2024-01-10T00:00:00Z", updated_at: "2024-01-10T00:00:00Z" },
  { id: "t5", organization_id: "org-amicolola", full_name: "Chen Wei",       avatar_url: null, role: "technician", phone: "706-265-0105", is_available: true,  created_at: "2024-01-10T00:00:00Z", updated_at: "2024-01-10T00:00:00Z" },
  { id: "m1", organization_id: "org-amicolola", full_name: "Sarah Mitchell", avatar_url: null, role: "manager",    phone: "706-265-0200", is_available: true,  created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "h1", organization_id: "org-amicolola", full_name: "Rosa Jiménez",   avatar_url: null, role: "housekeeping", phone: "706-265-0301", is_available: true,  created_at: "2024-01-05T00:00:00Z", updated_at: "2024-01-05T00:00:00Z" },
  { id: "h2", organization_id: "org-amicolola", full_name: "Grace Adeyemi",  avatar_url: null, role: "housekeeping", phone: "706-265-0302", is_available: true,  created_at: "2024-01-05T00:00:00Z", updated_at: "2024-01-05T00:00:00Z" },
  { id: "h3", organization_id: "org-amicolola", full_name: "Ana María Cruz", avatar_url: null, role: "housekeeping", phone: "706-265-0303", is_available: false, created_at: "2024-01-05T00:00:00Z", updated_at: "2024-01-05T00:00:00Z" },
];

/** Just the housekeepers — the pool the assignment picker draws from. */
export const MOCK_HOUSEKEEPERS: Profile[] = MOCK_PROFILES.filter((p) => p.role === "housekeeping");

// ─── Buildings ────────────────────────────────────────────────────────────────
export const MOCK_BUILDINGS: Building[] = [
  {
    id: "b1", organization_id: "org-amicolola",
    name: "Grandview Lodge",
    address: "1 Lakeshore Drive", city: "Lake Haven", state: "GA",
    type: "hotel", image_url: null,
    created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
    _floor_count: 3, _space_count: 57, _issue_count: 7,
  },
  {
    id: "b2", organization_id: "org-amicolola",
    name: "Pine Ridge Cabins",
    address: "1 Lakeshore Drive", city: "Lake Haven", state: "GA",
    type: "hotel", image_url: null,
    created_at: "2024-01-02T00:00:00Z", updated_at: "2024-01-02T00:00:00Z",
    _floor_count: 1, _space_count: 14, _issue_count: 2,
  },
  {
    id: "b3", organization_id: "org-amicolola",
    name: "Recreation Center",
    address: "1 Lakeshore Drive", city: "Lake Haven", state: "GA",
    type: "hotel", image_url: null,
    created_at: "2024-01-03T00:00:00Z", updated_at: "2024-01-03T00:00:00Z",
    _floor_count: 1, _space_count: 18, _issue_count: 1,
  },
];

// ─── Floors ───────────────────────────────────────────────────────────────────
export const MOCK_FLOORS: Floor[] = [
  { id: "f1", building_id: "b1", name: "Ground Floor",  level: 1, grid_cols: 14, grid_rows: 7, created_at: "2024-01-01T00:00:00Z" },
  { id: "f2", building_id: "b1", name: "Floor 2",       level: 2, grid_cols: 14, grid_rows: 7, created_at: "2024-01-01T00:00:00Z" },
  { id: "f3", building_id: "b1", name: "Floor 3",       level: 3, grid_cols: 14, grid_rows: 7, created_at: "2024-01-01T00:00:00Z" },
  { id: "f4", building_id: "b2", name: "Cabin Grounds", level: 1, grid_cols: 12, grid_rows: 6, created_at: "2024-01-02T00:00:00Z" },
  { id: "f5", building_id: "b3", name: "Main Level",    level: 1, grid_cols: 12, grid_rows: 6, created_at: "2024-01-03T00:00:00Z" },
];

// ─── Spaces — Lodge Ground Floor ─────────────────────────────────────────────
export const AMICOLOLA_SPACES: Space[] = [
  // ── Ground Floor ──────────────────────────────────────────────────────────
  // Lobby / Front of house
  { id: "s-lobby",     floor_id: "f1", name: "Main Lobby",        type: "lobby",       status: "operational",      position_x: 1,  position_y: 1, width: 3, height: 3, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-checkin",   floor_id: "f1", name: "Front Desk",        type: "office",      status: "operational",      position_x: 4,  position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-concierge", floor_id: "f1", name: "Concierge",         type: "office",      status: "operational",      position_x: 6,  position_y: 1, width: 2, height: 1, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-giftshop",  floor_id: "f1", name: "Gift Shop",         type: "retail",      status: "operational",      position_x: 8,  position_y: 1, width: 2, height: 1, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-atm",       floor_id: "f1", name: "ATM / Business Ctr",type: "utility",     status: "needs_maintenance",position_x: 10, position_y: 1, width: 2, height: 1, qr_code: null, notes: "ATM out of cash — service call placed", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-elevator1", floor_id: "f1", name: "Elevator Bank",     type: "elevator",    status: "operational",      position_x: 12, position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  // Dining
  { id: "s-restaurant",floor_id: "f1", name: "Maple St. Grille",  type: "restaurant",  status: "operational",      position_x: 1,  position_y: 4, width: 4, height: 3, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-kitchen",   floor_id: "f1", name: "Kitchen",           type: "kitchen",     status: "inspection_due",   position_x: 5,  position_y: 4, width: 2, height: 2, qr_code: null, notes: "Monthly health inspection due this week", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-bar",       floor_id: "f1", name: "Terrace Bar",       type: "bar",         status: "operational",      position_x: 6,  position_y: 2, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  // Back of house
  { id: "s-hskp-gnd",  floor_id: "f1", name: "Housekeeping Office",type: "housekeeping",status: "operational",     position_x: 7,  position_y: 4, width: 2, height: 1, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-maint",     floor_id: "f1", name: "Maintenance Shop",  type: "maintenance", status: "operational",      position_x: 7,  position_y: 5, width: 2, height: 1, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-mechanical",floor_id: "f1", name: "Mechanical Room",   type: "mechanical",  status: "needs_maintenance",position_x: 9,  position_y: 4, width: 2, height: 2, qr_code: null, notes: "HVAC unit 2 showing intermittent fault codes", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-loading",   floor_id: "f1", name: "Loading Dock",      type: "loading",     status: "operational",      position_x: 11, position_y: 4, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-laundry",   floor_id: "f1", name: "Laundry",           type: "utility",     status: "operational",      position_x: 13, position_y: 4, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-rest-m-1",  floor_id: "f1", name: "Restroom M",        type: "restroom",    status: "operational",      position_x: 5,  position_y: 6, width: 1, height: 1, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-rest-f-1",  floor_id: "f1", name: "Restroom F",        type: "restroom",    status: "cleaning_required",position_x: 6,  position_y: 6, width: 1, height: 1, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },

  // ── Floor 2 — Guest Rooms ─────────────────────────────────────────────────
  { id: "s-201", floor_id: "f2", name: "Room 201",  type: "guest_room", status: "operational",      position_x: 1,  position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-202", floor_id: "f2", name: "Room 202",  type: "guest_room", status: "cleaning_required",position_x: 3,  position_y: 1, width: 2, height: 2, qr_code: null, notes: "Checked out 11am — needs full turnover", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-203", floor_id: "f2", name: "Room 203",  type: "guest_room", status: "operational",      position_x: 5,  position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-204", floor_id: "f2", name: "Room 204",  type: "guest_room", status: "needs_maintenance",position_x: 7,  position_y: 1, width: 2, height: 2, qr_code: null, notes: "Guest reported AC not cooling adequately", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-205", floor_id: "f2", name: "Room 205",  type: "guest_room", status: "operational",      position_x: 9,  position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-206", floor_id: "f2", name: "Room 206",  type: "guest_room", status: "cleaning_required",position_x: 11, position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-207", floor_id: "f2", name: "Room 207",  type: "guest_room", status: "operational",      position_x: 13, position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-208", floor_id: "f2", name: "Room 208",  type: "guest_room", status: "operational",      position_x: 1,  position_y: 3, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-209", floor_id: "f2", name: "Room 209",  type: "guest_room", status: "offline",          position_x: 3,  position_y: 3, width: 2, height: 2, qr_code: null, notes: "Out of service — bathroom renovation in progress", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-210", floor_id: "f2", name: "Room 210",  type: "guest_room", status: "operational",      position_x: 5,  position_y: 3, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-211", floor_id: "f2", name: "Room 211",  type: "guest_room", status: "operational",      position_x: 7,  position_y: 3, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-212", floor_id: "f2", name: "Room 212",  type: "guest_room", status: "inspection_due",   position_x: 9,  position_y: 3, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-213", floor_id: "f2", name: "Room 213",  type: "guest_room", status: "operational",      position_x: 11, position_y: 3, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-214", floor_id: "f2", name: "Falls Suite",type: "suite",     status: "operational",      position_x: 13, position_y: 3, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-hskp-2",floor_id: "f2", name: "Housekeeping Closet",type: "housekeeping", status: "operational", position_x: 7, position_y: 5, width: 1, height: 1, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-ice-2", floor_id: "f2", name: "Ice / Vending",      type: "utility",     status: "operational", position_x: 8, position_y: 5, width: 1, height: 1, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },

  // ── Floor 3 — Conference & Premium ───────────────────────────────────────
  { id: "s-301", floor_id: "f3", name: "Room 301",   type: "guest_room", status: "operational",      position_x: 1,  position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-302", floor_id: "f3", name: "Room 302",   type: "guest_room", status: "operational",      position_x: 3,  position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-303", floor_id: "f3", name: "Room 303",   type: "guest_room", status: "cleaning_required",position_x: 5,  position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-304", floor_id: "f3", name: "Room 304",   type: "guest_room", status: "operational",      position_x: 7,  position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-305", floor_id: "f3", name: "Room 305",   type: "guest_room", status: "operational",      position_x: 9,  position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-306", floor_id: "f3", name: "Room 306",   type: "guest_room", status: "emergency",        position_x: 11, position_y: 1, width: 2, height: 2, qr_code: null, notes: "Burst pipe under sink — water shut off to room", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-307", floor_id: "f3", name: "Summit Suite",type: "suite",     status: "operational",      position_x: 13, position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-conf-a",floor_id: "f3", name: "Blue Ridge Conf. Room", type: "conference", status: "operational", position_x: 1, position_y: 3, width: 4, height: 3, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-conf-b",floor_id: "f3", name: "Dahlonega Boardroom",   type: "conference", status: "operational", position_x: 5, position_y: 3, width: 3, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-fitness",floor_id: "f3", name: "Fitness Center",        type: "fitness",   status: "operational", position_x: 8, position_y: 3, width: 3, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "s-spa",   floor_id: "f3", name: "Appalachian Spa",        type: "spa",       status: "operational", position_x: 11, position_y: 3, width: 4, height: 2, qr_code: null, notes: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },

  // ── Pine Ridge Cabins ──────────────────────────────────────────────────
  { id: "s-c1", floor_id: "f4", name: "Cabin 1 — Bear Creek",  type: "cabin", status: "operational",      position_x: 1, position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-02T00:00:00Z", updated_at: "2024-01-02T00:00:00Z" },
  { id: "s-c2", floor_id: "f4", name: "Cabin 2 — Deer Run",    type: "cabin", status: "cleaning_required",position_x: 4, position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-02T00:00:00Z", updated_at: "2024-01-02T00:00:00Z" },
  { id: "s-c3", floor_id: "f4", name: "Cabin 3 — Eagle Ridge", type: "cabin", status: "operational",      position_x: 7, position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-02T00:00:00Z", updated_at: "2024-01-02T00:00:00Z" },
  { id: "s-c4", floor_id: "f4", name: "Cabin 4 — Fox Hollow",  type: "cabin", status: "operational",      position_x: 10, position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-02T00:00:00Z", updated_at: "2024-01-02T00:00:00Z" },
  { id: "s-c5", floor_id: "f4", name: "Cabin 5 — Hawk Nest",   type: "cabin", status: "needs_maintenance",position_x: 1, position_y: 4, width: 2, height: 2, qr_code: null, notes: "Deck boards rotting — trip hazard", created_at: "2024-01-02T00:00:00Z", updated_at: "2024-01-02T00:00:00Z" },
  { id: "s-c6", floor_id: "f4", name: "Cabin 6 — Ironwood",    type: "cabin", status: "operational",      position_x: 4, position_y: 4, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-02T00:00:00Z", updated_at: "2024-01-02T00:00:00Z" },
  { id: "s-c7", floor_id: "f4", name: "Cabin 7 — Juniper",     type: "cabin", status: "operational",      position_x: 7, position_y: 4, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-02T00:00:00Z", updated_at: "2024-01-02T00:00:00Z" },
  { id: "s-c8", floor_id: "f4", name: "Cabin 8 — Kudzu Knoll", type: "cabin", status: "offline",          position_x: 10, position_y: 4, width: 2, height: 2, qr_code: null, notes: "Storm damage — awaiting insurance adjuster", created_at: "2024-01-02T00:00:00Z", updated_at: "2024-01-02T00:00:00Z" },

  // ── Guest Services ────────────────────────────────────────────────────────
  { id: "s-pool",    floor_id: "f5", name: "Outdoor Pool",      type: "pool",        status: "operational",      position_x: 1, position_y: 1, width: 3, height: 3, qr_code: null, notes: null, created_at: "2024-01-03T00:00:00Z", updated_at: "2024-01-03T00:00:00Z" },
  { id: "s-trailhd", floor_id: "f5", name: "Trail Head Office", type: "office",      status: "operational",      position_x: 4, position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-03T00:00:00Z", updated_at: "2024-01-03T00:00:00Z" },
  { id: "s-attrail", floor_id: "f5", name: "Pine Ridge Trail", type: "trail",       status: "inspection_due",   position_x: 6, position_y: 1, width: 2, height: 2, qr_code: null, notes: "Seasonal inspection before heavy traffic season", created_at: "2024-01-03T00:00:00Z", updated_at: "2024-01-03T00:00:00Z" },
  { id: "s-visitctr",floor_id: "f5", name: "Visitor Center",    type: "lobby",       status: "operational",      position_x: 8, position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-03T00:00:00Z", updated_at: "2024-01-03T00:00:00Z" },
  { id: "s-picnic",  floor_id: "f5", name: "Picnic Pavilion",   type: "outdoor",     status: "operational",      position_x: 10, position_y: 1, width: 2, height: 2, qr_code: null, notes: null, created_at: "2024-01-03T00:00:00Z", updated_at: "2024-01-03T00:00:00Z" },
];

// ─── Work Orders ──────────────────────────────────────────────────────────────
export const AMICOLOLA_WORK_ORDERS: WorkOrder[] = [
  {
    id: "wo-1", organization_id: "org-amicolola", space_id: "s-306", asset_id: null,
    created_by: "m1", assigned_to: "t1",
    title: "Burst Pipe — Room 306",
    description: "Guest reported water on bathroom floor. Pipe under sink has failed. Water to room is shut off. Guest relocated to Room 308.",
    status: "in_progress", priority: "critical", category: "plumbing",
    photos: [], due_date: new Date().toISOString(), completed_at: null,
    created_at: new Date(Date.now() - 90 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 60000).toISOString(),
    assignee: MOCK_PROFILES[0], creator: MOCK_PROFILES[5], _comment_count: 3,
  },
  {
    id: "wo-2", organization_id: "org-amicolola", space_id: "s-204", asset_id: null,
    created_by: "m1", assigned_to: "t2",
    title: "AC Not Cooling — Room 204",
    description: "Guest called front desk reporting room not reaching set temperature. Thermostat showing 78°F despite 68°F setting.",
    status: "assigned", priority: "high", category: "hvac",
    photos: [], due_date: null, completed_at: null,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1.5 * 3600000).toISOString(),
    assignee: MOCK_PROFILES[1], creator: MOCK_PROFILES[5], _comment_count: 1,
  },
  {
    id: "wo-3", organization_id: "org-amicolola", space_id: "s-mechanical", asset_id: null,
    created_by: "t3", assigned_to: "t3",
    title: "HVAC Unit 2 Fault Code — Mechanical Room",
    description: "BAS showing fault code E-14 on HVAC unit 2. Unit cycling on and off. Running diagnostics. May need capacitor replacement.",
    status: "in_progress", priority: "high", category: "hvac",
    photos: [], due_date: null, completed_at: null,
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    assignee: MOCK_PROFILES[2], creator: MOCK_PROFILES[2], _comment_count: 2,
  },
  {
    id: "wo-4", organization_id: "org-amicolola", space_id: "s-c5", asset_id: null,
    created_by: "m1", assigned_to: "t4",
    title: "Deck Boards Rotting — Cabin 5",
    description: "Multiple deck boards showing significant rot. Two boards are cracked through — trip hazard. Cabin blocked for new bookings until repaired.",
    status: "waiting_parts", priority: "high", category: "carpentry",
    photos: [], due_date: null, completed_at: null,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    assignee: MOCK_PROFILES[3], creator: MOCK_PROFILES[5], _comment_count: 2,
  },
  {
    id: "wo-5", organization_id: "org-amicolola", space_id: "s-kitchen", asset_id: null,
    created_by: "m1", assigned_to: null,
    title: "Monthly Health Inspection — Maple St. Grille Kitchen",
    description: "Monthly food service inspection due this week. All equipment, storage, and prep surfaces need to be inspection-ready.",
    status: "open", priority: "medium", category: "inspection",
    photos: [], due_date: new Date(Date.now() + 4 * 86400000).toISOString(), completed_at: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    assignee: undefined, creator: MOCK_PROFILES[5], _comment_count: 0,
  },
  {
    id: "wo-6", organization_id: "org-amicolola", space_id: "s-attrail", asset_id: null,
    created_by: "m1", assigned_to: "t5",
    title: "Pre-Season Trail Inspection — Pine Ridge Trail",
    description: "Annual spring inspection before peak hiking season. Check all signage, water bars, blowdowns, and footbridge stability over the creek.",
    status: "open", priority: "medium", category: "grounds",
    photos: [], due_date: new Date(Date.now() + 7 * 86400000).toISOString(), completed_at: null,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    assignee: MOCK_PROFILES[4], creator: MOCK_PROFILES[5], _comment_count: 0,
  },
  {
    id: "wo-7", organization_id: "org-amicolola", space_id: "s-atm", asset_id: null,
    created_by: "t5", assigned_to: "t5",
    title: "ATM Out of Cash — Business Center",
    description: "ATM machine empty. Armored car service called — ETA 48 hours. Sign placed on machine.",
    status: "waiting_parts", priority: "low", category: "other",
    photos: [], due_date: null, completed_at: null,
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    assignee: MOCK_PROFILES[4], creator: MOCK_PROFILES[4], _comment_count: 0,
  },
];

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export const MOCK_STATS: DashboardStats = {
  active_issues: 7,
  operational_percent: 84,
  technicians_online: 5,
  critical_alerts: 1,
  completed_today: 4,
  avg_resolution_hours: 3.8,
};

// ─── Activity Feed ────────────────────────────────────────────────────────────
export const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "a1", type: "work_order_created",  title: "Emergency issue created",  description: "Burst pipe in Room 306 — guest relocated",            user: { name: "Sarah Mitchell" }, timestamp: new Date(Date.now() - 90 * 60000).toISOString(), meta: { priority: "critical" } },
  { id: "a2", type: "tech_assigned",       title: "Technician dispatched",    description: "Marcus Webb assigned to Room 306 plumbing emergency",  user: { name: "Sarah Mitchell" }, timestamp: new Date(Date.now() - 85 * 60000).toISOString() },
  { id: "a3", type: "status_changed",      title: "Room status changed",      description: "Room 202 marked Cleaning Required via RoomMaster sync", user: { name: "RoomMaster Sync" }, timestamp: new Date(Date.now() - 45 * 60000).toISOString() },
  { id: "a4", type: "comment_added",       title: "Update on Room 306",       description: "Marcus Webb: pipe isolated, drywall assessment next",   user: { name: "Marcus Webb" },    timestamp: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: "a5", type: "work_order_created",  title: "New work order",           description: "AC complaint filed for Room 204",                      user: { name: "Front Desk" },     timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: "a6", type: "status_changed",      title: "Cabin marked offline",     description: "Cabin 8 set Offline — storm damage assessment",        user: { name: "Sarah Mitchell" }, timestamp: new Date(Date.now() - 6 * 3600000).toISOString() },
  { id: "a7", type: "work_order_updated",  title: "Work order completed",     description: "Pool chemical balance inspection passed — all clear",   user: { name: "Chen Wei" },       timestamp: new Date(Date.now() - 8 * 3600000).toISOString() },
];

// ─── Trend data ───────────────────────────────────────────────────────────────
export const MOCK_TREND_DATA = [
  { day: "Mon", opened: 5, closed: 4, critical: 0 },
  { day: "Tue", opened: 8, closed: 6, critical: 1 },
  { day: "Wed", opened: 4, closed: 7, critical: 0 },
  { day: "Thu", opened: 10, closed: 5, critical: 2 },
  { day: "Fri", opened: 7, closed: 9, critical: 1 },
  { day: "Sat", opened: 6, closed: 8, critical: 0 },
  { day: "Sun", opened: 9, closed: 6, critical: 1 },
];

// ─── Housekeeping assignments ────────────────────────────────────────────────
// Applied as a post-pass rather than inline so the room definitions above stay
// readable — the board is a daily thing, not a property of the room itself.
// Each board carries its own mid-shift state, so the progress bars show real
// movement rather than three identical 100% columns.
const HOUSEKEEPER_BOARDS: Record<string, [string, HousekeepingStatus][]> = {
  h1: [["s-201", "ready"], ["s-202", "cleaned"], ["s-203", "in_progress"], ["s-204", "dirty"], ["s-205", "dirty"]],
  h2: [["s-206", "ready"], ["s-207", "ready"], ["s-208", "in_progress"], ["s-209", "dirty"], ["s-210", "dirty"]],
  h3: [["s-301", "cleaned"], ["s-302", "dirty"], ["s-303", "dirty"]],
};

for (const [housekeeperId, board] of Object.entries(HOUSEKEEPER_BOARDS)) {
  const who = MOCK_PROFILES.find((p) => p.id === housekeeperId);
  for (const [sid, status] of board) {
    const space = AMICOLOLA_SPACES.find((s) => s.id === sid);
    if (!space || !who) continue;
    space.housekeeper_id = housekeeperId;
    space.housekeeping_assigned_at = new Date(Date.now() - 7 * 3600000).toISOString();
    space.housekeeper = { id: who.id, full_name: who.full_name, avatar_url: who.avatar_url };
    space.housekeeping_status = status;
  }
}

// A few unassigned rooms still need doing — otherwise the board reads as a
// property with nothing left to clean, which no hotel has ever been.
for (const [sid, status] of [
  ["s-211", "dirty"], ["s-212", "dirty"], ["s-304", "in_progress"], ["s-306", "dirty"],
] as [string, HousekeepingStatus][]) {
  const space = AMICOLOLA_SPACES.find((s) => s.id === sid);
  if (space) space.housekeeping_status = status;
}

// ─── Occupancy history & forecast ────────────────────────────────────────────
// 45 settled nights + tonight + 14 forecast nights. Weekends run hotter and
// rates rise with them, so the trend line and ADR read like a real resort.
function buildOccupancy(): OccupancySnapshot[] {
  const today = toStayDate(new Date());
  const total = 57;
  const out: OccupancySnapshot[] = [];

  for (let offset = -45; offset <= 14; offset++) {
    const stay_date = addDays(today, offset);
    const dow = new Date(`${stay_date}T12:00:00Z`).getUTCDay();
    const weekend = dow === 5 || dow === 6;

    // Deterministic wobble so the series is stable across reloads.
    const seed = Number(stay_date.slice(8, 10));
    const base = weekend ? 0.86 : 0.62;
    const pct = Math.min(0.98, base + ((seed % 5) - 2) * 0.03);

    const oos = offset === 0 ? 2 : offset < 0 ? seed % 3 : 1;
    const sellable = total - oos;
    const occupied = Math.round(sellable * pct);

    out.push({
      id: `occ-${stay_date}`,
      organization_id: "org-amicolola",
      building_id: "b1",
      stay_date,
      rooms_total: total,
      rooms_occupied: occupied,
      rooms_out_of_service: oos,
      arrivals: Math.max(0, Math.round(occupied * 0.34) + (seed % 3)),
      departures: Math.max(0, Math.round(occupied * 0.31) + (seed % 2)),
      adr_cents: weekend ? 27900 : 19400,
      is_actual: offset < 0,
      created_at: `${stay_date}T00:00:00Z`,
      updated_at: `${stay_date}T00:00:00Z`,
    });
  }
  return out;
}

export const MOCK_OCCUPANCY: OccupancySnapshot[] = buildOccupancy();

// ─── Food & Beverage ─────────────────────────────────────────────────────────
export const MOCK_FNB_OUTLETS: FnbOutlet[] = [
  {
    id: "o1", organization_id: "org-amicolola", space_id: "s-restaurant",
    name: "Maple St. Grille", kind: "restaurant", is_open: true,
    opens_at: "06:30", closes_at: "22:00", seats: 96,
    notes: "Main dining room — breakfast buffet through dinner service.",
    created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "o2", organization_id: "org-amicolola", space_id: "s-bar",
    name: "Terrace Bar", kind: "bar", is_open: true,
    opens_at: "16:00", closes_at: "01:00", seats: 44,
    notes: "Outdoor terrace; closes early in bad weather.",
    created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "o3", organization_id: "org-amicolola", space_id: "s-lobby",
    name: "Lobby Espresso Bar", kind: "cafe", is_open: true,
    opens_at: "06:00", closes_at: "14:00", seats: 12, notes: null,
    created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "o4", organization_id: "org-amicolola", space_id: null,
    name: "In-Room Dining", kind: "room_service", is_open: true,
    opens_at: "06:00", closes_at: "23:00", seats: null, notes: null,
    created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "o5", organization_id: "org-amicolola", space_id: "s-kitchen",
    name: "Banquet Kitchen", kind: "banquet_kitchen", is_open: false,
    opens_at: null, closes_at: null, seats: null,
    notes: "Fires only on event days — see the Conferences & Events board.",
    created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
  },
];

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();

export const MOCK_FNB_INVENTORY: FnbInventoryItem[] = [
  { id: "i1",  organization_id: "org-amicolola", outlet_id: "o1", name: "Whole milk",          category: "dairy",     unit: "gallon", on_hand: 3,  par_level: 12, unit_cost_cents: 480,  supplier: "Sysco",           last_counted_at: hoursAgo(20), created_at: "2024-01-01T00:00:00Z", updated_at: hoursAgo(20) },
  { id: "i2",  organization_id: "org-amicolola", outlet_id: "o1", name: "Eggs, large",         category: "dairy",     unit: "case",   on_hand: 2,  par_level: 6,  unit_cost_cents: 3200, supplier: "Sysco",           last_counted_at: hoursAgo(20), created_at: "2024-01-01T00:00:00Z", updated_at: hoursAgo(20) },
  { id: "i3",  organization_id: "org-amicolola", outlet_id: "o1", name: "Coffee beans, house", category: "dry goods", unit: "lb",     on_hand: 18, par_level: 25, unit_cost_cents: 1150, supplier: "Counter Culture", last_counted_at: hoursAgo(44), created_at: "2024-01-01T00:00:00Z", updated_at: hoursAgo(44) },
  { id: "i4",  organization_id: "org-amicolola", outlet_id: "o1", name: "Romaine hearts",      category: "produce",   unit: "case",   on_hand: 1,  par_level: 4,  unit_cost_cents: 2800, supplier: "Local Produce",   last_counted_at: hoursAgo(19), created_at: "2024-01-01T00:00:00Z", updated_at: hoursAgo(19) },
  { id: "i5",  organization_id: "org-amicolola", outlet_id: "o1", name: "Ribeye, 12oz",        category: "protein",   unit: "each",   on_hand: 26, par_level: 20, unit_cost_cents: 1420, supplier: "Halperns",        last_counted_at: hoursAgo(70), created_at: "2024-01-01T00:00:00Z", updated_at: hoursAgo(70) },
  { id: "i6",  organization_id: "org-amicolola", outlet_id: "o1", name: "Butter, unsalted",    category: "dairy",     unit: "lb",     on_hand: 22, par_level: 15, unit_cost_cents: 520,  supplier: "Sysco",           last_counted_at: hoursAgo(44), created_at: "2024-01-01T00:00:00Z", updated_at: hoursAgo(44) },
  { id: "i7",  organization_id: "org-amicolola", outlet_id: "o2", name: "Tito's Vodka 1L",     category: "liquor",    unit: "bottle", on_hand: 4,  par_level: 9,  unit_cost_cents: 2400, supplier: "Empire",          last_counted_at: hoursAgo(92), created_at: "2024-01-01T00:00:00Z", updated_at: hoursAgo(92) },
  { id: "i8",  organization_id: "org-amicolola", outlet_id: "o2", name: "Tonic water",         category: "mixer",     unit: "case",   on_hand: 7,  par_level: 6,  unit_cost_cents: 1900, supplier: "Empire",          last_counted_at: hoursAgo(92), created_at: "2024-01-01T00:00:00Z", updated_at: hoursAgo(92) },
  { id: "i9",  organization_id: "org-amicolola", outlet_id: "o2", name: "Limes",               category: "produce",   unit: "lb",     on_hand: 2,  par_level: 8,  unit_cost_cents: 240,  supplier: "Local Produce",   last_counted_at: hoursAgo(19), created_at: "2024-01-01T00:00:00Z", updated_at: hoursAgo(19) },
  { id: "i10", organization_id: "org-amicolola", outlet_id: "o3", name: "Oat milk",            category: "dairy",     unit: "case",   on_hand: 1,  par_level: 5,  unit_cost_cents: 4100, supplier: "Sysco",           last_counted_at: hoursAgo(26), created_at: "2024-01-01T00:00:00Z", updated_at: hoursAgo(26) },
  { id: "i11", organization_id: "org-amicolola", outlet_id: "o3", name: "Paper cups, 12oz",    category: "supplies",  unit: "case",   on_hand: 9,  par_level: 4,  unit_cost_cents: 3600, supplier: "WebstaurantStore", last_counted_at: hoursAgo(26), created_at: "2024-01-01T00:00:00Z", updated_at: hoursAgo(26) },
];

// Mirror the `outlet:fnb_outlets(id, name)` join Supabase returns, so demo mode
// renders the same shape the real query does instead of a column of em dashes.
for (const item of MOCK_FNB_INVENTORY) {
  const outlet = MOCK_FNB_OUTLETS.find((o) => o.id === item.outlet_id);
  item.outlet = outlet ? { id: outlet.id, name: outlet.name } : null;
}

export const MOCK_FNB_TEMP_LOGS: FnbTempLog[] = [
  { id: "tl1", organization_id: "org-amicolola", outlet_id: "o1", asset_id: null, equipment_label: "Walk-in cooler",      temp_f: 38.0,  min_f: 33,  max_f: 41,  in_range: true,  logged_by: "h1", note: null, created_at: hoursAgo(7),  logger: { id: "h1", full_name: "Rosa Jiménez" } },
  { id: "tl2", organization_id: "org-amicolola", outlet_id: "o1", asset_id: null, equipment_label: "Walk-in freezer",     temp_f: -2.0,  min_f: -10, max_f: 5,   in_range: true,  logged_by: "h1", note: null, created_at: hoursAgo(7),  logger: { id: "h1", full_name: "Rosa Jiménez" } },
  { id: "tl3", organization_id: "org-amicolola", outlet_id: "o1", asset_id: null, equipment_label: "Line reach-in",       temp_f: 44.5,  min_f: 33,  max_f: 41,  in_range: false, logged_by: "h2", note: "Door seal worn — work order filed.", created_at: hoursAgo(3), logger: { id: "h2", full_name: "Grace Adeyemi" } },
  { id: "tl4", organization_id: "org-amicolola", outlet_id: "o2", asset_id: null, equipment_label: "Bar cooler",          temp_f: 39.0,  min_f: 33,  max_f: 41,  in_range: true,  logged_by: "h2", note: null, created_at: hoursAgo(2),  logger: { id: "h2", full_name: "Grace Adeyemi" } },
  { id: "tl5", organization_id: "org-amicolola", outlet_id: "o1", asset_id: null, equipment_label: "Hot line steam well", temp_f: 152.0, min_f: 140, max_f: 180, in_range: true,  logged_by: "h1", note: null, created_at: hoursAgo(1),  logger: { id: "h1", full_name: "Rosa Jiménez" } },
];

// ─── Banquets ────────────────────────────────────────────────────────────────
const dayAt = (offsetDays: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const MOCK_BANQUET_EVENTS: BanquetEvent[] = [
  {
    id: "e1", organization_id: "org-amicolola", space_id: "s-conf-a",
    name: "Lake Haven Chamber Luncheon", client_name: "Lake Haven Chamber of Commerce",
    client_email: "events@lakehavenchamber.org", client_phone: "706-265-1400",
    status: "in_progress", setup_style: "banquet_rounds", headcount: 90,
    starts_at: dayAt(0, 11), ends_at: dayAt(0, 14),
    setup_starts_at: dayAt(0, 8), teardown_ends_at: dayAt(0, 15),
    quoted_cents: 450000, deposit_paid: true,
    av_needs: ["projector", "lectern", "mics: 2"],
    catering_notes: "Plated lunch — 6 vegetarian, 2 gluten-free.", notes: null,
    created_by: "m1", created_at: "2026-06-01T00:00:00Z", updated_at: hoursAgo(2),
    space: { id: "s-conf-a", name: "Blue Ridge Conf. Room" },
  },
  {
    id: "e2", organization_id: "org-amicolola", space_id: "s-conf-a",
    name: "Hartwell / Boyd Wedding Reception", client_name: "Alicia Hartwell",
    client_email: "alicia.hartwell@example.com", client_phone: "404-555-0182",
    status: "confirmed", setup_style: "reception", headcount: 140,
    starts_at: dayAt(9, 17), ends_at: dayAt(9, 23),
    setup_starts_at: dayAt(9, 12), teardown_ends_at: dayAt(10, 1),
    quoted_cents: 1280000, deposit_paid: true,
    av_needs: ["dance floor", "uplighting", "wireless mic"],
    catering_notes: "Buffet; late-night snack service at 10pm.", notes: "Cake delivery 3pm.",
    created_by: "m1", created_at: "2026-03-14T00:00:00Z", updated_at: "2026-07-02T00:00:00Z",
    space: { id: "s-conf-a", name: "Blue Ridge Conf. Room" },
  },
  {
    id: "e3", organization_id: "org-amicolola", space_id: "s-conf-b",
    name: "Northstar Logistics — Q3 Sales Offsite", client_name: "Northstar Logistics",
    client_email: "ops@northstarlog.example.com", client_phone: null,
    status: "confirmed", setup_style: "classroom", headcount: 45,
    starts_at: dayAt(16, 8), ends_at: dayAt(16, 17),
    setup_starts_at: dayAt(16, 6), teardown_ends_at: dayAt(16, 18),
    quoted_cents: 620000, deposit_paid: false,
    av_needs: ["projector", "flip charts", "power drops"],
    catering_notes: "Continental breakfast + working lunch.", notes: null,
    created_by: "m1", created_at: "2026-05-20T00:00:00Z", updated_at: "2026-07-10T00:00:00Z",
    space: { id: "s-conf-b", name: "Dahlonega Boardroom" },
  },
  {
    id: "e4", organization_id: "org-amicolola", space_id: "s-conf-a",
    name: "Gaines 60th Birthday", client_name: "Marcus Gaines",
    client_email: "mgaines@example.com", client_phone: "706-555-0143",
    status: "tentative", setup_style: "reception", headcount: 60,
    starts_at: dayAt(24, 18), ends_at: dayAt(24, 22),
    setup_starts_at: null, teardown_ends_at: null,
    quoted_cents: 310000, deposit_paid: false,
    av_needs: ["bluetooth audio"],
    catering_notes: "Passed apps, cash bar.", notes: "Holding space until 8/15.",
    created_by: "m1", created_at: "2026-07-11T00:00:00Z", updated_at: "2026-07-11T00:00:00Z",
    space: { id: "s-conf-a", name: "Blue Ridge Conf. Room" },
  },
  {
    id: "e5", organization_id: "org-amicolola", space_id: "s-conf-b",
    name: "Regional Board Meeting", client_name: "Appalachian Health Partners",
    client_email: null, client_phone: null,
    status: "inquiry", setup_style: "boardroom", headcount: 14,
    starts_at: dayAt(31, 9), ends_at: dayAt(31, 12),
    setup_starts_at: null, teardown_ends_at: null,
    quoted_cents: null, deposit_paid: false,
    av_needs: ["video conferencing"], catering_notes: null, notes: null,
    created_by: "m1", created_at: hoursAgo(30), updated_at: hoursAgo(30),
    space: { id: "s-conf-b", name: "Dahlonega Boardroom" },
  },
  {
    id: "e6", organization_id: "org-amicolola", space_id: "s-conf-a",
    name: "Whitfield Retirement Dinner", client_name: "Whitfield & Sons",
    client_email: "hr@whitfieldsons.example.com", client_phone: null,
    status: "completed", setup_style: "banquet_rounds", headcount: 72,
    starts_at: dayAt(-12, 18), ends_at: dayAt(-12, 22),
    setup_starts_at: dayAt(-12, 14), teardown_ends_at: dayAt(-12, 23),
    quoted_cents: 540000, deposit_paid: true,
    av_needs: ["lectern", "mics: 1"], catering_notes: "Three-course plated.", notes: null,
    created_by: "m1", created_at: "2026-04-02T00:00:00Z", updated_at: dayAt(-12, 23),
    space: { id: "s-conf-a", name: "Blue Ridge Conf. Room" },
  },
];

// Legacy aliases
export const MOCK_SPACES = AMICOLOLA_SPACES;
export const MOCK_WORK_ORDERS = AMICOLOLA_WORK_ORDERS;
