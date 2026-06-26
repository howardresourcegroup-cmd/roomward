"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Layers, AlertTriangle, ChevronRight } from "lucide-react";
import type { Floor, Space, SpaceStatus } from "@/types";
import { cn, SPACE_STATUS_CONFIG } from "@/lib/utils";

interface BuildingStackProps {
  floors: Floor[];
  spaces: Space[];
  activeFloorId: string;
  onSelectFloor: (floorId: string) => void;
  onSelectSpace?: (space: Space) => void;
}

// A vertical "control-panel" cross-section of the building.
// Each floor is a band; rooms render as live status cells. Click a floor to
// drill into its plan, or click a room cell to open it directly.
export function BuildingStack({
  floors, spaces, activeFloorId, onSelectFloor, onSelectSpace,
}: BuildingStackProps) {
  // Order floors top-down (highest level first, like a real building elevation)
  const ordered = useMemo(
    () => [...floors].sort((a, b) => b.level - a.level),
    [floors]
  );

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Building Overview</p>
          <p className="text-base font-semibold text-foreground mt-0.5">Live Status by Floor</p>
        </div>
        <Layers className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        {ordered.map((floor, idx) => {
          const floorSpaces = spaces.filter((s) => s.floor_id === floor.id);
          const issues = floorSpaces.filter((s) => s.status !== "operational");
          const hasEmergency = floorSpaces.some((s) => s.status === "emergency");
          const opPct = floorSpaces.length
            ? Math.round(((floorSpaces.length - issues.length) / floorSpaces.length) * 100)
            : 100;
          const isActive = floor.id === activeFloorId;

          return (
            <motion.div
              key={floor.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelectFloor(floor.id)}
              className={cn(
                "group rounded-xl border p-3 cursor-pointer transition-all duration-200",
                isActive
                  ? "border-indigo-500/40 bg-indigo-500/[0.07]"
                  : "border-border bg-foreground/[0.02] hover:border-border hover:bg-foreground/[0.04]",
                hasEmergency && "border-red-500/40 bg-red-500/[0.06]"
              )}
            >
              {/* Floor header */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold shrink-0",
                    isActive ? "bg-indigo-500/25 text-indigo-300" : "bg-foreground/[0.06] text-muted-foreground"
                  )}>
                    {floor.level}
                  </span>
                  <span className={cn("text-sm font-medium truncate", isActive ? "text-indigo-200" : "text-foreground")}>
                    {floor.name}
                  </span>
                  {hasEmergency && (
                    <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded-md shrink-0">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Emergency
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "text-xs font-semibold tabular-nums",
                    opPct >= 95 ? "text-emerald-400" : opPct >= 80 ? "text-amber-400" : "text-red-400"
                  )}>
                    {opPct}%
                  </span>
                  <ChevronRight className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    isActive ? "text-indigo-400" : "text-muted-foreground group-hover:translate-x-0.5"
                  )} />
                </div>
              </div>

              {/* Room status cells */}
              <div className="flex flex-wrap gap-1">
                {floorSpaces.map((space) => {
                  const cfg = SPACE_STATUS_CONFIG[space.status];
                  return (
                    <button
                      key={space.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSpace?.(space);
                      }}
                      title={`${space.name} — ${cfg.label}`}
                      className={cn(
                        "h-6 flex-1 min-w-[24px] max-w-[42px] rounded-sm border flex items-center justify-center transition-all hover:scale-110 hover:z-10",
                        cfg.bg, cfg.border,
                        space.status === "emergency" && "animate-pulse"
                      )}
                    >
                      <span className={cn("text-[8px] font-semibold leading-none truncate px-0.5", cfg.color)}>
                        {space.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Issue summary */}
              {issues.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">
                    {issues.length} {issues.length === 1 ? "space needs" : "spaces need"} attention
                  </p>
                  {issues.map((s) => {
                    const cfg = SPACE_STATUS_CONFIG[s.status];
                    return (
                      <p key={s.id} className={cn("text-[10px] font-medium", cfg.color)}>
                        {s.name} — {cfg.label}
                      </p>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-4 pt-3 border-t border-border">
        {(["operational", "cleaning_required", "needs_maintenance", "offline", "emergency"] as SpaceStatus[]).map((s) => {
          const cfg = SPACE_STATUS_CONFIG[s];
          return (
            <span key={s} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-sm border", cfg.bg, cfg.border)} />
              {cfg.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
