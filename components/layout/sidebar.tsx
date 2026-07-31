"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Building2, ClipboardList, Users,
  Settings, ChevronLeft, Package, BarChart3, LogOut, MessageSquare, HelpCircle, BedDouble, Map, X, ConciergeBell, Megaphone,
  UtensilsCrossed, PartyPopper,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { usePermissions, useCurrentProfile } from "@/lib/data/hooks";
import { LogoMark } from "@/components/brand/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", perm: "dashboard.view" },
  { href: "/buildings", icon: Building2, label: "Buildings", perm: "buildings.view" },
  { href: "/property", icon: Map, label: "Property Map", perm: "buildings.view" },
  { href: "/work-orders", icon: ClipboardList, label: "Work Orders", perm: "work_orders.view" },
  { href: "/housekeeping", icon: BedDouble, label: "Housekeeping", perm: "buildings.view" },
  { href: "/front-desk", icon: ConciergeBell, label: "Front Desk", perm: "buildings.view" },
  { href: "/food-beverage", icon: UtensilsCrossed, label: "Food & Beverage", perm: "fnb.view" },
  { href: "/banquets", icon: PartyPopper, label: "Banquets", perm: "banquets.view" },
  { href: "/messages", icon: MessageSquare, label: "Team Chat", perm: "chat.participate" },
  { href: "/corporate", icon: Megaphone, label: "Corporate", perm: "dashboard.view" },
  { href: "/technicians", icon: Users, label: "Technicians", perm: "team.view" },
  { href: "/assets", icon: Package, label: "Assets", perm: "assets.view" },
  { href: "/reports", icon: BarChart3, label: "Reports", perm: "reports.view" },
];

const BOTTOM_ITEMS = [
  { href: "/help", icon: HelpCircle, label: "Help & Guides" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

function NavContent({ collapsed, onNav }: { collapsed: boolean; onNav?: () => void }) {
  const pathname = usePathname();
  const profile = useCurrentProfile();
  const { can, loading: permsLoading } = usePermissions();
  const navItems = NAV_ITEMS.filter((i) => permsLoading || can(i.perm));
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  const signOut = async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    try { await supabase.rpc("end_demo"); } catch { /* tears down demo sandbox; no-op for real accounts */ }
    await supabase.auth.signOut().catch(() => {});
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    window.location.href = "/login";
  };

  return (
    <>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          const item = (
            <Link key={href} href={href} onClick={onNav}
              data-tour={href === "/property" ? "nav-property" : href === "/work-orders" ? "nav-work-orders" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active ? "bg-accent-500/15 text-accent-text" : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05]"
              )}>
              {active && (
                <motion.div layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-accent-500/15"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }} />
              )}
              <Icon className={cn("h-4 w-4 shrink-0 relative z-10", active && "text-accent-text")} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.15 }} className="relative z-10 whitespace-nowrap overflow-hidden">
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
          if (collapsed) {
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>{item}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          }
          return item;
        })}
      </nav>

      <div className="border-t border-border px-2 py-3 space-y-0.5">
        {BOTTOM_ITEMS.map(({ href, icon: Icon, label }) => {
          const item = (
            <Link key={href} href={href} onClick={onNav}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition-all duration-150">
              <Icon className="h-4 w-4 shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap overflow-hidden">{label}</motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
          if (collapsed) {
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>{item}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          }
          return item;
        })}

        <button onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/[0.08] transition-all duration-150">
          <LogOut className="h-4 w-4 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap overflow-hidden">Sign Out</motion.span>
            )}
          </AnimatePresence>
        </button>

        <div className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 mt-1", collapsed && "justify-center px-2")}>
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px]">{getInitials(profile?.full_name ?? "User")}</AvatarFallback>
          </Avatar>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0 overflow-hidden">
                <p className="text-xs font-medium text-foreground truncate">{profile?.full_name ?? "Team Member"}</p>
                <p className="text-[10px] text-muted-foreground capitalize truncate">{profile?.role ?? "viewer"}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────
export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore();

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 232 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="relative hidden md:flex h-screen flex-col bg-card border-r border-border z-20 flex-shrink-0"
      >
        <div className="flex h-14 items-center gap-3 px-4 border-b border-border">
          <LogoMark className="h-8 w-8 shrink-0 rounded-lg shadow-lg shadow-accent-500/25" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="text-sm font-bold text-foreground tracking-tight whitespace-nowrap overflow-hidden">
                Roomward
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <NavContent collapsed={sidebarCollapsed} />

        <button onClick={toggleSidebar}
          className="absolute -right-3 top-[4.5rem] flex h-6 w-6 items-center justify-center rounded-full bg-card-hover border border-border text-muted-foreground hover:text-foreground transition-colors shadow-lg">
          <motion.div animate={{ rotate: sidebarCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronLeft className="h-3 w-3" />
          </motion.div>
        </button>
      </motion.aside>
    </TooltipProvider>
  );
}

// ── Mobile drawer (slide-in overlay) ─────────────────────────────────────────
export function MobileSidebar() {
  const { mobileSidebarOpen, closeMobileSidebar } = useAppStore();
  const pathname = usePathname();

  // Always close the drawer when the route changes — covers any path that
  // navigates without going through a nav link's onNav handler.
  useEffect(() => { closeMobileSidebar(); }, [pathname, closeMobileSidebar]);

  return (
    <AnimatePresence>
      {mobileSidebarOpen && (
        <TooltipProvider delayDuration={0}>
          {/* Backdrop — plain div (no exit animation): an interrupted framer-motion
              exit during route change could leave it invisibly mounted, eating all
              taps on the header/hamburger. Unmounting instantly avoids that. */}
          <div
            className="fixed inset-0 bg-black/60 z-[130] md:hidden animate-fade-in"
            onClick={closeMobileSidebar} />

          {/* Drawer */}
          <motion.aside
            initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 h-full w-64 flex flex-col bg-card border-r border-border z-[135] md:hidden"
          >
            <div className="flex h-14 items-center justify-between px-4 border-b border-border">
              <div className="flex items-center gap-3">
                <LogoMark className="h-8 w-8 shrink-0 rounded-lg shadow-lg shadow-accent-500/25" />
                <span className="text-sm font-bold text-foreground tracking-tight">Roomward</span>
              </div>
              <button onClick={closeMobileSidebar}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavContent collapsed={false} onNav={closeMobileSidebar} />
          </motion.aside>
        </TooltipProvider>
      )}
    </AnimatePresence>
  );
}
