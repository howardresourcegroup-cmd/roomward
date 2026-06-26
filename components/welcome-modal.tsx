"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { startProductTour } from "@/components/product-tour";

export const WELCOME_SEEN_KEY = "ff-welcome-seen";
const STORE_KEY = WELCOME_SEEN_KEY;

const SLIDES = [
  { icon: Zap, color: "text-indigo-400", bg: "bg-indigo-500/15", title: "Welcome to Roomward", body: "Your operational command center for physical spaces. Take a 60-second hands-on tour — we'll walk you through the real app, page by page." },
];

export function WelcomeModal() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORE_KEY)) setShow(true);
  }, []);

  const close = () => { localStorage.setItem(STORE_KEY, "1"); setShow(false); };

  if (!show) return null;
  const slide = SLIDES[step];
  const Icon = slide.icon;
  const isLast = step === SLIDES.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        onClick={close}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md glass-card p-7 overflow-hidden"
        >
          <button onClick={close} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center mb-5", slide.bg)}>
                <Icon className={cn("h-7 w-7", slide.color)} />
              </div>
              <h2 className="text-xl font-bold text-foreground">{slide.title}</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{slide.body}</p>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div className="flex items-center gap-1.5 mt-6">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setStep(i)}
                className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-indigo-500" : "w-1.5 bg-foreground/[0.15]")} />
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
            {isLast ? (
              <Button asChild variant="ghost" size="sm" onClick={close}>
                <Link href="/help">Browse guides</Link>
              </Button>
            ) : (
              <button onClick={close} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Skip</button>
            )}
            <Button size="sm" onClick={() => {
              if (isLast) {
                close();
                startProductTour(); // hands off to the interactive, in-app tour
              } else setStep(step + 1);
            }}>
              {isLast ? "Show me around" : "Next"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
