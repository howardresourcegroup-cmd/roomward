"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ClipboardList, AlertTriangle, CheckCircle2,
  Wrench, ChevronRight, ChevronDown, RefreshCw, BedDouble, StickyNote,
} from "lucide-react";
import type { Floor, Space, SpaceStatus, WorkOrder } from "@/types";
import { cn, SPACE_STATUS_CONFIG, timeAgo } from "@/lib/utils";
import { fetchWorkOrdersForSpace } from "@/lib/data/queries";
import { RoomCell } from "./room-cell";
import { StatusLegend } from "./status-legend";
import { Button } from "@/components/ui/button";

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-zinc-400", medium: "bg-blue-400", high: "bg-orange-400", critical: "bg-red-400",
};

const CELL_W = 90;
const CELL_H = 66;
const GAP = 4;

interface FloorGridProps {
  floor: Floor;
  spaces: Space[];
  onStatusChange?: (spaceId: string, status: SpaceStatus) => void;
  onCreateWorkOrder?: (spaceId: string) => void;
  // External focus request (e.g. clicking a room in the building overview).
  // `n` is a nonce so re-requesting the same room re-opens its panel.
  focus?: { id: string; n: number };
}

function RoomDetailPanel({
  space,
  onClose,
  onStatusChange,
  onCreateWorkOrder,
}: {
  space: Space;
  onClose: () => void;
  onStatusChange?: (status: SpaceStatus) => void;
  onCreateWorkOrder?: () => void;
}) {
  const cfg = SPACE_STATUS_CONFIG[space.status];
  const statuses = Object.keys(SPACE_STATUS_CONFIG) as SpaceStatus[];
  const [rmPushing, setRmPushing] = useState(false);
  const [rmPushed, setRmPushed]   = useState(false);
  const [showStatusList, setShowStatusList] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrder[] | null>(null);

  const isGuestRoom = ["guest_room", "suite", "cabin"].includes(space.type);

  // Load the open work orders behind this room's status ("why").
  useEffect(() => {
    let active = true;
    setWorkOrders(null);
    fetchWorkOrdersForSpace(space.id)
      .then((wos) => active && setWorkOrders(wos))
      .catch(() => active && setWorkOrders([]));
    return () => { active = false; };
  }, [space.id]);

  const handleStatusChange = async (status: SpaceStatus) => {
    onStatusChange?.(status);
    // Push to RoomMaster for guest rooms
    if (isGuestRoom) {
      setRmPushing(true);
      setRmPushed(false);
      try {
        const roomNumber = space.name.replace(/\D/g, "");
        await fetch("/api/roommaster?action=push", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_number: roomNumber, ff_status: status }),
        });
        setRmPushed(true);
      } catch { /* non-fatal */ }
      finally { setRmPushing(false); }
    }
  };

  return (
    <motion.div
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 24, opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="w-72 flex-shrink-0 glass-card flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{space.type}</p>
          <h3 className="text-sm font-semibold text-foreground leading-snug">{space.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors shrink-0 ml-2"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
      {/* Current status */}
      <div className={cn("mx-4 mt-4 flex items-center gap-2.5 rounded-xl px-3 py-2.5 border", cfg.bg, cfg.border)}>
        <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", cfg.dot)} />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Current status</p>
          <p className={cn("text-sm font-semibold", cfg.color)}>{cfg.label}</p>
        </div>
        <span className="text-[11px] text-muted-foreground ml-auto shrink-0">{timeAgo(space.updated_at)}</span>
      </div>

      {/* Why this status */}
      <div className="px-4 mt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Why this status</p>

        {/* Open work orders — the primary cause */}
        {workOrders === null ? (
          <p className="text-xs text-muted-foreground">Checking open work orders…</p>
        ) : workOrders.length > 0 ? (
          <div className="space-y-1.5">
            {workOrders.map((wo) => (
              <Link
                key={wo.id}
                href={`/work-orders/${wo.id}`}
                className="flex items-start gap-2 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2 hover:bg-foreground/[0.05] transition-colors"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full mt-1.5 shrink-0", PRIORITY_DOT[wo.priority] ?? "bg-zinc-400")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-foreground leading-snug">{wo.title}</span>
                  <span className="block text-[10px] text-muted-foreground capitalize mt-0.5">
                    {wo.priority} · {wo.status.replace(/_/g, " ")}
                  </span>
                </span>
                <ChevronRight className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
              </Link>
            ))}
          </div>
        ) : space.status === "operational" ? (
          <p className="text-xs text-muted-foreground">No open issues — room is operational.</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            No open work orders. Status was set manually{isGuestRoom ? " or via PMS sync" : ""}.
          </p>
        )}

        {/* Contextual detail */}
        {isGuestRoom && (space.occupancy || space.housekeeping_status) && (
          <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
            <BedDouble className="h-3 w-3 shrink-0" />
            <span className="capitalize">
              {space.occupancy ?? "—"}
              {space.housekeeping_status ? ` · ${space.housekeeping_status.replace(/_/g, " ")}` : ""}
            </span>
          </div>
        )}
        {space.notes && (
          <div className="flex items-start gap-2 mt-2 text-[11px] text-amber-400/90">
            <StickyNote className="h-3 w-3 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{space.notes}</span>
          </div>
        )}
      </div>

      {/* RoomMaster push confirmation */}
      {isGuestRoom && rmPushed && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <p className="text-xs text-blue-300">Status pushed to RoomMaster</p>
        </div>
      )}
      {isGuestRoom && rmPushing && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-card/50 border border-border px-3 py-2">
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0" />
          <p className="text-xs text-muted-foreground">Syncing to RoomMaster…</p>
        </div>
      )}

      {/* Change status (collapsed by default to keep the panel uncluttered) */}
      <div className="px-4 mt-4">
        <button
          onClick={() => setShowStatusList((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        >
          Change status
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showStatusList && "rotate-180")} />
        </button>
        {showStatusList && (
          <div className="space-y-1 mt-2">
            {statuses.map((s) => {
              const sc = SPACE_STATUS_CONFIG[s];
              const isActive = s === space.status;
              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-left transition-all",
                    isActive
                      ? cn("border", sc.bg, sc.border, sc.color)
                      : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
                  {sc.label}
                  {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {/* Actions (pinned) */}
      <div className="px-4 mt-4 pb-4 pt-2 space-y-2 border-t border-border">
        <Button
          size="sm"
          className="w-full"
          onClick={onCreateWorkOrder}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Create Work Order
        </Button>
        {space.status !== "operational" && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => handleStatusChange("operational")}
          >
            <Wrench className="h-3.5 w-3.5" />
            Mark Resolved
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export function FloorGrid({ floor, spaces, onStatusChange, onCreateWorkOrder, focus }: FloorGridProps) {
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Open the requested room's panel when an external focus arrives. Read spaces
  // from a ref so live status updates don't re-trigger this and reopen the panel.
  const spacesRef = useRef(spaces);
  spacesRef.current = spaces;
  useEffect(() => {
    if (!focus) return;
    const match = spacesRef.current.find((s) => s.id === focus.id);
    if (match) setSelectedSpace(match);
  }, [focus]);

  const gridW = floor.grid_cols * CELL_W + (floor.grid_cols - 1) * GAP;
  const gridH = floor.grid_rows * CELL_H + (floor.grid_rows - 1) * GAP;

  const handleStatusChange = useCallback(
    (status: SpaceStatus) => {
      if (!selectedSpace) return;
      onStatusChange?.(selectedSpace.id, status);
      setSelectedSpace((prev) => prev ? { ...prev, status } : null);
    },
    [selectedSpace, onStatusChange]
  );

  const issueCount = spaces.filter((s) => s.status !== "operational").length;

  return (
    <div className="space-y-4">
      {/* Floor summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <StatusLegend />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {issueCount > 0 && (
            <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
              <AlertTriangle className="h-3 w-3" />
              {issueCount} issue{issueCount !== 1 ? "s" : ""}
            </span>
          )}
          <span>{spaces.length} spaces mapped</span>
        </div>
      </div>

      {/* Grid + Detail panel */}
      <div className="flex gap-4 items-start">
        {/* Floorplan */}
        <div className="flex-1 overflow-auto">
          <div
            className="relative rounded-xl border border-border bg-background"
            style={{
              width: gridW + 32,
              height: gridH + 32,
              backgroundImage: `
                linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)
              `,
              backgroundSize: `${CELL_W + GAP}px ${CELL_H + GAP}px`,
              backgroundPosition: "16px 16px",
            }}
            ref={containerRef}
            onClick={(e) => {
              if (e.target === containerRef.current) setSelectedSpace(null);
            }}
          >
            <div className="relative" style={{ margin: 16, width: gridW, height: gridH }}>
              {spaces.map((space) => (
                <RoomCell
                  key={space.id}
                  space={space}
                  isSelected={selectedSpace?.id === space.id}
                  onClick={() => setSelectedSpace(space)}
                  cellW={CELL_W}
                  cellH={CELL_H}
                  gap={GAP}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedSpace && (
            <RoomDetailPanel
              space={selectedSpace}
              onClose={() => setSelectedSpace(null)}
              onStatusChange={handleStatusChange}
              onCreateWorkOrder={() => onCreateWorkOrder?.(selectedSpace.id)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
