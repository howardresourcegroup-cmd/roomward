"use client";

// Client-side Supabase data access. Every query runs with the logged-in
// user's session, so Row Level Security automatically scopes results to
// their organization. No org filtering needed in the queries themselves.

import { createClient } from "@/lib/supabase/client";
import { computeDashboardStats } from "@/lib/data/stats";
import { deriveSpaceStatusFromWorkOrder } from "@/lib/work-orders/status";
import type {
  Building, Floor, Space, WorkOrder, Profile, Channel, Message, Asset,
  SpaceStatus, HousekeepingStatus, WorkOrderStatus, WorkOrderPriority, AssetStatus, DashboardStats,
  AuditLog, Announcement,
} from "@/types";

const sb = () => createClient();

// ─── Buildings ────────────────────────────────────────────────────────────────
export async function fetchBuildings(): Promise<Building[]> {
  const supabase = sb();
  // Run all three queries in parallel instead of waterfalling
  const [{ data: buildings, error }, { data: floors }, { data: spaces }] = await Promise.all([
    supabase.from("buildings").select("*").order("created_at"),
    supabase.from("floors").select("id, building_id"),
    supabase.from("spaces").select("id, floor_id, status"),
  ]);
  if (error) throw error;

  return (buildings ?? []).map((b) => {
    const bFloors = (floors ?? []).filter((f) => f.building_id === b.id);
    const floorIds = bFloors.map((f) => f.id);
    const bSpaces = (spaces ?? []).filter((s) => floorIds.includes(s.floor_id));
    return {
      ...b,
      _floor_count: bFloors.length,
      _space_count: bSpaces.length,
      _issue_count: bSpaces.filter((s) => s.status !== "operational").length,
      _emergency_count: bSpaces.filter((s) => s.status === "emergency").length,
    } as Building;
  });
}

export async function fetchBuilding(id: string): Promise<Building | null> {
  const { data, error } = await sb().from("buildings").select("*").eq("id", id).single();
  if (error) return null;
  return data as Building;
}

export async function fetchOrganization() {
  const supabase = sb();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!me?.organization_id) return null;
  const { data } = await supabase.from("organizations").select("*").eq("id", me.organization_id).single();
  return data;
}

export async function updateOrganization(patch: { name?: string }) {
  const supabase = sb();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("organization_id").eq("id", user!.id).single();
  const { error } = await supabase.from("organizations").update(patch).eq("id", me!.organization_id);
  if (error) throw error;
}

export async function createBuilding(input: {
  name: string;
  address: string;
  city: string;
  state: string;
  type: string;
}): Promise<Building> {
  const supabase = sb();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: me } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  const { data, error } = await supabase
    .from("buildings")
    .insert({ ...input, organization_id: me?.organization_id })
    .select("*").single();
  if (error) throw error;
  return data as Building;
}

