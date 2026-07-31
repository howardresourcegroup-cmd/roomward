"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";
import { Building2, Layers, DoorClosed, Filter, LayoutGrid, Rows3, User } from "lucide-react";
import { useBuildings, useBuildingDetail, useAssets, useWorkOrders } from "@/lib/data/hooks";
import { OccupancyBadge } from "@/components/rooms/occupancy-badge";
import { PageLoader } from "@/components/shared/loading-spinner";
import { SPACE_STATUS_CONFIG, cn, spaceSqFt, formatSqFt } from "@/lib/utils";
import type { Space, Occupancy, HousekeepingStatus, Floor } from "@/types";

type Mode = "status" | "housekeeping" | "occupancy";
type ViewMode = "floor" | "overview";

const HK_COLOR: Record<HousekeepingStatus, string> = {
  dirty: "bg-red-400", in_progress: "bg-blue-400", cleaned: "bg-cyan-400", ready: "bg-emerald-400", out_of_service: "bg-zinc-500",
};
const OCC_COLOR: Record<Occupancy, string> = {
  occupied: "bg-red-400", vacant: "bg-emerald-400", arriving: "bg-amber-400", departing: "bg-blue-400",
};
const GUEST_TYPES = ["guest_room", "suite", "cabin"];

// Hex values matching each bg- class — used for inline box-shadow / border glows.
const STATUS_HEX: Record<string, string> = {
  "bg-red-400":     "#f87171",
  "bg-emerald-400": "#34d399",
  "bg-amber-400":   "#fbbf24",
  "bg-blue-400":    "#60a5fa",
  "bg-cyan-400":    "#22d3ee",
  "bg-zinc-500":    "#71717a",
};

const ASSET_STATUS: Record<string, { label: string; badge: string }> = {
  operational: { label: "Operational",    badge: "bg-emerald-500/15 text-emerald-400" },
  maintenance: { label: "In Maintenance", badge: "bg-amber-500/15 text-amber-400" },
  degraded:    { label: "Degraded",       badge: "bg-amber-500/15 text-amber-400" },
  failed:      { label: "Failed",         badge: "bg-red-500/15 text-red-400" },
};

function dotFor(mode: Mode, s: Space): string {
  if (mode === "occupancy")   return OCC_COLOR[s.occupancy ?? "vacant"];
  if (mode === "housekeeping") return HK_COLOR[s.housekeeping_status ?? "ready"];
  return SPACE_STATUS_CONFIG[s.status]?.dot ?? "bg-zinc-500";
}
function labelFor(mode: Mode, s: Space): string {
  if (mode === "occupancy")   return s.occupancy ?? "vacant";
  if (mode === "housekeeping") return (s.housekeeping_status ?? "ready").replace(/_/g, " ");
  return SPACE_STATUS_CONFIG[s.status]?.label ?? s.status;
}
function hexFor(mode: Mode, s: Space): string {
  return STATUS_HEX[dotFor(mode, s)] ?? "#71717a";
}
// Rooms that need attention pulse gently to draw the eye.
function shouldPulse(mode: Mode, s: Space): boolean {
  if (mode === "occupancy")   return s.occupancy === "arriving";
  if (mode === "housekeeping") return s.housekeeping_status === "dirty" || s.housekeeping_status === "in_progress";
  return s.status === "needs_maintenance";
}

function shortLabel(name: string): string {
  const m = name.match(/\d+/);
  return m ? m[0] : name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
}

