"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Search, LogOut, Settings as SettingsIcon, User, CheckCheck, AlertTriangle, Sparkles, Wrench, Menu } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useCurrentProfileState, useWorkOrders, useBuildings, useProfiles } from "@/lib/data/hooks";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { getInitials, cn, timeAgo } from "@/lib/utils";
import { ClipboardList, Building2 } from "lucide-react";

const PAGE_META: Record<string, { title: string }> = {
  "/": { title: "Operations Dashboard" },
  "/buildings": { title: "Buildings" },
  "/property": { title: "Property Map" },
  "/work-orders": { title: "Work Orders" },
  "/housekeeping": { title: "Housekeeping Board" },
  "/messages": { title: "Team Chat" },
  "/technicians": { title: "Technicians" },
  "/assets": { title: "Assets" },
  "/reports": { title: "Reports" },
  "/settings": { title: "Settings" },
  "/help": { title: "Help & Guides" },
};

export function Header() {
  const pathname = usePathname();
  const { profile, loading: profileLoading, error: profileError } = useCurrentProfileState();
  const { workOrders } = useWorkOrders();
  const { buildings } = useBuildings();
  const { profiles } = useProfiles();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Global search across work orders, buildings, and people
  const results = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as { href: string; label: string; kind: string; icon: React.ElementType }[];
    const out: { href: string; label: string; kind: string; icon: React.ElementType }[] = [];
    for (const w of workOrders) if (w.title.toLowerCase().includes(q)) out.push({ href: `/work-orders/${w.id}`, label: w.title, kind: "Order", icon: ClipboardList });
    for (const b of buildings) if (b.name.toLowerCase().includes(q)) out.push({ href: `/buildings/${b.id}`, label: b.name, kind: "Building", icon: Building2 });
    for (const p of profiles) if (p.full_name.toLowerCase().includes(q)) out.push({ href: `/technicians`, label: p.full_name, kind: "Person", icon: User });
    return out.slice(0, 8);
  })();

  // Derive notifications from the most recent active, high-signal work orders
  const notifications = workOrders
    .filter((w) => w.status !== "completed" && w.status !== "cancelled")
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 6);
  const notificationCount = notifications.filter((w) => w.priority === "critical" || w.priority === "high").length;

  const { toggleMobileSidebar } = useAppStore();

  const signOut = async () => {
    const supabase = createClient();
    try { await supabase.rpc("end_demo"); } catch { /* tears down demo sandbox; no-op for real accounts */ }
    await supabase.auth.signOut().catch(() => {});
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    // Hard navigation so the middleware re-runs with the cleared cookies (router.push kept the session)
    window.location.href = "/login";
  };

  const notifIcon = (priority: string) =>
    priority === "critical" ? AlertTriangle : priority === "high" ? Wrench : Sparkles;

  const meta = Object.entries(PAGE_META).find(([key]) =>
    key === "/" ? pathname === "/" : pathname.startsWith(key)
  )?.[1] ?? { title: "Roomward" };

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 flex-shrink-0">
      {/* Hamburger — mobile only */}
      <button onClick={toggleMobileSidebar}
        className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors flex-shrink-0">
        <Menu className="h-5 w-5" />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-foreground truncate">{meta.title}</h1>
      </div>

      {/* Search */}
      <AnimatePresence>
        {searchOpen ? (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-[calc(100vw-9rem)] sm:max-w-none"
          >
            <Input
              autoFocus
              placeholder="Search orders, buildings, people…"
              className="h-8 text-xs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            />
            {query.trim().length > 0 && (
              <div className="absolute top-9 left-0 right-0 rounded-xl border border-border bg-card shadow-2xl p-1.5 max-h-80 overflow-y-auto z-50">
                {results.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-3 py-3 text-center">No matches</p>
                ) : results.map((r) => (
                  <Link key={r.href} href={r.href} onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setSearchOpen(false); setQuery(""); }}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-foreground/[0.06] transition-colors">
                    <r.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-foreground truncate flex-1">{r.label}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{r.kind}</span>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSearchOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
          >
            <Search className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40">
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80">
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            <span className="text-[10px] text-muted-foreground">{notifications.length} active</span>
          </div>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <CheckCheck className="h-5 w-5 text-emerald-400 mb-1.5" />
              <p className="text-xs text-muted-foreground">You&apos;re all caught up</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((w) => {
                const Icon = notifIcon(w.priority);
                const color = w.priority === "critical" ? "text-red-400" : w.priority === "high" ? "text-orange-400" : "text-muted-foreground";
                return (
                  <DropdownMenuItem key={w.id} asChild>
                    <Link href={`/work-orders/${w.id}`} className="flex items-start gap-2.5">
                      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", color)} />
                      <span className="min-w-0">
                        <span className="block text-xs text-foreground truncate">{w.title}</span>
                        <span className="block text-[10px] text-muted-foreground">
                          {w.space?.name ? `${w.space.name} · ` : ""}{timeAgo(w.created_at)}
                        </span>
                      </span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/work-orders" className="justify-center text-xs text-accent-text">View all work orders</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Account */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40">
            <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-accent-500/40 transition-all">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">{getInitials(profile?.full_name ?? "U")}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60">
          <DropdownMenuLabel>
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs">{getInitials(profile?.full_name ?? "U")}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.full_name ?? (profileLoading ? "Loading…" : "Account")}
                </p>
                <p className="text-[11px] text-muted-foreground capitalize truncate">
                  {profile?.role ?? (profileError ? "Role unavailable" : profileLoading ? "…" : "No role set")}
                </p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings"><User className="text-muted-foreground" />Profile &amp; account</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings"><SettingsIcon className="text-muted-foreground" />Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onClick={signOut}>
            <LogOut />Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
