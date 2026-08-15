"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import * as q from "./queries";
import { fetchRoles, fetchMyPermissions } from "./roles";
import type {
  Building, Floor, Space, WorkOrder, Profile, Channel, Message, Role, Asset,
  SpaceStatus, HousekeepingStatus, WorkOrderStatus, DashboardStats, ActivityItem,
  AuditLog, Announcement, OccupancySnapshot, FnbOutlet, FnbInventoryItem,
  FnbTempLog, BanquetEvent, DashboardLayout,
} from "@/types";

// ─── Realtime channel naming ──────────────────────────────────────────────────
// Supabase returns the *same* channel object for a given name, and calling
// `.on()` on one that has already subscribed throws. A fixed name therefore
// breaks the moment two components mount the same hook — which is exactly what
// a dashboard of independent widgets does. Each subscription gets its own name;
// the postgres filter, not the name, decides what it receives.
let channelSeq = 0;
const uniqueChannel = (base: string) => `${base}-${++channelSeq}`;

// ─── Tiny stale-while-revalidate cache ────────────────────────────────────────
// Survives client-side navigation (module scope), so revisiting a page shows
// the last data instantly while a fresh fetch updates it in the background.
const cache = new Map<string, unknown>();

function useCachedQuery<T>(key: string, fetcher: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>((cache.get(key) as T) ?? initial);
  const [loading, setLoading] = useState(!cache.has(key));
  // Kept so callers can tell "this is empty" from "this did not load" and say so.
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(() => {
    setError(null);
    fetcher().then((d) => { cache.set(key, d); setData(d); setLoading(false); })
             .catch((e) => { setError(e instanceof Error ? e : new Error(String(e))); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload, setData };
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
    // Callers pick a building asynchronously (Property Map defaults to the first
    // one once the list arrives), so this runs with an empty id first. Querying
    // on it sends `id=eq.` and Postgres rejects the whole request — stay in
    // `loading` until there's a real id to ask about.
    if (!buildingId) return;
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
    if (!buildingId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(uniqueChannel(`spaces-${buildingId}`))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "spaces" },
        (payload) => {
          const updated = payload.new as Space;
          setSpaces((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [buildingId]);

  const setSpaceStatus = useCallback(async (spaceId: string, status: SpaceStatus) => {
    let prev: SpaceStatus | undefined;
    setSpaces((cur) => cur.map((s) => {
      if (s.id === spaceId) { prev = s.status; return { ...s, status }; } // optimistic
      return s;
    }));
    try { await q.updateSpaceStatus(spaceId, status); }
    catch {
      setSpaces((cur) => cur.map((s) => (s.id === spaceId && prev ? { ...s, status: prev } : s))); // revert
      toast.error("Couldn't update the space status. Please try again.");
    }
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
    let prev: WorkOrderStatus | undefined;
    setOrder((o) => { if (o) { prev = o.status; return { ...o, status }; } return o; }); // optimistic
    try { await q.updateWorkOrderStatus(id, status); }
    catch {
      setOrder((o) => (o && prev ? { ...o, status: prev } : o)); // revert
      toast.error("Couldn't update the work order status. Please try again.");
    }
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
      .channel(uniqueChannel("housekeeping"))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "spaces" },
        (payload) => {
          const u = payload.new as Space;
          setRooms((prev) => prev.map((s) => (s.id === u.id ? { ...s, ...u } : s)));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const setStatus = useCallback(async (spaceId: string, status: HousekeepingStatus) => {
    let prev: HousekeepingStatus | undefined;
    setRooms((cur) => cur.map((s) => {
      if (s.id === spaceId) { prev = s.housekeeping_status; return { ...s, housekeeping_status: status }; } // optimistic
      return s;
    }));
    try { await q.updateHousekeepingStatus(spaceId, status); }
    catch {
      setRooms((cur) => cur.map((s) => (s.id === spaceId && prev ? { ...s, housekeeping_status: prev } : s))); // revert
      toast.error("Couldn't update the room status. Please try again.");
    }
  }, []);

  /** Give one or more rooms to a housekeeper; pass null to clear the assignment. */
  const assign = useCallback(async (spaceIds: string[], housekeeper: Profile | null) => {
    if (spaceIds.length === 0) return;
    const ids = new Set(spaceIds);
    const before = new Map<string, { id: string | null | undefined; who: Space["housekeeper"] }>();
    const stamp = housekeeper ? new Date().toISOString() : null;

    setRooms((cur) => cur.map((s) => {
      if (!ids.has(s.id)) return s;
      before.set(s.id, { id: s.housekeeper_id, who: s.housekeeper });
      return {
        ...s,
        housekeeper_id: housekeeper?.id ?? null,
        housekeeping_assigned_at: stamp,
        housekeeper: housekeeper
          ? { id: housekeeper.id, full_name: housekeeper.full_name, avatar_url: housekeeper.avatar_url }
          : null,
      };
    }));

    try { await q.assignHousekeeperBulk(spaceIds, housekeeper?.id ?? null); }
    catch {
      setRooms((cur) => cur.map((s) => {
        const was = before.get(s.id);
        return was ? { ...s, housekeeper_id: was.id, housekeeper: was.who } : s;
      }));
      toast.error("Couldn't save that assignment. Please try again.");
    }
  }, []);

  return { rooms, loading, setStatus, assign };
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
  /** False until the org row has actually loaded — see `useBilling`. */
  known: boolean;
  loading: boolean;
}

export function useBilling(): BillingState & { reload: () => void } {
  const { data, loading, reload } = useCachedQuery<{ subscription_status?: string; trial_ends_at?: string; is_demo?: boolean } | null>(
    "billing", q.fetchOrganization, null
  );
  // `fetchOrganization` returns null for "no session yet", "profile not readable",
  // and "request failed" alike — an *unknown* state, not an expired one. Reading
  // unknown as expired put the whole app behind the paywall overlay after any
  // transient blip (offline, token refresh mid-flight, RLS hiccup), so every
  // billing verdict below is gated on `known`.
  const known = !!data;
  const isDemo = data?.is_demo ?? false;
  const status = (data?.subscription_status ?? "trial") as BillingState["status"];
  const trialEndsAt = data?.trial_ends_at ?? null;
  const msLeft = trialEndsAt ? +new Date(trialEndsAt) - Date.now() : 0;
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
  // Demo orgs are always treated as active — no paywall or trial countdown.
  const isActive = isDemo || (known && status === "active");
  const isTrialing = known && !isDemo && status === "trial" && msLeft > 0;
  // A trial with no end date recorded has not ended; only a date in the past has.
  const isExpired = known && !isDemo && status === "trial" && !!trialEndsAt && msLeft <= 0;
  return { status, trialEndsAt, daysLeft, isActive, isTrialing, isExpired, known, loading, reload };
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
      .channel(uniqueChannel(`messages-${channelId}`))
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
  const { data, loading, error, reload } = useCachedQuery<AuditLog[]>(key, fetcher, []);
  return { logs: data, loading, error, reload };
}

export function useAnnouncements() {
  const supabase = createClient();
  const { data, loading, error, reload, setData } = useCachedQuery<Announcement[]>(
    "announcements", q.fetchAnnouncements, []
  );

  // Realtime: new announcements appear for everyone without a refresh
  useEffect(() => {
    const channel = supabase
      .channel(uniqueChannel("announcements-realtime"))
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

  return { announcements: data, loading, error, post, remove, reload };
}

// ─── Housekeeping assignment ─────────────────────────────────────────────────
export function useHousekeepers() {
  const { data, loading, error } = useCachedQuery<Profile[]>("housekeepers", q.fetchHousekeepers, []);
  return { housekeepers: data, loading, error };
}

// ─── Occupancy analytics ─────────────────────────────────────────────────────
/**
 * Nights from `from` to `to` (YYYY-MM-DD, inclusive). Callers pass explicit
 * dates rather than a day count so the cache key is stable across re-renders
 * and two widgets asking for the same window share one fetch.
 */
export function useOccupancy(from: string, to: string) {
  const key = `occupancy:${from}:${to}`;
  const fetcher = useCallback(() => q.fetchOccupancy(from, to), [from, to]);
  const { data, loading, error, reload } = useCachedQuery<OccupancySnapshot[]>(key, fetcher, []);
  return { snapshots: data, loading, error, reload };
}

// ─── Food & Beverage ─────────────────────────────────────────────────────────
export function useFnbOutlets() {
  const { data, loading, error, reload, setData } = useCachedQuery<FnbOutlet[]>("fnb_outlets", q.fetchFnbOutlets, []);

  const toggleOpen = useCallback(async (outletId: string, isOpen: boolean) => {
    setData((prev) => prev.map((o) => (o.id === outletId ? { ...o, is_open: isOpen } : o))); // optimistic
    try { await q.setOutletOpen(outletId, isOpen); }
    catch {
      setData((prev) => prev.map((o) => (o.id === outletId ? { ...o, is_open: !isOpen } : o)));
      toast.error("Couldn't update the outlet");
    }
  }, [setData]);

  const create = useCallback(async (input: Parameters<typeof q.createOutlet>[0]) => {
    await q.createOutlet(input);
    reload();
  }, [reload]);

  const update = useCallback(async (id: string, patch: Partial<FnbOutlet>) => {
    await q.updateOutlet(id, patch);
    reload();
  }, [reload]);

  const remove = useCallback(async (id: string) => {
    await q.deleteOutlet(id);
    reload();
  }, [reload]);

  return { outlets: data, loading, error, reload, toggleOpen, create, update, remove };
}

export function useFnbInventory() {
  const { data, loading, error, reload, setData } = useCachedQuery<FnbInventoryItem[]>(
    "fnb_inventory", q.fetchFnbInventory, []
  );

  const count = useCallback(async (itemId: string, onHand: number) => {
    let prev: number | undefined;
    setData((cur) => cur.map((i) => {
      if (i.id === itemId) { prev = i.on_hand; return { ...i, on_hand: onHand, last_counted_at: new Date().toISOString() }; }
      return i;
    }));
    try { await q.countInventoryItem(itemId, onHand); }
    catch {
      setData((cur) => cur.map((i) => (i.id === itemId && prev !== undefined ? { ...i, on_hand: prev } : i)));
      toast.error("Couldn't save that count");
    }
  }, [setData]);

  const create = useCallback(async (input: Parameters<typeof q.createInventoryItem>[0]) => {
    await q.createInventoryItem(input);
    reload();
  }, [reload]);

  const remove = useCallback(async (id: string) => {
    await q.deleteInventoryItem(id);
    reload();
  }, [reload]);

  return { items: data, loading, error, reload, count, create, remove };
}

export function useFnbTempLogs(limit = 40) {
  const fetcher = useCallback(() => q.fetchFnbTempLogs(limit), [limit]);
  const { data, loading, error, reload } = useCachedQuery<FnbTempLog[]>(`fnb_temps:${limit}`, fetcher, []);

  const log = useCallback(async (input: {
    outlet_id: string | null; equipment_label: string;
    temp_f: number; min_f: number; max_f: number; note?: string | null;
  }) => {
    await q.createTempLog(input);
    reload();
  }, [reload]);

  return { logs: data, loading, error, reload, log };
}

// ─── Banquets ────────────────────────────────────────────────────────────────
export function useBanquetEvents() {
  const { data, loading, error, reload } = useCachedQuery<BanquetEvent[]>("banquet_events", q.fetchBanquetEvents, []);

  const create = useCallback(async (input: Parameters<typeof q.createBanquetEvent>[0]) => {
    await q.createBanquetEvent(input);
    reload();
  }, [reload]);

  const update = useCallback(async (id: string, patch: Partial<BanquetEvent>) => {
    await q.updateBanquetEvent(id, patch);
    reload();
  }, [reload]);

  return { events: data, loading, error, reload, create, update };
}

// ─── Per-user dashboard layout ───────────────────────────────────────────────
const LAYOUT_STORAGE_KEY = "facilityflow-dashboard-layout";

/**
 * A person's own dashboard arrangement.
 *
 * Writes go to the profile row when Supabase is configured, and to localStorage
 * otherwise, so the demo is still genuinely customizable. State is applied
 * locally first and persisted after: rearranging your own dashboard should never
 * feel like it is waiting on a round trip.
 */
export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const remote = await q.fetchDashboardLayout();
        if (!active) return;
        if (remote) { setLayout(remote); setLoading(false); return; }
      } catch {
        // fall through to local
      }
      if (!active) return;
      try {
        const raw = typeof window !== "undefined" ? localStorage.getItem(LAYOUT_STORAGE_KEY) : null;
        setLayout(raw ? (JSON.parse(raw) as DashboardLayout) : null);
      } catch {
        setLayout(null); // corrupt value — fall back to the built-in default
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const save = useCallback((next: DashboardLayout) => {
    setLayout(next);
    try { localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
    q.saveDashboardLayout(next).catch(() => { /* local copy already applied */ });
  }, []);

  const reset = useCallback(() => {
    setLayout(null);
    try { localStorage.removeItem(LAYOUT_STORAGE_KEY); } catch { /* ignore */ }
    q.clearDashboardLayout().catch(() => { /* local copy already cleared */ });
  }, []);

  return { layout, loading, save, reset };
}
