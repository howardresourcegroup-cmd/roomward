"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, BedDouble, CircleCheck, Ban, ArrowRight, LayoutGrid, Users } from "lucide-react";
import { useHousekeeping, usePermissions, useCurrentProfile, useHousekeepers } from "@/lib/data/hooks";
import { PageLoader } from "@/components/shared/loading-spinner";
import { OccupancyBadge } from "@/components/rooms/occupancy-badge";
import { AssignmentBoard } from "@/components/housekeeping/assignment-board";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import { isDemoMode } from "@/lib/demo-mode";
import type { HousekeepingStatus, Space } from "@/types";

const COLUMNS: { status: HousekeepingStatus; label: string; color: string; bg: string; border: string; dot: string }[] = [
  { status: "dirty",          label: "Dirty",            color: "text-red-400",     bg: "bg-red-500/[0.06]",     border: "border-red-500/20",     dot: "bg-red-400" },
  { status: "in_progress",    label: "In Progress",      color: "text-blue-400",    bg: "bg-blue-500/[0.06]",    border: "border-blue-500/20",    dot: "bg-blue-400" },
  { status: "cleaned",        label: "Cleaned · Inspect",color: "text-cyan-400",    bg: "bg-cyan-500/[0.06]",    border: "border-cyan-500/20",    dot: "bg-cyan-400" },
  { status: "ready",          label: "Ready",            color: "text-emerald-400", bg: "bg-emerald-500/[0.06]", border: "border-emerald-500/20", dot: "bg-emerald-400" },
];

// What the "advance" button does in each column
const NEXT: Partial<Record<HousekeepingStatus, { to: HousekeepingStatus; label: string; managerOnly?: boolean }>> = {
  dirty:       { to: "in_progress", label: "Start" },
  in_progress: { to: "cleaned",     label: "Mark Cleaned" },
  cleaned:     { to: "ready",       label: "Inspect → Ready", managerOnly: true },
};

type View = "board" | "assignments";

export default function HousekeepingPage() {
  const { rooms, loading, setStatus, assign } = useHousekeeping();
  const { housekeepers } = useHousekeepers();
  const { can } = usePermissions();
  const me = useCurrentProfile();
  const isManager = me?.role === "manager" || me?.role === "admin";
  const canClean = can("spaces.update_status");
  const canAssign = can("housekeeping.assign") && !isDemoMode();

  const [view, setView] = useState<View>("board");
  // Housekeepers overwhelmingly want their own list, not the whole property.
  const [mineOnly, setMineOnly] = useState(false);

  const visibleRooms = useMemo(
    () => (mineOnly && me?.id ? rooms.filter((r) => r.housekeeper_id === me.id) : rooms),
    [rooms, mineOnly, me?.id]
  );

  const myRoomCount = useMemo(
    () => (me?.id ? rooms.filter((r) => r.housekeeper_id === me.id).length : 0),
    [rooms, me?.id]
  );

  const byStatus = useMemo(() => {
    const map: Record<string, Space[]> = { dirty: [], in_progress: [], cleaned: [], ready: [], out_of_service: [] };
    for (const r of visibleRooms) (map[r.housekeeping_status ?? "ready"] ??= []).push(r);
    return map;
  }, [visibleRooms]);

  const readyCount = byStatus.ready?.length ?? 0;
  const dirtyCount = byStatus.dirty?.length ?? 0;
  const oos = byStatus.out_of_service ?? [];

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Housekeeping Board</h1>
          <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap">
            <span className="flex items-center gap-1.5 text-emerald-400"><CircleCheck className="h-3.5 w-3.5" />{readyCount} ready for check-in</span>
            <span className="flex items-center gap-1.5 text-red-400"><BedDouble className="h-3.5 w-3.5" />{dirtyCount} to clean</span>
            <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {myRoomCount > 0 && (
            <button
              onClick={() => setMineOnly((v) => !v)}
              aria-pressed={mineOnly}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-medium transition-colors min-h-[36px]",
                mineOnly
                  ? "border-indigo-500/60 bg-indigo-500/15 text-indigo-300"
                  : "border-border bg-foreground/[0.03] text-muted-foreground hover:text-foreground"
              )}
            >
              My rooms ({myRoomCount})
            </button>
          )}

          <div className="flex w-fit max-w-full overflow-x-auto rounded-lg border border-border p-0.5 gap-0.5">
            {([
              { key: "board" as View, icon: LayoutGrid, label: "By status" },
              { key: "assignments" as View, icon: Users, label: "By person" },
            ]).map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setView(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap text-sm px-3 py-1.5 rounded-md transition-colors",
                  view === key ? "bg-foreground/[0.08] text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                )}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "assignments" ? (
        <AssignmentBoard
          rooms={visibleRooms}
          housekeepers={housekeepers}
          canAssign={canAssign}
          currentUserId={me?.id}
          onAssign={assign}
        />
      ) : (
      <>
      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const list = byStatus[col.status] ?? [];
          const next = NEXT[col.status];
          return (
            <div key={col.status} className={cn("rounded-xl border p-3", col.bg, col.border)}>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", col.dot)} />
                  <span className={cn("text-sm font-semibold", col.color)}>{col.label}</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{list.length}</span>
              </div>

              <div className="space-y-2 min-h-[60px]">
                {list.map((room) => {
                  const blocked = next?.managerOnly && !isManager;
                  return (
                    <motion.div
                      key={room.id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass-card p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{room.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {(room as Space & { floor?: { building?: { name: string } } }).floor?.building?.name?.split(" ")[0] ?? ""}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <OccupancyBadge occupancy={room.occupancy} />
                        {room.housekeeper && (
                          <span className="flex items-center gap-1 min-w-0" title={`Assigned to ${room.housekeeper.full_name}`}>
                            <Avatar className="h-4 w-4 shrink-0">
                              <AvatarImage src={room.housekeeper.avatar_url ?? undefined} />
                              <AvatarFallback className="text-[8px]">{getInitials(room.housekeeper.full_name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {room.housekeeper.full_name.split(" ")[0]}
                            </span>
                          </span>
                        )}
                      </div>
                      {next && canClean && (
                        <button
                          onClick={() => !blocked && setStatus(room.id, next.to)}
                          disabled={blocked}
                          className={cn(
                            "mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all",
                            blocked
                              ? "bg-foreground/[0.03] text-muted-foreground cursor-not-allowed"
                              : "bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.12] active:scale-[0.98]"
                          )}
                          title={blocked ? "Only a manager can mark a room ready" : undefined}
                        >
                          {next.label}
                          {!blocked && <ArrowRight className="h-3 w-3" />}
                        </button>
                      )}
                      {col.status === "ready" && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400">
                          <CircleCheck className="h-3 w-3" /> Ready for guests
                        </div>
                      )}
                      {col.status === "ready" && canClean && (
                        <button onClick={() => setStatus(room.id, "dirty")}
                          className="mt-1 w-full min-h-[32px] rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] active:scale-[0.98] transition-all">
                          Mark dirty (checkout)
                        </button>
                      )}
                    </motion.div>
                  );
                })}
                {list.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">None</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Out of service */}
      {oos.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Ban className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Out of Service ({oos.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {oos.map((r) => (
              <span key={r.id} className="text-xs text-muted-foreground bg-foreground/[0.03] border border-border rounded-md px-2 py-1">{r.name}</span>
            ))}
          </div>
        </div>
      )}
      </>
      )}

      {mineOnly && visibleRooms.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nothing assigned to you right now.
        </p>
      )}

      {!canClean && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" /> You have view-only access to the housekeeping board.
        </p>
      )}
    </div>
  );
}