// ── Overview floor tile ───────────────────────────────────────────────────────
function FloorMapTile({ floor, spaces, mode, guestOnly, onSelect, onOpenFloor }: {
  floor: Floor; spaces: Space[]; mode: Mode; guestOnly: boolean;
  onSelect: (s: Space) => void; onOpenFloor: () => void;
}) {
  const rooms = useMemo(() => {
    let list = spaces.filter((s) => s.floor_id === floor.id);
    if (guestOnly) list = list.filter((s) => GUEST_TYPES.includes(s.type));
    return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [spaces, floor.id, guestOnly]);

  const cols = Math.min(Math.max(rooms.length, 1), 6);

  return (
    <div className="glass-card overflow-hidden p-3 space-y-2">
      {/* Status strip — a micro color bar showing every room's state */}
      {rooms.length > 0 && (
        <div className="flex h-[3px] rounded-full overflow-hidden -mx-3 -mt-3 mb-2">
          {rooms.map((r) => (
            <div key={r.id} className="flex-1" style={{ backgroundColor: hexFor(mode, r) }} />
          ))}
        </div>
      )}

      <button onClick={onOpenFloor} className="flex w-full min-h-[32px] items-center justify-between rounded-md group active:scale-[0.99] transition-transform">
        <h3 className="text-xs font-semibold text-foreground group-hover:text-accent-text transition-colors">{floor.name}</h3>
        <span className="text-[10px] text-muted-foreground group-hover:text-accent-text transition-colors">{rooms.length} rooms ›</span>
      </button>

      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {rooms.map((r) => {
          const hex = hexFor(mode, r);
          const pulse = shouldPulse(mode, r);
          return (
            <button
              key={r.id}
              title={`${r.name} — ${labelFor(mode, r)}`}
              onClick={() => onSelect(r)}
              className={cn(
                "relative aspect-square rounded-md flex items-center justify-center",
                "text-[10px] font-bold text-black/70 leading-none",
                "transition-all duration-150 hover:scale-110 hover:z-10",
                dotFor(mode, r)
              )}
              style={{ boxShadow: `0 0 7px 1px ${hex}50` }}
            >
              {shortLabel(r.name)}
              {pulse && (
                <span
                  className="absolute inset-0 rounded-md animate-ping opacity-25"
                  style={{ backgroundColor: hex }}
                />
              )}
            </button>
          );
        })}
        {rooms.length === 0 && (
          <p className="text-[10px] text-muted-foreground col-span-full py-1">Common space — no rooms</p>
        )}
      </div>
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
const LEGENDS: Record<Mode, { color: string; label: string }[]> = {
  occupancy: [
    { color: "bg-emerald-400", label: "Vacant" },
    { color: "bg-red-400",     label: "Occupied" },
    { color: "bg-amber-400",   label: "Arriving" },
    { color: "bg-blue-400",    label: "Departing" },
  ],
  housekeeping: [
    { color: "bg-emerald-400", label: "Ready" },
    { color: "bg-cyan-400",    label: "Cleaned" },
    { color: "bg-blue-400",    label: "In Progress" },
    { color: "bg-red-400",     label: "Dirty" },
    { color: "bg-zinc-500",    label: "OOS" },
  ],
  status: [
    { color: "bg-emerald-400", label: "Operational" },
    { color: "bg-amber-400",   label: "Maintenance" },
    { color: "bg-red-400",     label: "Out of Service" },
  ],
};

export default function PropertyPage() {
  const { buildings, loading: bLoading } = useBuildings();
  const [bId, setBId] = useState("");
  useEffect(() => { if (!bId && buildings.length) setBId(buildings[0].id); }, [buildings, bId]);

  const { floors, spaces, loading: dLoading } = useBuildingDetail(bId);
  const { assets } = useAssets();
  const { workOrders } = useWorkOrders();
  const [fId, setFId] = useState("");
  useEffect(() => { setFId(floors[0]?.id ?? ""); }, [floors, bId]);

  const [mode, setMode] = useState<Mode>("occupancy");
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [guestOnly, setGuestOnly] = useState(true);
  const [selected, setSelected] = useState<Space | null>(null);

  const floorRooms = useMemo(() => {
    let list = spaces.filter((s) => s.floor_id === fId);
    if (guestOnly) list = list.filter((s) => GUEST_TYPES.includes(s.type));
    return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [spaces, fId, guestOnly]);

  const roomAssets = useMemo(
    () => (selected ? assets.filter((a) => a.space_id === selected.id) : []),
    [assets, selected]
  );
  const roomOrders = useMemo(
    () => (selected ? workOrders.filter((o) => o.space_id === selected.id && o.status !== "completed" && o.status !== "cancelled") : []),
    [workOrders, selected]
  );

  const counts = useMemo(() => ({
    occupied: spaces.filter((r) => r.occupancy === "occupied").length,
    vacant:   spaces.filter((r) => (r.occupancy ?? "vacant") === "vacant" && GUEST_TYPES.includes(r.type)).length,
    dirty:    spaces.filter((r) => r.housekeeping_status === "dirty").length,
  }), [spaces]);

  if (bLoading) return <PageLoader />;
  if (!buildings.length) return null;

  const legend = LEGENDS[mode];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Property Map</h1>
        <p className="text-sm text-muted-foreground mt-1">Live status across every room, floor, and building.</p>
      </div>

      {/* Buildings */}
      <div className="flex flex-wrap gap-2">
        {buildings.map((b) => (
          <button key={b.id} onClick={() => setBId(b.id)}
            className={cn("inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors",
              bId === b.id
                ? "bg-accent-500/15 border-accent-500/40 text-accent-text"
                : "border-border text-muted-foreground hover:border-white/20")}>
            <Building2 className="h-3.5 w-3.5" /> {b.name}
          </button>
        ))}
      </div>

      {dLoading ? <PageLoader /> : (
        <>
          {/* Controls bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Mode selector */}
            <div data-tour="map-modes" className="inline-flex rounded-lg border border-border p-0.5">
              {(["occupancy", "housekeeping", "status"] as Mode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={cn("text-xs px-3 py-1.5 rounded-md capitalize transition-colors",
                    mode === m
                      ? "bg-accent-500/20 text-accent-text"
                      : "text-muted-foreground hover:text-foreground")}>
                  {m}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              {/* Stat pills */}
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                  {counts.vacant} vacant
                </span>
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                  {counts.occupied} occupied
                </span>
                {counts.dirty > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-300 shrink-0 animate-pulse" />
                    {counts.dirty} dirty
                  </span>
                )}
              </div>

              {/* Guest filter */}
              <button onClick={() => setGuestOnly((v) => !v)}
                className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
                  guestOnly
                    ? "bg-accent-500/15 border-accent-500/40 text-accent-text"
                    : "border-border text-muted-foreground")}>
                <Filter className="h-3 w-3" /> {guestOnly ? "Guest rooms" : "All spaces"}
              </button>

              {/* View toggle */}
              <div className="inline-flex rounded-lg border border-border p-0.5">
                <button onClick={() => setViewMode("overview")}
                  title="All floors at once"
                  className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors",
                    viewMode === "overview" ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  <LayoutGrid className="h-3.5 w-3.5" /> All floors
                </button>
                <button onClick={() => setViewMode("floor")}
                  title="One floor at a time"
                  className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors",
                    viewMode === "floor" ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  <Rows3 className="h-3.5 w-3.5" /> Single floor
                </button>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {legend.map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={cn("h-2.5 w-2.5 rounded-sm", color)} />
                {label}
              </span>
            ))}
          </div>

          {/* ── OVERVIEW: all floors at once ── */}
          {viewMode === "overview" && (
            <div data-tour="map-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {floors.map((f) => (
                <FloorMapTile
                  key={f.id}
                  floor={f}
                  spaces={spaces}
                  mode={mode}
                  guestOnly={guestOnly}
                  onSelect={(s) => { setSelected(s); setViewMode("floor"); setFId(f.id); }}
                  onOpenFloor={() => { setViewMode("floor"); setFId(f.id); setSelected(null); }}
                />
              ))}
              {floors.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2 py-8 text-center">No floors on this building yet.</p>
              )}
            </div>
          )}

          {/* ── FLOOR DRILL-DOWN ── */}
          {viewMode === "floor" && (
            <>
              {/* Floor tabs */}
              <div className="flex flex-wrap items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                {floors.map((f) => (
                  <button key={f.id} onClick={() => setFId(f.id)}
                    className={cn("text-xs px-2.5 py-1 rounded-md border transition-colors",
                      fId === f.id
                        ? "bg-foreground/[0.08] border-white/20 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground")}>
                    {f.name}
                  </button>
                ))}
                {floors.length === 0 && <span className="text-xs text-muted-foreground">No floors yet.</span>}
              </div>

              {/* Room grid + detail panel */}
              <div className="flex flex-col lg:flex-row gap-4 items-start">
                <div className="w-full flex-1 grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2">
                  {floorRooms.map((r) => {
                    const hex = hexFor(mode, r);
                    const pulse = shouldPulse(mode, r);
                    const isSelected = selected?.id === r.id;
                    return (
                      <motion.button key={r.id} layout onClick={() => setSelected(r)}
                        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "relative text-left glass-card p-2.5 overflow-hidden transition-all duration-150",
                          isSelected ? "border-accent-500/60 shadow-lg" : "hover:border-white/20"
                        )}
                        style={isSelected ? { boxShadow: `0 0 0 1px var(--tw-shadow-color, transparent), 0 4px 16px ${hex}30` } : undefined}
                      >
                        {/* Left-edge status stripe */}
                        <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl"
                          style={{ backgroundColor: hex }} />

                        <div className="pl-2">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-medium text-foreground truncate">{r.name}</span>
                            {pulse && (
                              <span className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse"
                                style={{ backgroundColor: hex }} />
                            )}
                          </div>
                          <div className="mt-1.5"><OccupancyBadge occupancy={r.occupancy} /></div>
                        </div>
                      </motion.button>
                    );
                  })}
                  {floorRooms.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-full py-8 text-center">
                      No rooms match — try toggling &quot;All spaces&quot; or pick another floor.
                    </p>
                  )}
                </div>

                {selected && (
                  <motion.div initial={{ x: 16, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    className="w-full lg:w-64 shrink-0 glass-card overflow-hidden p-4 space-y-3">
                    {/* Accent strip at top of panel */}
                    <div className="h-[3px] -mx-4 -mt-4 mb-1 rounded-t-xl"
                      style={{ backgroundColor: hexFor(mode, selected) }} />

                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">{selected.name}</h3>
                      <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-xs transition-colors">✕</button>
                    </div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{selected.type.replace(/_/g, " ")}</p>
                    <div className="space-y-2 text-xs">
                      <Row label="Occupancy"><OccupancyBadge occupancy={selected.occupancy} /></Row>
                      <Row label="Housekeeping"><span className="capitalize text-foreground">{(selected.housekeeping_status ?? "ready").replace(/_/g, " ")}</span></Row>
                      <Row label="Condition"><span className={SPACE_STATUS_CONFIG[selected.status]?.color}>{SPACE_STATUS_CONFIG[selected.status]?.label}</span></Row>
                      {(() => {
                        const sqft = spaceSqFt(selected, floors.find((f) => f.id === selected.floor_id)?.scale_ft_per_cell);
                        return sqft != null ? <Row label="Size"><span className="text-foreground">{formatSqFt(sqft)}</span></Row> : null;
                      })()}
                    </div>

                    {/* Guest info */}
                    {(selected.guest_name || selected.checked_in_at || selected.expected_checkout_at) && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <User className="h-3 w-3" /> Guest
                        </p>
                        <div className="space-y-1.5 text-xs">
                          {selected.guest_name && (
                            <Row label="Name"><span className="text-foreground font-medium">{selected.guest_name}</span></Row>
                          )}
                          {selected.checked_in_at && (
                            <Row label="Checked in">
                              <span className="text-foreground" title={format(new Date(selected.checked_in_at), "PPp")}>
                                {formatDistanceToNow(new Date(selected.checked_in_at), { addSuffix: true })}
                              </span>
                            </Row>
                          )}
                          {selected.expected_checkout_at && (() => {
                            const co = new Date(selected.expected_checkout_at);
                            const label = isToday(co)
                              ? `Today ${format(co, "h:mm a")}`
                              : isTomorrow(co)
                              ? `Tomorrow ${format(co, "h:mm a")}`
                              : format(co, "MMM d, h:mm a");
                            const isUrgent = isToday(co);
                            return (
                              <Row label="Checks out">
                                <span className={isUrgent ? "text-amber-400 font-medium" : "text-foreground"}>{label}</span>
                              </Row>
                            );
                          })()}
                          {selected.checked_in_at && selected.expected_checkout_at && (() => {
                            const nights = Math.round(
                              (new Date(selected.expected_checkout_at).getTime() - new Date(selected.checked_in_at).getTime())
                              / 86_400_000
                            );
                            return nights > 0
                              ? <Row label="Nights"><span className="text-foreground">{nights}</span></Row>
                              : null;
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Assets */}
                    <div className="space-y-1.5 pt-2 border-t border-border">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Assets ({roomAssets.length})</p>
                      {roomAssets.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">No assets tracked in this room.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {roomAssets.map((a) => (
                            <div key={a.id} className="flex items-center justify-between gap-2">
                              <span className="text-xs text-foreground truncate" title={a.name}>{a.name}</span>
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md shrink-0", (ASSET_STATUS[a.status] ?? ASSET_STATUS.operational).badge)}>
                                {(ASSET_STATUS[a.status] ?? { label: a.status }).label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Open work orders */}
                    {roomOrders.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-border">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Open issues ({roomOrders.length})</p>
                        {roomOrders.map((o) => (
                          <Link key={o.id} href={`/work-orders/${o.id}`}
                            className="block text-xs text-foreground truncate hover:text-accent-text transition-colors" title={o.title}>
                            {o.title}
                          </Link>
                        ))}
                      </div>
                    )}

                    <Link href="/work-orders/new" className="btn-secondary w-full justify-center text-xs h-8">
                      <DoorClosed className="h-3.5 w-3.5" /> Log an issue here
                    </Link>
                  </motion.div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
