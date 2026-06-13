"use client";

import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useBuildings } from "@/lib/data/hooks";
import { LogoMark } from "@/components/brand/logo";
import { BuildingSetupForm } from "./building-setup-form";

// Pages that must stay reachable even before a building exists — account-level
// settings, profile, appearance, billing, and help don't depend on a property.
const ALWAYS_ALLOWED = ["/settings", "/help", "/corporate"];

export function BuildingSetupGuard({ children }: { children: React.ReactNode }) {
  const { buildings, loading, reload } = useBuildings();
  const pathname = usePathname();
  const bypass = ALWAYS_ALLOWED.some((p) => pathname.startsWith(p));

  if (bypass) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (buildings.length === 0) return <FirstTimeSetup onDone={reload} />;
  return <>{children}</>;
}

function FirstTimeSetup({ onDone }: { onDone: () => void }) {
  return (
    <div className="min-h-full flex items-center justify-center py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="flex flex-col items-center text-center mb-6">
          <LogoMark className="h-11 w-11 rounded-xl shadow-lg shadow-indigo-500/25 mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Set up your first property</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
            Describe it in plain English and AI will configure the floors and rooms — or set it up manually.
          </p>
        </div>

        <div className="glass-card p-6">
          <BuildingSetupForm onDone={onDone} submitLabel="Create property" aiFirst={true} />
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-4">
          You can add more buildings, floors, and rooms anytime.
        </p>
      </motion.div>
    </div>
  );
}
