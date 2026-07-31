"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Lock } from "lucide-react";
import { useBilling } from "@/lib/data/hooks";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "./upgrade-modal";
import { cn } from "@/lib/utils";

export function TrialBanner() {
  const { isActive, isTrialing, isExpired, daysLeft, loading, reload } = useBilling();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    const { createClient } = await import("@/lib/supabase/client");
    await createClient().auth.signOut().catch(() => {});
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    window.location.href = "/login";
  };

  if (loading || isActive) return null;

  // Trial active → slim countdown bar
  if (isTrialing) {
    const urgent = daysLeft <= 3;
    return (
      <>
        <div className={cn(
          "flex items-center justify-center gap-3 px-4 py-1.5 text-xs border-b",
          urgent ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
        )}>
          <Sparkles className="h-3.5 w-3.5" />
          <span>
            {daysLeft} {daysLeft === 1 ? "day" : "days"} left in your free trial
          </span>
          <button onClick={() => setOpen(true)} className="font-semibold underline underline-offset-2 hover:opacity-80">
            Upgrade now
          </button>
        </div>
        <UpgradeModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  // Trial expired → full soft paywall overlay.
  // It covers the app, so it always keeps two ways out: re-check the plan (in case
  // a payment just landed, or the org read was stale) and sign out. A blocking
  // screen with no exit is how people get stranded.
  if (isExpired) {
    return (
      <>
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md glass-card p-7 text-center"
          >
            <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Your free trial has ended</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Subscribe to keep your team running on Roomward. Every building, work order,
              and photo is exactly where you left it.
            </p>
            <Button className="w-full mt-5" onClick={() => setOpen(true)}>
              <Sparkles className="h-4 w-4" />
              Subscribe to Roomward Pro
            </Button>
            <div className="flex items-center justify-center gap-4 mt-4 text-[11px]">
              <button onClick={reload} className="text-muted-foreground hover:text-foreground transition-colors">
                Already subscribed? Refresh
              </button>
              <span className="text-border">·</span>
              <button onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors">
                Sign out
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">Questions? support@roomward.app</p>
          </motion.div>
        </div>
        <UpgradeModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return null;
}
