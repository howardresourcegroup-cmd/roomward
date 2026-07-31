"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, MessageSquare, Calendar, ArrowRight } from "lucide-react";
import type { WorkOrder } from "@/types";
import { cn, PRIORITY_CONFIG, WORK_ORDER_STATUS_CONFIG, timeAgo, formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface WorkOrderCardProps {
  order: WorkOrder;
  index?: number;
}

export function WorkOrderCard({ order, index = 0 }: WorkOrderCardProps) {
  const pCfg = PRIORITY_CONFIG[order.priority];
  const sCfg = WORK_ORDER_STATUS_CONFIG[order.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Link
        href={`/work-orders/${order.id}`}
        className="group flex items-start gap-4 glass-card px-5 py-4 hover:border-border hover:bg-card transition-all duration-200"
      >
        {/* Priority stripe — pCfg.dot is a static color class (e.g. bg-red-400) */}
        <div className={cn("w-1 self-stretch rounded-full shrink-0", pCfg.dot)} />

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-medium text-foreground group-hover:text-white transition-colors leading-snug line-clamp-1">
              {order.title}
            </h3>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0 mt-0.5" />
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {order.space?.name && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />
                {order.space.floor?.building?.name
                  ? `${order.space.floor.building.name} · `
                  : ""}
                {order.space.name}
              </span>
            )}
            {(order._comment_count ?? 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" />
                {order._comment_count}
              </span>
            )}
            {order.due_date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                Due {formatDate(order.due_date)}
              </span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Badges */}
          <div className="flex items-center gap-1.5">
            <span className={cn("badge", pCfg.bg, pCfg.border, pCfg.color, "gap-1.5")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", pCfg.dot)} />
              {pCfg.label}
            </span>
            <span className={cn("badge", sCfg.bg, sCfg.border, sCfg.color)}>
              {sCfg.label}
            </span>
          </div>

          {/* Assignee + time */}
          <div className="flex items-center gap-2">
            {order.assignee ? (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px] bg-indigo-500/20 text-indigo-300">
                    {getInitials(order.assignee.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">{order.assignee.full_name.split(" ")[0]}</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Unassigned</span>
            )}
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{timeAgo(order.created_at)}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
