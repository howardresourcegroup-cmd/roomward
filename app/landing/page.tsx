"use client";

import Link from "next/link";
import {
  LayoutGrid, ClipboardList, BedDouble, KeyRound, MessageSquare,
  ArrowRight, Check, Building2, RefreshCw,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const SHOWCASE = [
  { img: "01-dashboard", title: "One dashboard for the whole property", body: "Active issues, rooms online, critical alerts, and average resolution time — all live, all in one view.", alt: "Roomward hotel operations dashboard with live work order stats and trends" },
  { img: "02-work-orders", title: "Every request, tracked end to end", body: "Log, assign, prioritize, and close hotel maintenance with full history — nothing falls through the cracks.", alt: "Hotel work order software list showing priorities, assignees, and statuses" },
  { img: "03-housekeeping", title: "A housekeeping board your crew actually uses", body: "Dirty → cleaning → ready, live — with room occupancy pulled straight from your PMS.", alt: "Hotel housekeeping board with dirty, in-progress, cleaned, and ready columns" },
  { img: "05-team-chat", title: "Maintenance, housekeeping, and front desk — talking", body: "Coordinate in real time, organized by channel and kept in context. Encrypted in transit and at rest.", alt: "Roomward team chat maintenance channel with encrypted messaging" },
];

const FEATURES = [
  { icon: LayoutGrid, title: "Live floor plans", body: "Map any property top-down. Every room color-coded by status, updating in real time." },
  { icon: ClipboardList, title: "Work order software", body: "Log, assign, photo-document, and close hotel maintenance — with full history and priorities." },
  { icon: BedDouble, title: "Housekeeping software", body: "Dirty → cleaning → ready, live. Front desk sees which rooms are ready the moment they are." },
  { icon: RefreshCw, title: "Syncs your PMS", body: "Two-way sync with RoomMaster and Eptura — adds a live operations layer, doesn't replace them." },
  { icon: KeyRound, title: "Roles & permissions", body: "Front desk, housekeeping, maintenance, GM — each role sees exactly what it needs. Fully configurable." },
  { icon: MessageSquare, title: "Team chat", body: "Coordinate in real time, organized by channel, encrypted in transit and at rest." },
];

const SOFTWARE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Roomward",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Hotel Maintenance & Operations Management Software",
  operatingSystem: "Web",
  url: "https://roomward.app",
  description:
    "Roomward is hotel operations management software — work orders, housekeeping, maintenance tracking, team chat, and PMS sync in one place.",
  offers: [
    { "@type": "Offer", price: "149", priceCurrency: "USD", name: "Standard", description: "Per property/month, up to 25 team members. 14-day free trial." },
    { "@type": "Offer", price: "249", priceCurrency: "USD", name: "Pro", description: "Per property/month, unlimited team members. 14-day free trial." },
  ],
  publisher: {
    "@type": "Organization",
    name: "Howard Resource Group LLC",
    url: "https://howardresourcegroup.com",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080811] text-zinc-100">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_SCHEMA) }} />
      {/* Background glow — desktop only; absolute (not fixed) so it doesn't repaint on scroll */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[700px] overflow-hidden hidden md:block">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[1000px] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8 rounded-lg shadow-lg shadow-indigo-500/30" />
          <span className="text-lg font-bold">Roomward</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Log in</Link>
          <Link href="/signup" className="btn-primary text-sm">Start free trial</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="animate-fade-in">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 mb-6">
            <Building2 className="h-3 w-3" /> Hotel maintenance &amp; operations management software
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
            Your property&apos;s operations<br />command center.
          </h1>
          <p className="text-lg text-zinc-400 mt-5 max-w-2xl mx-auto leading-relaxed">
            Roomward is your hotel operations assistant — work orders, housekeeping, maintenance tracking,
            team chat, and PMS sync in one place. Every issue seen, assigned, and resolved faster.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Link href="/signup" className="btn-primary text-base h-11 px-6">
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/demo" className="btn-secondary text-base h-11 px-6">
              View live demo
            </Link>
          </div>
          <p className="text-xs text-zinc-600 mt-4">14 days free · no credit card required</p>
        </div>
      </section>

      {/* Hero product shot */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
        <img
          src="/screenshots/00-property-map.webp"
          alt="Roomward hotel property map showing color-coded room status across four floors"
          width={1300}
          height={874}
          decoding="async"
          fetchPriority="high"
          className="w-full h-auto"
        />
      </section>

      {/* Feature showcase — alternating screenshots */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20 space-y-14 sm:space-y-20">
        {SHOWCASE.map((s, i) => (
          <div
            key={s.img}
            className={cn("flex flex-col items-center gap-6 md:gap-10 md:flex-row", i % 2 === 1 && "md:flex-row-reverse")}
          >
            <div className="md:w-2/5">
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight">{s.title}</h3>
              <p className="text-base text-zinc-400 mt-3 leading-relaxed">{s.body}</p>
            </div>
            <div className="md:w-3/5">
              <img src={`/screenshots/${s.img}.webp`} alt={s.alt} width={1300} height={877} loading="lazy" decoding="async" className="w-full h-auto" />
            </div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass-card p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/20 mb-3">
                <f.icon className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">{f.title}</h3>
              <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations strip */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-20 text-center">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Works with the systems you already run</p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-400">
          {["RoomMaster", "Eptura Asset", "Opera", "Cloudbeds", "Maestro", "Stripe"].map((n) => (
            <span key={n} className="font-medium">{n}</span>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-24">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">Simple, per-property pricing</h2>
          <p className="text-zinc-400 mt-2 text-sm">One plan includes everything. Scale up when your team does.</p>
          <a href="https://howardresourcegroup.com/business.html#hotel-stack" target="_blank" rel="noopener"
            className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-2">
            Save $100/mo when bundled with Managed IT <ArrowRight className="h-3 w-3" />
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Standard */}
          <div className="glass-card p-7 flex flex-col border-indigo-500/20">
            <p className="text-sm font-semibold text-indigo-300">Standard</p>
            <div className="flex items-baseline gap-1 mt-3">
              <span className="text-4xl font-bold">$149</span>
              <span className="text-zinc-500 text-sm">/mo per property</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Up to 25 team members</p>
            <ul className="space-y-2 mt-6 flex-1">
              {[
                "Every feature included",
                "Unlimited rooms & spaces",
                "Work orders, housekeeping, chat",
                "All PMS integrations",
                "Role-based permissions",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn-secondary w-full justify-center mt-6 h-11">
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-xs text-zinc-600 mt-2 text-center">14 days free · no credit card required</p>
          </div>

          {/* Pro */}
          <div className="glass-card p-7 flex flex-col relative overflow-hidden border-indigo-500/40 bg-indigo-500/[0.04]">
            <div className="absolute top-4 right-4 text-[10px] font-semibold tracking-wide text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 rounded-full px-2.5 py-0.5">
              FOR LARGER TEAMS
            </div>
            <p className="text-sm font-semibold text-indigo-300">Pro</p>
            <div className="flex items-baseline gap-1 mt-3">
              <span className="text-4xl font-bold">$249</span>
              <span className="text-zinc-500 text-sm">/mo per property</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Unlimited team members</p>
            <ul className="space-y-2 mt-6 flex-1">
              {[
                "Everything in Standard",
                "Unlimited team members",
                "Advanced reporting & analytics",
                "Custom roles & permissions",
                "Priority support",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn-primary w-full justify-center mt-6 h-11">
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-xs text-zinc-600 mt-2 text-center">14 days free · no credit card required</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <LogoMark className="h-4 w-4 rounded" />
            <span>© 2026 Roomward · by Howard Resource Group</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="hover:text-zinc-400 transition-colors">Blog</Link>
            <Link href="/login" className="hover:text-zinc-400 transition-colors">Log in</Link>
            <Link href="/signup" className="hover:text-zinc-400 transition-colors">Start free trial</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
