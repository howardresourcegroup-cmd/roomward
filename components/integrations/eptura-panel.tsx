"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, CheckCircle2, Package, ClipboardList, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, timeAgo } from "@/lib/utils";

interface EpturaWorkOrder {
  eptura_id: string;
  title: string;
  asset: string;
  ff_status: string;
  ff_priority: string;
}

export function EpturaPanel() {
  const [status, setStatus] = useState<"idle" | "syncing" | "success">("idle");
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [workOrders, setWorkOrders] = useState<EpturaWorkOrder[]>([]);
  const [expanded, setExpanded] = useState(false);

  const handleSync = async () => {
    setStatus("syncing");
    try {
      const res = await fetch("/api/eptura?action=sync", {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setWorkOrders(data.work_orders);
        setLastSynced(data.synced_at);
        setStatus("success");
        setExpanded(true);
      } else {
        setStatus("idle");
      }
    } catch {
      setStatus("idle");
    }
  };

  const isSyncing = status === "syncing";
  const hasSync = status === "success" && lastSynced;
  const importable = workOrders.filter((w) => w.ff_status !== "completed" && w.ff_status !== "cancelled");

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/20">
            <Package className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Eptura Asset</p>
              <span className={cn(
                "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border",
                hasSync ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                        : "bg-zinc-700/40 border-border/40 text-muted-foreground"
              )}>
                <span className={cn("h-1.5 w-1.5 rounded-full", hasSync ? "bg-emerald-400" : "bg-zinc-600")} />
                {hasSync ? "Connected" : "Not synced"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {lastSynced ? `Last synced ${timeAgo(lastSynced)} · ${workOrders.length} work orders` : "Sync CMMS work orders & assets"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasSync && (
            <Button size="sm" variant="ghost"
              onClick={() => { setStatus("idle"); setLastSynced(null); setWorkOrders([]); setExpanded(false); }}
              title="Disconnect & reset sync state">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
          <Button size="sm" variant={hasSync ? "secondary" : "default"} onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing…" : hasSync ? "Sync Now" : "Connect & Sync"}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isSyncing && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-4">
              <div className="mt-1 h-1 w-full rounded-full bg-foreground/[0.06] overflow-hidden">
                <motion.div className="h-full bg-violet-500 rounded-full" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1.1, ease: "easeInOut" }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hasSync && expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-foreground/[0.03] border border-border p-2.5 text-center">
                  <p className="text-xl font-bold text-foreground tabular-nums">{workOrders.length}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Work orders</p>
                </div>
                <div className="rounded-lg bg-foreground/[0.03] border border-border p-2.5 text-center">
                  <p className="text-xl font-bold text-violet-400 tabular-nums">{importable.length}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Open / active</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Synced from Eptura</p>
                {workOrders.slice(0, 4).map((wo) => (
                  <div key={wo.eptura_id} className="flex items-center gap-2.5 rounded-lg px-3 py-2 border border-border bg-foreground/[0.02] text-xs">
                    <ClipboardList className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                    <span className="text-foreground truncate flex-1">{wo.title}</span>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">{wo.eptura_id}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => setExpanded(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center pt-1">
                Collapse
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hasSync && !expanded && !isSyncing && (
        <div className="flex items-center gap-3 px-5 pb-4 cursor-pointer group" onClick={() => setExpanded(true)}>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span className="text-xs text-muted-foreground flex-1">{importable.length} active work orders synced from Eptura</span>
          <span className="text-xs text-violet-400 group-hover:text-violet-300 transition-colors">Details ↓</span>
        </div>
      )}
    </div>
  );
}
