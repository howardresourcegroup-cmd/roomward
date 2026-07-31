"use client";

import { CloudOff, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  /** What failed, in the user's terms — "announcements", "this floor plan". */
  what?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

// Shown when a panel's data didn't load. Deliberately unalarming: this is almost
// always a dropped connection, not a catastrophe, and the useful thing to offer
// is another go — not an error code the user can't act on.
export function ErrorState({ what = "this", onRetry, className, compact }: ErrorStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center px-4",
      compact ? "py-8" : "py-14",
      className
    )}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-3">
        <CloudOff className="h-5 w-5 text-amber-400" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">
        We couldn&apos;t load {what} just now
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mt-1">
        Usually a brief connection hiccup. Nothing has been lost.
      </p>
      {onRetry && (
        <Button size="sm" variant="outline" className="mt-4" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
