"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Plus, ClipboardList, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkOrderCard } from "@/components/work-orders/work-order-card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, WORK_ORDER_STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/utils";
import { useWorkOrders, usePermissions } from "@/lib/data/hooks";
import type { WorkOrderStatus, WorkOrderPriority } from "@/types";

const STATUSES: WorkOrderStatus[] = ["open", "assigned", "in_progress", "waiting_parts", "completed", "cancelled"];
const PRIORITIES: WorkOrderPriority[] = ["critical", "high", "medium", "low"];

export default function WorkOrdersPage() {
  const { workOrders, loading } = useWorkOrders();
  const { can } = usePermissions();
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<WorkOrderStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<WorkOrderPriority | "all">("all");

  // Honor deep-links from the dashboard stat cards (?priority= / ?status=)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("priority");
    const s = params.get("status");
    if (p && (PRIORITIES as string[]).includes(p)) setPriorityFilter(p as WorkOrderPriority);
    if (s && (STATUSES as string[]).includes(s)) setStatusFilter(s as WorkOrderStatus);
  }, []);

  const filtered = useMemo(() => {
    return workOrders.filter((w) => {
      const matchSearch   = !search || w.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus   = statusFilter === "all" || w.status === statusFilter;
      const matchPriority = priorityFilter === "all" || w.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [workOrders, search, statusFilter, priorityFilter]);

  const counts = useMemo(() => ({
    open:        workOrders.filter((w) => w.status === "open").length,
    in_progress: workOrders.filter((w) => w.status === "in_progress").length,
    critical:    workOrders.filter((w) => w.priority === "critical" && w.status !== "completed").length,
  }), [workOrders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Work Orders</h1>
          <div className="flex items-center gap-3 mt-1.5 text-xs">
            <span className="text-muted-foreground">{workOrders.length} total</span>
            {counts.open > 0 && (
              <span className="bg-zinc-700/50 text-muted-foreground border border-border/40 px-2 py-0.5 rounded-md">
                {counts.open} open
              </span>
            )}
            {counts.in_progress > 0 && (
              <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                {counts.in_progress} in progress
              </span>
            )}
            {counts.critical > 0 && (
              <span className="bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-md animate-pulse-slow">
                {counts.critical} critical
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {can("work_orders.create") && (
            <Button asChild data-tour="new-work-order">
              <Link href="/work-orders/new">
                <Plus className="h-4 w-4" />
                New Work Order
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by title or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex items-center gap-1 bg-foreground/[0.03] border border-border rounded-xl p-1 w-max min-w-full">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              statusFilter === "all" ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {STATUSES.map((s) => {
            const cfg = WORK_ORDER_STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  statusFilter === s ? cn("border", cfg.bg, cfg.border, cfg.color) : "text-muted-foreground hover:text-foreground"
                )}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Priority:</span>
        {PRIORITIES.map((p) => {
          const cfg = PRIORITY_CONFIG[p];
          return (
            <button
              key={p}
              onClick={() => setPriorityFilter(priorityFilter === p ? "all" : p)}
              aria-pressed={priorityFilter === p}
              className={cn(
                // Roomier than a plain badge — these are filters people tap on a
                // phone, not labels.
                "badge min-h-[34px] px-3 cursor-pointer transition-all active:scale-[0.97]",
                priorityFilter === p
                  ? cn(cfg.bg, cfg.border, cfg.color)
                  : "bg-foreground/[0.03] border-border text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
              )}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card h-[68px] shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No work orders found"
          description={search ? "Try adjusting your search or filters." : "Create your first work order to get started."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((order, i) => (
            <WorkOrderCard key={order.id} order={order} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
