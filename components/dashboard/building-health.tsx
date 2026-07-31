"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";
import type { Building } from "@/types";
import { cn } from "@/lib/utils";
import { MOCK_BUILDINGS } from "@/lib/mock-data";

const BUILDING_HEALTH = [
  { id: "b1", operational: 92, total: 144 },
  { id: "b2", operational: 88, total: 185 },
  { id: "b3", operational: 94, total: 67 },
  { id: "b4", operational: 100, total: 88 },
];

function HealthBar({ pct }: { pct: number }) {
  const color = pct >= 95 ? "bg-emerald-500" : pct >= 80 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-1.5 w-full rounded-full bg-foreground/[0.06] overflow-hidden">
      <motion.div
        className={cn("h-full rounded-full", color)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

export function BuildingHealth({ buildings = MOCK_BUILDINGS }: { buildings?: Building[] }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Building Status</p>
          <p className="text-base font-semibold text-foreground mt-0.5">Portfolio Health</p>
        </div>
        <Link href="/buildings" className="tap-relaxed text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-4">
        {buildings.map((b, i) => {
          const health = BUILDING_HEALTH.find((h) => h.id === b.id) ?? { operational: 90, total: 100 };
          const pct = health.operational;
          const color = pct >= 95 ? "text-emerald-400" : pct >= 80 ? "text-amber-400" : "text-red-400";

          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link href={`/buildings/${b.id}`} className="block group space-y-2 hover:opacity-80 transition-opacity">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground truncate">{b.name}</span>
                    {(b._issue_count ?? 0) > 0 && (
                      <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                        {b._issue_count} issues
                      </span>
                    )}
                  </div>
                  <span className={cn("text-xs font-semibold tabular-nums", color)}>{pct}%</span>
                </div>
                <HealthBar pct={pct} />
                <p className="text-[11px] text-muted-foreground">
                  {b.city}, {b.state} · {b._floor_count} floors · {b._space_count} spaces
                </p>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
