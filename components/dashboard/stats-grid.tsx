"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Users, Siren, TrendingUp, Clock, ArrowUpRight } from "lucide-react";
import type { DashboardStats } from "@/types";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: "indigo" | "emerald" | "amber" | "red" | "cyan" | "violet";
  trend?: { value: number; up: boolean };
  delay?: number;
  pulse?: boolean;
  href?: string;
}

const COLOR_MAP = {
  indigo:  { bg: "bg-indigo-500/15",  icon: "text-indigo-400",  ring: "ring-indigo-500/20",  glow: "shadow-indigo-500/10" },
  emerald: { bg: "bg-emerald-500/15", icon: "text-emerald-400", ring: "ring-emerald-500/20", glow: "shadow-emerald-500/10" },
  amber:   { bg: "bg-amber-500/15",   icon: "text-amber-400",   ring: "ring-amber-500/20",   glow: "shadow-amber-500/10" },
  red:     { bg: "bg-red-500/15",     icon: "text-red-400",     ring: "ring-red-500/20",     glow: "shadow-red-500/10" },
  cyan:    { bg: "bg-cyan-500/15",    icon: "text-cyan-400",    ring: "ring-cyan-500/20",    glow: "shadow-cyan-500/10" },
  violet:  { bg: "bg-violet-500/15",  icon: "text-violet-400",  ring: "ring-violet-500/20",  glow: "shadow-violet-500/10" },
};

function StatCard({ label, value, sub, icon: Icon, color, trend, delay = 0, pulse, href }: StatCardProps) {
  const c = COLOR_MAP[color];
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={cn(
        "glass-card p-5 flex flex-col gap-4 transition-all duration-200 shadow-lg group h-full",
        c.glow,
        href ? "hover:border-border hover:-translate-y-0.5 cursor-pointer" : "hover:border-border"
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg ring-1 relative", c.bg, c.ring)}>
          <Icon className={cn("h-4 w-4", c.icon, pulse && "animate-pulse")} />
        </div>
      </div>

      <div className="space-y-1">
        <motion.p
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: delay + 0.1, type: "spring", bounce: 0.3 }}
          className="text-3xl font-bold text-foreground tabular-nums"
        >
          {value}
        </motion.p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>

      {trend ? (
        <div className={cn("flex items-center gap-1 text-xs font-medium", trend.up ? "text-emerald-400" : "text-red-400")}>
          <TrendingUp className={cn("h-3 w-3", !trend.up && "rotate-180")} />
          <span>{trend.value}% vs last week</span>
        </div>
      ) : href ? (
        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          <span>View</span>
          <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </div>
      ) : null}
    </motion.div>
  );

  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

export function StatsGrid({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <div className="xl:col-span-1">
        <StatCard
          label="Active Issues"
          value={stats.active_issues}
          sub="across all buildings"
          icon={AlertTriangle}
          color="amber"
          trend={{ value: 12, up: false }}
          delay={0}
          href="/work-orders"
        />
      </div>
      <div className="xl:col-span-1">
        <StatCard
          label="Operational"
          value={`${stats.operational_percent}%`}
          sub="rooms online"
          icon={CheckCircle2}
          color="emerald"
          trend={{ value: 3, up: true }}
          delay={0.05}
          href="/buildings"
        />
      </div>
      <div className="xl:col-span-1">
        <StatCard
          label="Techs Online"
          value={stats.technicians_online}
          sub="currently active"
          icon={Users}
          color="indigo"
          delay={0.1}
          href="/technicians"
        />
      </div>
      <div className="xl:col-span-1">
        <StatCard
          label="Critical Alerts"
          value={stats.critical_alerts}
          sub="need attention now"
          icon={Siren}
          color="red"
          delay={0.15}
          pulse={stats.critical_alerts > 0}
          href="/work-orders?priority=critical"
        />
      </div>
      <div className="xl:col-span-1">
        <StatCard
          label="Closed Today"
          value={stats.completed_today}
          sub="work orders resolved"
          icon={CheckCircle2}
          color="cyan"
          delay={0.2}
          href="/work-orders?status=completed"
        />
      </div>
      <div className="xl:col-span-1">
        <StatCard
          label="Avg. Resolution"
          value={`${stats.avg_resolution_hours}h`}
          sub="mean time to close"
          icon={Clock}
          color="violet"
          delay={0.25}
          href="/reports"
        />
      </div>
    </div>
  );
}
