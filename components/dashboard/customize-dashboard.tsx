"use client";

import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, Eye, EyeOff, RotateCcw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DASHBOARD_LAYOUT_VERSION, resolveLayout, reorder, toggleVisible, getWidget,
} from "@/lib/dashboard-widgets";
import { cn } from "@/lib/utils";
import type { DashboardLayout, DashboardWidgetPref } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout: DashboardLayout | null;
  onSave: (layout: DashboardLayout) => void;
  /** Widgets the user can't see are hidden from the editor entirely. */
  can: (permission: string) => boolean;
}

/**
 * Per-user dashboard editor. Changes are staged locally and only applied on
 * save, so someone can experiment and back out — the dashboard behind the dialog
 * doesn't rearrange under them while they think.
 */
export function CustomizeDashboard({ open, onOpenChange, layout, onSave, can }: Props) {
  const [draft, setDraft] = useState<DashboardWidgetPref[]>(() => resolveLayout(layout));

  // Re-seed whenever the dialog opens, so a cancelled edit doesn't linger.
  useEffect(() => {
    if (open) setDraft(resolveLayout(layout));
  }, [open, layout]);

  const editable = draft.filter((p) => {
    const w = getWidget(p.id);
    return w && (!w.permission || can(w.permission));
  });

  const visibleCount = editable.filter((p) => p.visible).length;

  const commit = () => {
    onSave({ version: DASHBOARD_LAYOUT_VERSION, widgets: draft });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" /> Customize your dashboard
          </DialogTitle>
          <DialogDescription>
            Show, hide and reorder the panels on your home view. This is yours alone —
            it doesn&apos;t change what anyone else sees.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 max-h-[52vh] overflow-y-auto -mx-1 px-1 py-1">
          {editable.map((pref, index) => {
            const w = getWidget(pref.id);
            if (!w) return null;
            const first = index === 0;
            const last = index === editable.length - 1;
            return (
              <div
                key={pref.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
                  pref.visible ? "border-border bg-foreground/[0.03]" : "border-border/60 bg-transparent"
                )}
              >
                <div className="flex flex-col shrink-0">
                  <button
                    onClick={() => setDraft((d) => reorder(d, pref.id, "up"))}
                    disabled={first}
                    aria-label={`Move ${w.title} up`}
                    className="h-5 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDraft((d) => reorder(d, pref.id, "down"))}
                    disabled={last}
                    aria-label={`Move ${w.title} down`}
                    className="h-5 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium truncate", pref.visible ? "text-foreground" : "text-muted-foreground")}>
                    {w.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{w.description}</p>
                </div>

                <button
                  onClick={() => setDraft((d) => toggleVisible(d, pref.id))}
                  aria-pressed={pref.visible}
                  aria-label={pref.visible ? `Hide ${w.title}` : `Show ${w.title}`}
                  className={cn(
                    "h-8 w-8 flex items-center justify-center rounded-lg shrink-0 transition-colors",
                    pref.visible
                      ? "text-indigo-400 hover:bg-indigo-500/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
                  )}
                >
                  {pref.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            );
          })}
        </div>

        {visibleCount === 0 && (
          <p className="text-xs text-amber-400">
            Everything is hidden — your dashboard will be empty until you show something.
          </p>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost" size="sm"
            onClick={() => setDraft(resolveLayout(null))}
            title="Restore the built-in arrangement"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={commit}>Save layout</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
