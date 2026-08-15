"use client";

import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, Eye, EyeOff, RotateCcw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DASHBOARD_LAYOUT_VERSION, DEPARTMENTS, resolveLayout, reorderVisible, toggleVisible, getWidget,
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
  /** Drives what "Reset" restores — the same starting layout this role would get. */
  roleSlug?: string | null;
}

/**
 * Per-user dashboard editor. Changes are staged locally and only applied on
 * save, so someone can experiment and back out — the dashboard behind the dialog
 * doesn't rearrange under them while they think.
 */
export function CustomizeDashboard({ open, onOpenChange, layout, onSave, can, roleSlug }: Props) {
  const [draft, setDraft] = useState<DashboardWidgetPref[]>(() => resolveLayout(layout, roleSlug));
  const [grouped, setGrouped] = useState(true);

  // Re-seed whenever the dialog opens, so a cancelled edit doesn't linger.
  useEffect(() => {
    if (open) setDraft(resolveLayout(layout, roleSlug));
  }, [open, layout, roleSlug]);

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

        {/* Two jobs, two modes. Picking panels is a browse-by-department task;
            arranging them is an ordering task over just the ones you kept. */}
        <div className="flex w-fit max-w-full overflow-x-auto rounded-lg border border-border p-0.5 gap-0.5">
          {([
            { key: true,  label: "Choose panels" },
            { key: false, label: `Arrange (${visibleCount})` },
          ]).map(({ key, label }) => (
            <button key={String(key)} onClick={() => setGrouped(key)}
              className={cn(
                "whitespace-nowrap text-xs px-3 py-1.5 rounded-md transition-colors min-h-[32px]",
                grouped === key ? "bg-foreground/[0.08] text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}>
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5 max-h-[46vh] overflow-y-auto -mx-1 px-1 py-1">
          {grouped ? (
            DEPARTMENTS.map((dept) => {
              const inDept = editable.filter((p) => getWidget(p.id)?.department === dept);
              if (inDept.length === 0) return null;
              const shown = inDept.filter((p) => p.visible).length;
              return (
                <div key={dept} className="pt-1">
                  <div className="flex items-center justify-between px-1 mb-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{dept}</p>
                    <span className="text-[10px] text-muted-foreground/70 tabular-nums">{shown}/{inDept.length}</span>
                  </div>
                  <div className="space-y-1">
                    {inDept.map((pref) => {
                      const w = getWidget(pref.id)!;
                      return (
                        <button
                          key={pref.id}
                          onClick={() => setDraft((d) => toggleVisible(d, pref.id))}
                          aria-pressed={pref.visible}
                          className={cn(
                            "w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                            pref.visible
                              ? "border-indigo-500/40 bg-indigo-500/[0.07]"
                              : "border-border/60 hover:bg-foreground/[0.03]"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-sm font-medium truncate", pref.visible ? "text-foreground" : "text-muted-foreground")}>
                              {w.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">{w.description}</p>
                          </div>
                          {pref.visible
                            ? <Eye className="h-4 w-4 text-indigo-400 shrink-0" />
                            : <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            editable.filter((p) => p.visible).map((pref, index, arr) => {
              const w = getWidget(pref.id)!;
              return (
                <div key={pref.id} className="flex items-center gap-2 rounded-lg border border-border bg-foreground/[0.03] px-3 py-2">
                  <div className="flex flex-col shrink-0">
                    <button
                      onClick={() => setDraft((d) => reorderVisible(d, pref.id, "up"))}
                      disabled={index === 0}
                      aria-label={`Move ${w.title} up`}
                      className="h-5 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDraft((d) => reorderVisible(d, pref.id, "down"))}
                      disabled={index === arr.length - 1}
                      aria-label={`Move ${w.title} down`}
                      className="h-5 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{w.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{w.department}</p>
                  </div>
                  <button
                    onClick={() => setDraft((d) => toggleVisible(d, pref.id))}
                    aria-label={`Hide ${w.title}`}
                    className="h-8 w-8 flex items-center justify-center rounded-lg shrink-0 text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {visibleCount === 0 && (
          <p className="text-xs text-amber-400">
            Everything is hidden — your dashboard will be empty until you show something.
          </p>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost" size="sm"
            onClick={() => setDraft(resolveLayout(null, roleSlug))}
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