export async function updateBuilding(id: string, patch: { name?: string; address?: string; city?: string; state?: string; type?: string }): Promise<void> {
  const { error } = await sb().from("buildings").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteBuilding(id: string): Promise<void> {
  const { error } = await sb().from("buildings").delete().eq("id", id);
  if (error) throw error;
}

// Smart setup: create a building + floors + auto-generated guest rooms in one shot.
// Rooms are typed as guest_room, given a starting housekeeping status, and grid-positioned
// for the floor plan — so they flow into the floor plan, housekeeping board, and work orders
// off this single definition. This is the "define once, works everywhere" entry point.
export async function setupBuilding(input: {
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  floors: number[]; // room count per floor, e.g. [14, 10, 8] — supports uneven floors
}): Promise<Building> {
  const supabase = sb();
  const building = await createBuilding({
    name: input.name, type: input.type, address: input.address, city: input.city, state: input.state,
  });

  const perRow = 7; // rooms per row on the floor-plan grid
  for (let f = 0; f < input.floors.length; f++) {
    const level = f + 1;
    const roomsOnFloor = input.floors[f];
    const floor = await createFloor({
      building_id: building.id, name: `Floor ${level}`, level,
      grid_cols: 16, grid_rows: Math.max(8, Math.ceil(roomsOnFloor / perRow) * 2 + 2),
    });
    const rooms = Array.from({ length: roomsOnFloor }, (_, r) => {
      // A realistic starting mix so the property is alive on day one (real PMS sync overrides this).
      const n = level * 100 + (r + 1);
      const occupancy = r % 4 === 0 ? "occupied" : r % 7 === 3 ? "arriving" : r % 11 === 5 ? "departing" : "vacant";
      const housekeeping_status =
        occupancy === "occupied" ? "ready"
        : occupancy === "departing" ? "dirty"
        : r % 5 === 2 ? "dirty"
        : r % 6 === 4 ? "in_progress"
        : "ready";
      return {
        floor_id: floor.id,
        name: `Room ${n}`,
        type: "guest_room",
        status: "operational" as const,
        housekeeping_status,
        occupancy,
        position_x: (r % perRow) * 2 + 1,
        position_y: Math.floor(r / perRow) * 2 + 1,
        width: 2, height: 2,
      };
    });
    if (rooms.length) {
      const { error } = await supabase.from("spaces").insert(rooms);
      if (error) throw error;
    }
  }
  return building;
}

export async function fetchFloors(buildingId: string): Promise<Floor[]> {
  const { data, error } = await sb()
    .from("floors").select("*").eq("building_id", buildingId).order("level");
  if (error) throw error;
  return (data ?? []) as Floor[];
}

// ─── Spaces ───────────────────────────────────────────────────────────────────
export async function fetchSpacesForBuilding(buildingId: string): Promise<Space[]> {
  const supabase = sb();
  const { data: floors } = await supabase.from("floors").select("id").eq("building_id", buildingId);
  const floorIds = (floors ?? []).map((f) => f.id);
  if (!floorIds.length) return [];
  const { data, error } = await supabase
    .from("spaces").select("*").in("floor_id", floorIds).order("position_y").order("position_x");
  if (error) throw error;
  return (data ?? []) as Space[];
}

export async function fetchSpace(id: string): Promise<Space | null> {
  const { data } = await sb().from("spaces").select("*").eq("id", id).single();
  return (data as Space) ?? null;
}

export async function updateSpaceStatus(spaceId: string, status: SpaceStatus): Promise<void> {
  const { error } = await sb().from("spaces").update({ status }).eq("id", spaceId);
  if (error) throw error;
}

// ─── Housekeeping ─────────────────────────────────────────────────────────────
export async function fetchHousekeepingRooms(): Promise<Space[]> {
  const { data, error } = await sb()
    .from("spaces")
    .select("*, floor:floors(name, building:buildings(name))")
    .in("type", ["guest_room", "suite", "cabin"])
    .order("name");
  if (error) throw error;
  return (data ?? []) as unknown as Space[];
}

export async function updateHousekeepingStatus(spaceId: string, status: HousekeepingStatus): Promise<void> {
  const { error } = await sb().from("spaces").update({ housekeeping_status: status }).eq("id", spaceId);
  if (error) throw error;
}

export async function createSpace(input: {
  floor_id: string;
  name: string;
  type: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
}): Promise<Space> {
  const { data, error } = await sb()
    .from("spaces")
    .insert({ ...input, status: "operational" })
    .select("*").single();
  if (error) throw error;
  return data as Space;
}

export async function deleteSpace(spaceId: string): Promise<void> {
  const { error } = await sb().from("spaces").delete().eq("id", spaceId);
  if (error) throw error;
}

export async function bulkCreateSpaces(rooms: {
  floor_id: string; name: string; type: string;
  position_x: number; position_y: number; width: number; height: number;
}[]): Promise<Space[]> {
  if (!rooms.length) return [];
  const { data, error } = await sb()
    .from("spaces")
    .insert(rooms.map(r => ({ ...r, status: "operational" })))
    .select("*");
  if (error) throw error;
  return (data ?? []) as Space[];
}

export async function updateSpace(spaceId: string, patch: {
  name?: string; type?: string;
  position_x?: number; position_y?: number; width?: number; height?: number;
  sq_ft?: number | null;
}): Promise<void> {
  const { error } = await sb().from("spaces").update(patch).eq("id", spaceId);
  if (error) throw error;
}

export async function updateFloorGrid(floorId: string, patch: { grid_cols?: number; grid_rows?: number; name?: string; scale_ft_per_cell?: number | null }): Promise<void> {
  const { error } = await sb().from("floors").update(patch).eq("id", floorId);
  if (error) throw error;
}

export async function createFloor(input: {
  building_id: string;
  name: string;
  level: number;
  grid_cols?: number;
  grid_rows?: number;
}): Promise<Floor> {
  const { data, error } = await sb()
    .from("floors")
    .insert({ grid_cols: 14, grid_rows: 8, ...input })
    .select("*").single();
  if (error) throw error;
  return data as Floor;
}

// ─── Work orders ──────────────────────────────────────────────────────────────
const WORK_ORDER_SELECT = `
  *,
  space:spaces(id, name, floor:floors(id, name, building:buildings(id, name))),
  assignee:profiles!work_orders_assigned_to_fkey(id, full_name, role, avatar_url),
  creator:profiles!work_orders_created_by_fkey(id, full_name, role)
`;

export async function fetchWorkOrders(): Promise<WorkOrder[]> {
  const { data, error } = await sb()
    .from("work_orders").select(WORK_ORDER_SELECT).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as WorkOrder[];
}

export async function fetchWorkOrder(id: string): Promise<WorkOrder | null> {
  const { data, error } = await sb()
    .from("work_orders").select(WORK_ORDER_SELECT).eq("id", id).single();
  if (error) return null;
  return data as unknown as WorkOrder;
}

export async function createWorkOrder(input: {
  title: string;
  description: string | null;
  priority: WorkOrderPriority;
  category: string;
  space_id: string | null;
  assigned_to: string | null;
  organization_id: string;
  created_by: string;
}): Promise<WorkOrder> {
  const supabase = sb();
  const { data, error } = await supabase
    .from("work_orders")
    .insert({ ...input, status: input.assigned_to ? "assigned" : "open" })
    .select(WORK_ORDER_SELECT).single();
  if (error) throw error;

  // Reflect the new issue on the room's status — but only if the room isn't
  // already flagged ("if not already"). Best-effort: RLS may block the update
  // for non-managers, which is fine.
  if (input.space_id) {
    const { data: space } = await supabase
      .from("spaces").select("status").eq("id", input.space_id).single();
    if (space) {
      const next = deriveSpaceStatusFromWorkOrder(space.status as SpaceStatus, input.priority, input.category);
      if (next) await supabase.from("spaces").update({ status: next }).eq("id", input.space_id);
    }
  }

  return data as unknown as WorkOrder;
}

// Open (unresolved) work orders for a room — the "why" behind its current status.
export async function fetchWorkOrdersForSpace(spaceId: string): Promise<WorkOrder[]> {
  const { data, error } = await sb()
    .from("work_orders")
    .select("id, title, status, priority, category, created_at")
    .eq("space_id", spaceId)
    .not("status", "in", "(completed,cancelled)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as WorkOrder[];
}

export async function updateWorkOrderStatus(id: string, status: WorkOrderStatus): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === "completed") patch.completed_at = new Date().toISOString();
  const { error } = await sb().from("work_orders").update(patch).eq("id", id);
  if (error) throw error;
}

