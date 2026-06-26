"use client";

// Lightweight imperative toast — call `toast.error("…")` from anywhere
// (event handlers, catch blocks) without threading a hook through props.
// A single <Toaster /> mounted in the dashboard layout renders the queue.

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; message: string; type: ToastType }

let counter = 0;
const listeners = new Set<(t: ToastItem) => void>();

function emit(message: string, type: ToastType) {
  const item = { id: ++counter, message, type };
  listeners.forEach((l) => l(item));
}

export const toast = {
  success: (message: string) => emit(message, "success"),
  error: (message: string) => emit(message, "error"),
  info: (message: string) => emit(message, "info"),
};

const CONFIG: Record<ToastType, { icon: React.ElementType; color: string; bar: string }> = {
  success: { icon: CheckCircle2,  color: "text-emerald-400", bar: "bg-emerald-400" },
  error:   { icon: AlertTriangle, color: "text-red-400",     bar: "bg-red-400" },
  info:    { icon: Info,          color: "text-indigo-400",  bar: "bg-indigo-400" },
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (t: ToastItem) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 5000);
    };
    listeners.add(onToast);
    return () => { listeners.delete(onToast); };
  }, []);

  const dismiss = (id: number) => setItems((prev) => prev.filter((x) => x.id !== id));

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none">
      <AnimatePresence>
        {items.map((t) => {
          const cfg = CONFIG[t.type];
          const Icon = cfg.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border border-border bg-card px-4 py-3 shadow-xl"
            >
              <span className={cn("absolute left-0 top-0 h-full w-1", cfg.bar)} />
              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.color)} />
              <p className="flex-1 text-sm text-foreground leading-snug">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
