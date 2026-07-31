"use client";

import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  /** Quiet aside under the action — a tip, or what shows up here once there's data. */
  hint?: string;
  className?: string;
  compact?: boolean;
}

// An empty state is usually someone's first impression of a feature, so it reads
// as an invitation rather than a dead end: what this space is for, and the one
// action that fills it.
export function EmptyState({
  icon: Icon, title, description, action, hint, className, compact,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center px-4 text-center",
        compact ? "py-10" : "py-16",
        className
      )}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-2xl bg-accent-500/20 blur-xl opacity-60" aria-hidden />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/[0.04] border border-border">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      {action && (
        <Button size="sm" className="mt-5" onClick={action.onClick}>{action.label}</Button>
      )}
      {hint && <p className="text-xs text-muted-foreground/70 max-w-xs mt-3">{hint}</p>}
    </motion.div>
  );
}
