"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import * as q from "./queries";
import { fetchRoles, fetchMyPermissions } from "./roles";
import type {
  Building, Floor, Space, WorkOrder, Profile, Channel, Message, Role, Asset,
  SpaceStatus, HousekeepingStatus, WorkOrderStatus, DashboardStats, ActivityItem,
  AuditLog, Announcement,
} from "@/types";

// ─── Tiny stale-while-revalidate cache ────────────────────────────────────────
// Survives client-side navigation (module scope), so revisiting a page shows
// the last data instantly while a fresh fetch updates it in the background.
const cache = new Map<string, unknown>();

function useCachedQuery<T>(key: string, fetcher: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>((cache.get(key) as T) ?? initial);
  const [loading, setLoading] = useState(!cache.has(key));

  const reload = useCallback(() => {
    fetcher().then((d) => { cache.set(key, d); setData(d); setLoading(false); })
             .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { reload(); }, [reload]);
  return { data, loading, reload, setData };
}

// ─── Buildings list ───────────────────────────────────────────────────────────
export function useBuildings() {
  const { data: buildings, loading, reload, setData: setBuildings } = useCachedQuery<Building[]>("buildings", q.fetchBuildings, []);
  return { buildings, loading, reload, setBuildings };
}

// ─── Building detail (floors + spaces, with live status updates) ──────────────
export function useBuildingDetail(buildingId: string) {
  const [building, setBuilding] = useState<Building | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      q.fetchBuilding(buildingId),
      q.fetchFloors(buildingId),
      q.fetchSpacesForBuilding(buildingId),
    ]).then(([b, f, s]) => {
      if (!active) return;
      setBuilding(b); setFloors(f); setSpaces(s); setLoading(false);
    }).catch(() => active && setLoading(false));
    return () => { active = false; };
  }, [buildingId]);

  // Realtime: reflect space status changes from other users
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`spaces-${buildingId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "spaces" },
        (payload) => {
          const updated = payload.new as Space;
          setSpaces((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [buildingId]);

  const setSpaceStatus = useCallback(async (spaceId: string, status: SpaceStatus) => {
    setSpaces((prev) => prev.map((s) => (s.id === spaceId ? { ...s, status } : s))); // optimistic
    try { await q.updateSpaceStatus(spaceId, status); } catch { /* realtime will reconcile */ }
  }, []);

  const addSpace = useCallback((space: Space) => setSpaces((prev) => [...prev, space]), []);
  const removeSpace = useCallback((id: string) => setSpaces((prev) => prev.filter((s) => s.id !== id)), []);
  const addFloor = useCallback((floor: Floor) => setFloors((prev) => [...prev, floor]), []);

  const patchSpace = useCallback((id: string, patch: Partial<Space>) => {
    setSpaces((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const patchFloor = useCallback((id: string, patch: Partial<Floor>) => {
    setFloors((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  return { building, floors, spaces, loading, setSpaceStatus, addSpace, removeSpace, addFloor, patchSpace, patchFloor };
}

// ─── Work orders ──────────────────────────────────────────────────────────────
export function useWorkOrders() {
  const { data: workOrders, loading, reload } = useCachedQuery<WorkOrder[]>("work_orders", q.fetchWorkOrders, []);
  return { workOrders, loading, reload };
}

export function useWorkOrder(id: string) {
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    q.fetchWorkOrder(id).then((o) => { setOrder(o); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  const setStatus = useCallback(async (status: WorkOrderStatus) => {
    setOrder((prev) => prev ? { ...prev, status } : prev); // optimistic
    await q.updateWorkOrderStatus(id, status);
  }, [id]);

  return { order, loading, setStatus };
}

// ─── Team ─────────────────────────────────────────────────────────────────────
export function useProfiles() {
  const { data: profiles, loading } = useCachedQuery<Profile[]>("profiles", q.fetchProfiles, []);
  return { profiles, loading };
}

// ─── Assets ───────────────────────────────────────────────────────────────────
export function useAssets() {
  const { data: assets, loading, reload } = useCachedQuery<Asset[]>("assets", q.fetchAssets, []);
  return { assets, loading, reload };
}

// ─── Housekeeping board (live) ────────────────────────────────────────────────
export function useHousekeeping() {
  const [rooms, setRooms] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    q.fetchHousekeepingRooms().then((r) => { setRooms(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  // Live: reflect status changes from housekeeping/managers on other devices
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("housekeeping")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "spaces" },
        (payload) => {
          const u = payload.new as Space;
          setRooms((prev) => prev.map((s) => (s.id === u.id ? { ...s, ...u } : s)));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const setStatus = useCallback(async (spaceId: string, status: HousekeepingStatus) => {
    setRooms((prev) => prev.map((s) => (s.id === spaceId ? { ...s, housekeeping_status: status } : s))); // optimistic
    try { await q.updateHousekeepingStatus(spaceId, status); } catch { /* realtime reconciles */ }
  }, []);

  return { rooms, loading, setStatus };
}

export function useCurrentProfile() {
  const { data } = useCachedQuery<Profile | null>("current_profile", q.fetchCurrentProfile, null);
  return data;
}

// ─── Roles & permissions ──────────────────────────────────────────────────────
export function useRoles() {
  const { data: roles, loading, reload } = useCachedQuery<Role[]>("roles", fetchRoles, []);
  return { roles, loading, reload };
}

// The current user's effective permissions + a `can()` checker.
// Fails open to true while loading so the UI doesn't flicker-hide actions;
// the server (RLS) is the real enforcement boundary.
export function usePermissions() {
  const { data: perms, loading } = useCachedQuery<string[]>("my_permissions", fetchMyPermissions, []);
  const can = useCallback(
    (permission: string) => loading || perms.length === 0 || perms.includes(permission),
    [perms, loading]
  );
  return { permissions: perms, can, loading };
}

// ─── Billing / trial state ────────────────────────────────────────────────────
export interface BillingState {
  status: "trial" | "active" | "past_due" | "canceled";
  trialEndsAt: string | null;
  daysLeft: number;
  isActive: boolean;
  isTrialing: boolean;
  isExpired: boolean;
  loading: boolean;
}

export function useBilling(): BillingState & { reload: () => void } {
  const { data, loading, reload } = useCachedQuery<{ subscription_status?: string; trial_ends_at?: string } | null>(
    "billing", q.fetchOrganization, null
  );
  const status = (data?.subscription_status ?? "trial") as BillingState["status"];
  const trialEndsAt = data?.trial_ends_at ?? null;
  const msLeft = trialEndsAt ? +new Date(trialEndsAt) - Date.now() : 0;
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
  const isActive = status === "active";
  const isTrialing = status === "trial" && msLeft > 0;
  const isExpired = status === "trial" && msLeft <= 0;
  return { status, trialEndsAt, daysLeft, isActive, isTrialing, isExpired, loading, reload };
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────
export function useDashboardStats() {
  const { data } = useCachedQuery<DashboardStats | null>("dashboard_stats", q.fetchDashboardStats, null);
  return data;
}

export function useRecentActivity() {
  const { data } = useCachedQuery<ActivityItem[]>("recent_activity", q.fetchRecentActivity, []);
  return data;
}

export function useOrganization() {
  const { data, loading, reload } = useCachedQuery<{ id: string; name: string; slug: string; is_demo?: boolean; demo_expires_at?: string | null; settings?: unknown } | null>(
    "organization", q.fetchOrganization, null
  );
  return { org: data, loading, reload };
}

// ─── Chat (with realtime) ─────────────────────────────────────────────────────
export function useChannels() {
  const { data } = useCachedQuery<Channel[]>("channels", q.fetchChannels, []);
  return data;
}

export function useMessages(channelId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId) return;
    setLoading(true);
    q.fetchMessages(channelId).then((m) => { setMessages(m); setLoading(false); }).catch(() => setLoading(false));
  }, [channelId]);

  // Realtime: new messages appear instantly for everyone in the channel
  useEffect(() => {
    if (!channelId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${channelId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          const m = payload.new as Message;
          // Fetch author for display
          const { data: author } = await supabase.from("profiles").select("id, full_name, role, avatar_url").eq("id", m.author_id).single();
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, { ...m, author: author as Profile }]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [channelId]);

  const send = useCallback(async (body: string) => {
    if (!channelId) return;
    await q.sendMessage(channelId, body); // realtime INSERT echoes it back
  }, [channelId]);

  return { messages, loading, send };
}

// ─── Corporate ────────────────────────────────────────────────────────────────
export function useAuditLogs(filter?: string) {
  const key = `audit_logs:${filter ?? "all"}`;
  const fetcher = useCallback(() => q.fetchAuditLogs(60, filter), [filter]);
  const { data, loading, reload } = useCachedQuery<AuditLog[]>(key, fetcher, []);
  return { logs: data, loading, reload };
}

export function useAnnouncements() {
  const supabase = createClient();
  const { data, loading, reload, setData } = useCachedQuery<Announcement[]>(
    "announcements", q.fetchAnnouncements, []
  );

  // Realtime: new announcements appear for everyone without a refresh
  useEffect(() => {
    const channel = supabase
      .channel("announcements-realtime")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        () => { reload(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, reload]);

  const post = useCallback(async (input: { title: string; body: string; target_roles: string[]; pinned: boolean }) => {
    await q.createAnnouncement(input);
    reload();
  }, [reload]);

  const remove = useCallback(async (id: string) => {
    await q.deleteAnnouncement(id);
    setData((prev) => prev.filter((a) => a.id !== id));
  }, [setData]);

  return { announcements: data, loading, post, remove, reload };
}
