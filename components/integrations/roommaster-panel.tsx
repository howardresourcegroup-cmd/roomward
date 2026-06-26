"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, CheckCircle2, AlertTriangle, Zap,
  Wrench, Sparkles, WifiOff, ExternalLink, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useDataStore, type RoomMasterChange } from "@/lib/store/data-store";
import { cn, SPACE_STATUS_CONFIG, timeAgo } from "@/lib/utils";
import type { SpaceStatus } from "@/types";

const STATUS_ICONS: Partial<Record<SpaceStatus, React.ElementType>> = {
  cleaning_required: Sparkles,
  needs_maintenance: Wrench,
  offline:           WifiOff,
  inspection_due:    AlertTriangle,
};

interface SyncResult {
  changes: RoomMasterChange[];
  work_orders_created: number;
  synced_at: string;
}

export function RoomMasterPanel() {
  const { roomMasterSync, setRoomMasterSync, applyRoomMasterChanges } = useDataStore();
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleSync = async () => {
    setRoomMasterSync({ status: "syncing" });
    setLastResult(null);

    try {
      const res = await fetch("/api/roommaster?action=sync", { method: "POST", body: JSON.stringify({}) });
      const data = await res.json();

      if (data.success) {
        applyRoomMasterChanges(data.changes);
        setLastResult({
          changes: data.changes,
          work_orders_created: data.work_orders_created,
          synced_at: data.synced_at,
        });
        setExpanded(true);
      } else {
        setRoomMasterSync({ status: "error" });
      }
    } catch {
      setRoomMasterSync({ status: "error" });
    }
  };

  const { status, last_synced, rooms_synced, changes_applied } = roomMasterSync;
  const isSyncing = status === "syncing";
  const hasSync = status === "success" && last_synced;

  const actionableChanges = lastResult?.changes.filter((c) => c.create_work_order) ?? [];

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/20">
            <Zap className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">RoomMaster</p>
              <span className={cn(
                "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border",
                hasSync
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-zinc-700/40 border-border/40 text-muted-foreground"
              )}>
                <span className={cn("h-1.5 w-1.5 rounded-full", hasSync ? "bg-emerald-400" : "bg-zinc-600")} />
                {hasSync ? "Connected" : "Not synced"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {last_synced
                ? `Last synced ${timeAgo(last_synced)} · ${rooms_synced} rooms`
                : "Click Sync to pull room statuses from RoomMaster"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasSync && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setRoomMasterSync({ status: "idle", last_synced: null, rooms_synced: 0, changes_applied: 0 });
                setLastResult(null);
                setExpanded(false);
              }}
              title="Disconnect & reset sync state"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
          <Button
            size="sm"
            variant={hasSync ? "secondary" : "default"}
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing…" : hasSync ? "Sync Now" : "Connect & Sync"}
          </Button>
        </div>
      </div>

      {/* Syncing animation */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4">
              <div className="flex items-center gap-3 rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3">
                <RefreshCw className="h-4 w-4 text-blue-400 animate-spin shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-blue-300 font-medium">Pulling from RoomMaster…</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Fetching housekeeping statuses for all rooms</p>
                </div>
              </div>
              <div className="mt-2 h-1 w-full rounded-full bg-foreground/[0.06] overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync results */}
      <AnimatePresence>
        {lastResult && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Rooms synced",  value: lastResult.changes.length,         color: "text-foreground" },
                  { label: "Need attention",value: actionableChanges.length,           color: "text-amber-400" },
                  { label: "Orders created",value: lastResult.work_orders_created,     color: "text-indigo-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg bg-foreground/[0.03] border border-border p-2.5 text-center">
                    <p className={cn("text-xl font-bold tabular-nums", color)}>{value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Actionable changes */}
              {actionableChanges.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Rooms requiring action
                  </p>
                  {actionableChanges.slice(0, 5).map((c) => {
                    const cfg = SPACE_STATUS_CONFIG[c.ff_status];
                    const Icon = STATUS_ICONS[c.ff_status] ?? AlertTriangle;
                    return (
                      <div
                        key={c.room_number}
                        className={cn("flex items-center gap-3 rounded-lg px-3 py-2 border text-xs", cfg.bg, cfg.border)}
                      >
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.color)} />
                        <span className={cn("font-medium", cfg.color)}>{c.space_name}</span>
                        <span className="text-muted-foreground flex-1">{c.pms_status}</span>
                        {c.create_work_order && (
                          <span className="text-[10px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded-md">
                            WO created
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {actionableChanges.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{actionableChanges.length - 5} more — view in Work Orders
                    </p>
                  )}
                </div>
              )}

              {actionableChanges.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <p className="text-sm text-emerald-300">All rooms operational — no action needed.</p>
                </div>
              )}

              <button
                onClick={() => setExpanded(false)}
                className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors w-full text-center pt-1"
              >
                Collapse
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact last-sync summary (when collapsed after a sync) */}
      {hasSync && !expanded && !isSyncing && (
        <div
          className="flex items-center gap-3 px-5 pb-4 cursor-pointer group"
          onClick={() => lastResult && setExpanded(true)}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span className="text-xs text-muted-foreground flex-1">
            {changes_applied > 0
              ? `${changes_applied} work order${changes_applied !== 1 ? "s" : ""} auto-created from last sync`
              : "All rooms synced — no changes needed"}
          </span>
          {lastResult && (
            <span className="text-xs text-indigo-400 group-hover:text-indigo-300 transition-colors">
              Details ↓
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Other PMS integrations ───────────────────────────────────────────────────
export function IntegrationsPanel() {
  const OTHER_INTEGRATIONS = [
    { name: "Eptura Asset",logo: "Ep", desc: "CMMS — work orders + assets", status: "available" },
    { name: "Opera PMS",   logo: "Op", desc: "Oracle Hospitality",         status: "available" },
    { name: "Cloudbeds",   logo: "Cb", desc: "All-in-one PMS",             status: "available" },
    { name: "Maestro",     logo: "Ma", desc: "Maestro PMS",                status: "available" },
    { name: "OnQ",         logo: "OQ", desc: "Hilton OnQ / LightSpeed",    status: "available" },
    { name: "Mews",        logo: "Mw", desc: "Mews PMS",                   status: "coming_soon" },
  ];

  const [requested, setRequested] = useState<string[]>([]);

  const requestSetup = (name: string) => {
    if (requested.includes(name)) return;
    setRequested((prev) => [...prev, name]);
    toast.success(`We'll connect ${name} for you — our team will reach out to finish setup.`);
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PMS Integrations</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">Connect Your PMS</p>
        </div>
        <button
          onClick={() => toast.info("Don't see your PMS? Request it and our team will set up the connection.")}
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
        >
          Request another <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {OTHER_INTEGRATIONS.map((i) => {
          const isRequested = requested.includes(i.name);
          const isComingSoon = i.status === "coming_soon";
          return (
            <button
              key={i.name}
              disabled={isComingSoon || isRequested}
              onClick={() => requestSetup(i.name)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all text-xs",
                isRequested
                  ? "border-emerald-500/30 bg-emerald-500/[0.06] text-foreground"
                  : !isComingSoon
                  ? "border-border bg-foreground/[0.02] hover:bg-foreground/[0.06] hover:border-border text-foreground"
                  : "border-border bg-transparent text-muted-foreground cursor-not-allowed"
              )}
            >
              <span className={cn(
                "h-6 w-6 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0",
                isRequested ? "bg-emerald-500/15 text-emerald-400" : "bg-foreground/[0.06] text-muted-foreground"
              )}>
                {isRequested ? <CheckCircle2 className="h-3.5 w-3.5" /> : i.logo}
              </span>
              <div className="min-w-0">
                <p className={cn("font-medium truncate", isComingSoon && "text-muted-foreground")}>
                  {i.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {isRequested ? "Setup requested" : isComingSoon ? "Coming soon" : i.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