export async function assignWorkOrder(id: string, assignedTo: string | null): Promise<void> {
  const { error } = await sb()
    .from("work_orders")
    .update({ assigned_to: assignedTo, status: assignedTo ? "assigned" : "open" })
    .eq("id", id);
  if (error) throw error;
}

// ─── Work order photos (Supabase Storage) ─────────────────────────────────────
export async function uploadWorkOrderPhoto(workOrderId: string, file: File, currentPhotos: string[]): Promise<string[]> {
  const supabase = sb();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${workOrderId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("work-order-photos").upload(path, file, { upsert: false });
  if (upErr) throw upErr;
  const { data: pub } = supabase.storage.from("work-order-photos").getPublicUrl(path);
  const photos = [...currentPhotos, pub.publicUrl];
  const { error } = await supabase.from("work_orders").update({ photos }).eq("id", workOrderId);
  if (error) throw error;
  return photos;
}

// ─── Work order comments ──────────────────────────────────────────────────────
export async function fetchComments(workOrderId: string) {
  const { data, error } = await sb()
    .from("work_order_comments")
    .select("*, author:profiles(id, full_name, role, avatar_url)")
    .eq("work_order_id", workOrderId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function addComment(workOrderId: string, content: string) {
  const supabase = sb();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("work_order_comments")
    .insert({ work_order_id: workOrderId, author_id: user.id, content })
    .select("*, author:profiles(id, full_name, role, avatar_url)")
    .single();
  if (error) throw error;
  return data;
}

// ─── Assets ───────────────────────────────────────────────────────────────────
export async function fetchAssets(): Promise<Asset[]> {
  const { data, error } = await sb()
    .from("assets")
    .select("*, space:spaces(name)")
    .order("name");
  if (error) throw error;
  return (data ?? []) as unknown as Asset[];
}

export async function createAsset(input: {
  name: string;
  type: string | null;
  model: string | null;
  serial_number: string | null;
  status: AssetStatus;
  next_maintenance_at: string | null;
}): Promise<Asset> {
  const supabase = sb();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("organization_id").eq("id", user!.id).single();
  const { data, error } = await supabase
    .from("assets")
    .insert({ ...input, organization_id: me?.organization_id })
    .select("*").single();
  if (error) throw error;
  return data as Asset;
}

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await sb().from("assets").delete().eq("id", id);
  if (error) throw error;
}

// ─── Profiles (team) ──────────────────────────────────────────────────────────
export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await sb().from("profiles").select("*").order("full_name");
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function fetchCurrentProfile(): Promise<Profile | null> {
  const supabase = sb();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*, role_def:roles(slug, name)")
    .eq("id", user.id).single();
  if (!data) return null;
  // Flatten the joined role slug (reliable, unlike the legacy text role)
  const roleDef = (data as { role_def?: { slug?: string } }).role_def;
  return { ...data, role_slug: roleDef?.slug ?? data.role } as Profile;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export async function fetchChannels(): Promise<Channel[]> {
  const { data, error } = await sb().from("channels").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []) as Channel[];
}

export async function fetchMessages(channelId: string): Promise<Message[]> {
  const { data, error } = await sb()
    .from("messages")
    .select(`*, author:profiles(id, full_name, role, avatar_url)`)
    .eq("channel_id", channelId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as Message[];
}

export async function sendMessage(channelId: string, body: string): Promise<Message> {
  const supabase = sb();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  const { data, error } = await supabase
    .from("messages")
    .insert({ channel_id: channelId, organization_id: profile?.organization_id, author_id: user.id, body })
    .select(`*, author:profiles(id, full_name, role, avatar_url)`).single();
  if (error) throw error;
  return data as unknown as Message;
}

// ─── Dashboard stats (computed) ───────────────────────────────────────────────
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const supabase = sb();
  const [{ data: spaces }, { data: workOrders }, { data: profiles }] = await Promise.all([
    supabase.from("spaces").select("status"),
    supabase.from("work_orders").select("status, priority, completed_at, created_at"),
    supabase.from("profiles").select("role, is_available"),
  ]);

  return computeDashboardStats(spaces ?? [], workOrders ?? [], profiles ?? []);
}

export async function fetchRecentActivity(): Promise<import("@/types").ActivityItem[]> {
  const supabase = sb();
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const [{ data: orders }, { data: comments }] = await Promise.all([
    supabase.from("work_orders")
      .select("id, title, priority, status, created_at, updated_at, creator:profiles!work_orders_created_by_fkey(full_name), assignee:profiles!work_orders_assigned_to_fkey(full_name)")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("messages")
      .select("id, body, created_at, author:profiles!messages_author_id_fkey(full_name)")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const items: import("@/types").ActivityItem[] = [];

  for (const o of (orders ?? [])) {
    const creator = (o.creator as { full_name?: string } | null)?.full_name ?? "Someone";
    items.push({
      id: `wo-${o.id}`,
      type: "work_order_created",
      title: "New work order",
      description: o.title,
      user: { name: creator },
      timestamp: o.created_at,
      meta: { priority: o.priority },
    });
    if (o.assignee) {
      const assignee = (o.assignee as { full_name?: string } | null)?.full_name ?? "Technician";
      items.push({
        id: `assign-${o.id}`,
        type: "tech_assigned",
        title: "Technician assigned",
        description: `${assignee} assigned to: ${o.title}`,
        user: { name: creator },
        timestamp: o.updated_at ?? o.created_at,
      });
    }
  }

  for (const c of (comments ?? [])) {
    const author = (c.author as { full_name?: string } | null)?.full_name ?? "Team member";
    items.push({
      id: `msg-${c.id}`,
      type: "comment_added",
      title: "Team message",
      description: String(c.body ?? "").slice(0, 80),
      user: { name: author },
      timestamp: c.created_at,
    });
  }

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
}

// ─── Corporate — Audit Log ────────────────────────────────────────────────────
export async function fetchAuditLogs(limit = 60, filter?: string): Promise<AuditLog[]> {
  let q = sb()
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (filter) q = q.like("action", `${filter}.%`);
  const { data } = await q;
  return (data ?? []) as AuditLog[];
}

// ─── Corporate — Announcements ────────────────────────────────────────────────
export async function fetchAnnouncements(): Promise<Announcement[]> {
  const { data } = await sb()
    .from("announcements")
    .select("*, author:profiles!author_id(full_name, avatar_url)")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as Announcement[];
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  target_roles: string[];
  pinned: boolean;
}): Promise<void> {
  const supabase = sb();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: me } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!me?.organization_id) throw new Error("No organization");

  const { data: ann, error } = await supabase
    .from("announcements")
    .insert({
      organization_id: me.organization_id,
      author_id: user.id,
      title: input.title.trim(),
      body: input.body.trim(),
      target_roles: input.target_roles,
      pinned: input.pinned,
    })
    .select()
    .single();
  if (error) throw error;

  // Push in-app notifications to every targeted profile
  let profileQ = supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", me.organization_id);
  if (input.target_roles.length > 0) {
    profileQ = profileQ.in("role", input.target_roles);
  }
  const { data: targets } = await profileQ;
  if (targets?.length) {
    await supabase.from("notifications").insert(
      (targets as { id: string }[]).map((p) => ({
        user_id: p.id,
        title: ann.title,
        body: ann.body.slice(0, 300),
        type: "system" as const,
        read: false,
        data: { announcement_id: ann.id },
      }))
    );
  }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await sb().from("announcements").delete().eq("id", id);
  if (error) throw error;
}
