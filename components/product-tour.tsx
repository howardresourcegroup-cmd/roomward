"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

// ── Interactive product tour ───────────────────────────────────────────────────
// Non-blocking: the overlay is visual-only (pointer-events: none). Users can
// click anything at any time — the tour is a guide, not a gate.
// On mobile: no overlay, tooltip docks to the bottom of the screen.
// Start: window.dispatchEvent(new CustomEvent("rw:start-tour"))

export const TOUR_DONE_KEY = "rw_tour_done";

interface TourStep {
  target: string;
  path?: string;
  title: string;
  body: string;
  placement?: "bottom" | "top" | "right" | "left";
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

const STEPS: TourStep[] = [
  {
    target: "stats", path: "/",
    title: "Your live command center",
    body: "Active issues, rooms online, critical alerts, and average resolution time — all updating in real time.",
    placement: "bottom",
  },
  {
    target: "nav-property", path: "/",
    title: "Open your Property Map",
    body: "Your whole property as a live floor plan — every room color-coded by occupancy, housekeeping, or condition.",
    placement: "right",
    desktopOnly: true,  // sidebar nav not visible on mobile
  },
  {
    target: "map-modes", path: "/property",
    title: "Three views of every room",
    body: "Flip between occupancy (who's in), housekeeping (what's clean), and condition (what's broken).",
    placement: "bottom",
  },
  {
    target: "map-grid", path: "/property",
    title: "Click any room to drill in",
    body: "Tap a room to see its guest, housekeeping state, every asset, and any open issues — all in one panel.",
    placement: "top",
  },
  {
    target: "nav-work-orders", path: "/property",
    title: "Track every request end-to-end",
    body: "Work Orders holds every issue — assigned, prioritized, and tracked from open to resolved.",
    placement: "right",
    desktopOnly: true,
  },
  {
    target: "new-work-order", path: "/work-orders",
    title: "Log anything in seconds",
    body: "New Work Order is always one tap away — pick the room, set priority, assign a teammate, and attach photos.",
    placement: "bottom",
  },
];

interface Rect { top: number; left: number; width: number; height: number }

export function ProductTour() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const targetRef = useRef<Element | null>(null);

  // Derive the visible steps for the current screen size
  const visibleSteps = isMobile
    ? STEPS.filter((s) => !s.desktopOnly)
    : STEPS.filter((s) => !s.mobileOnly);

  const current = visibleSteps[step];

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const start = () => { setStep(0); setActive(true); };
    window.addEventListener("rw:start-tour", start);
    return () => window.removeEventListener("rw:start-tour", start);
  }, []);

  const finish = useCallback(() => {
    localStorage.setItem(TOUR_DONE_KEY, "1");
    setActive(false);
    setRect(null);
  }, []);

  const next = useCallback(() => {
    setStep((s) => {
      if (s >= visibleSteps.length - 1) {
        localStorage.setItem(TOUR_DONE_KEY, "1");
        setActive(false);
        setRect(null);
        return s;
      }
      return s + 1;
    });
  }, [visibleSteps.length]);

  const prev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  // When the user navigates manually, jump to the first step that fits the new page
  // rather than fighting them with router.push back.
  useEffect(() => {
    if (!active) return;
    const matchIndex = visibleSteps.findIndex((s) => !s.path || s.path === pathname);
    if (matchIndex !== -1 && matchIndex !== step) setStep(matchIndex);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, active]);

  // Find + measure the target
  useEffect(() => {
    if (!active || !current) return;
    let cancelled = false;
    let tries = 0;
    setRect(null);
    targetRef.current = null;

    const measure = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      if (el) {
        targetRef.current = el;
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else if (tries++ < 30) {
        setTimeout(measure, 200);
      }
      // If element not found after 30 tries, rect stays null — tooltip shows centered
    };
    measure();

    const onRelayout = () => {
      const el = targetRef.current;
      if (!el || !document.contains(el)) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    window.addEventListener("resize", onRelayout);
    window.addEventListener("scroll", onRelayout, true);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onRelayout);
      window.removeEventListener("scroll", onRelayout, true);
    };
  }, [active, step, current, pathname]);

  if (!active || !current) return null;

  const pad = 6;
  const hole = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  // Tooltip position
  const tipStyle: React.CSSProperties = { position: "fixed", zIndex: 121, maxWidth: 320 };
  if (isMobile) {
    // Bottom sheet on mobile — doesn't depend on target position
    tipStyle.bottom = 16;
    tipStyle.left = 12;
    tipStyle.right = 12;
    tipStyle.maxWidth = "100%";
  } else if (hole) {
    const p = current.placement ?? "bottom";
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    if (p === "bottom") {
      tipStyle.top = Math.min(hole.top + hole.height + 12, screenH - 180);
      tipStyle.left = Math.max(12, Math.min(hole.left, screenW - 340));
    } else if (p === "top") {
      tipStyle.bottom = Math.max(12, screenH - hole.top + 12);
      tipStyle.left = Math.max(12, Math.min(hole.left, screenW - 340));
    } else if (p === "right") {
      tipStyle.top = Math.max(12, Math.min(hole.top, screenH - 200));
      tipStyle.left = Math.min(hole.left + hole.width + 12, screenW - 340);
    } else {
      tipStyle.top = Math.max(12, Math.min(hole.top, screenH - 200));
      tipStyle.right = Math.max(12, screenW - hole.left + 12);
    }
  } else {
    // Fallback: center tooltip — no full-screen blackout
    tipStyle.top = "30%";
    tipStyle.left = "50%";
    tipStyle.transform = "translateX(-50%)";
  }

  const isLast = step === visibleSteps.length - 1;

  return (
    <AnimatePresence>
      {/* The entire overlay is pointer-events:none — nothing is blocked */}
      <div className="fixed inset-0 z-[120] pointer-events-none">

        {/* Spotlight hole — desktop only, visual only */}
        {!isMobile && hole && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute rounded-xl ring-2 ring-accent-500/80"
            style={{
              top: hole.top, left: hole.left, width: hole.width, height: hole.height,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.40)",
              transition: "top .2s ease, left .2s ease, width .2s ease, height .2s ease",
            }}
          />
        )}

        {/* Mobile: just a subtle ring around the target, no overlay */}
        {isMobile && hole && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute rounded-xl ring-2 ring-accent-500/80 ring-offset-2"
            style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
          />
        )}

        {/* Tooltip — pointer-events-auto so it can be interacted with */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.18 }}
          style={tipStyle}
          className="pointer-events-auto glass-card p-4 shadow-2xl border-accent-500/30"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-foreground leading-snug">{current.title}</p>
            <button onClick={finish} title="End tour"
              className="text-muted-foreground hover:text-foreground shrink-0 transition-colors mt-0.5">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{current.body}</p>

          {/* Progress dots */}
          <div className="flex items-center gap-1 mt-3">
            {visibleSteps.map((_, i) => (
              <button key={i} onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-4 bg-accent-text" : "w-1.5 bg-foreground/20"}`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-3">
            <button onClick={finish}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button onClick={prev}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
              )}
              <button onClick={isLast ? finish : next}
                className="btn-primary h-7 px-3 text-[11px]">
                {isLast
                  ? <><Sparkles className="h-3 w-3" /> Done</>
                  : <>Next <ArrowRight className="h-3 w-3" /></>}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function startProductTour() {
  window.dispatchEvent(new CustomEvent("rw:start-tour"));
}
