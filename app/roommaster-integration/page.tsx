import type { Metadata } from "next";
import { RefreshCw, ArrowLeftRight, Sparkles, Wrench, Bell, ShieldCheck } from "lucide-react";
import { SeoLanding } from "@/components/marketing/seo-landing";

const PATH = "/roommaster-integration";

export const metadata: Metadata = {
  title: "RoomMaster Integration — Sync Room Status & Work Orders",
  description:
    "Connect RoomMaster (IQware) to Roomward for two-way room-status sync. Dirty and out-of-service rooms auto-create work orders; cleaned rooms push back to your PMS. Free 14-day trial.",
  alternates: { canonical: PATH },
  openGraph: {
    type: "website",
    url: `https://roomward.app${PATH}`,
    title: "RoomMaster Integration — Roomward",
    description:
      "Two-way sync between RoomMaster and Roomward: room statuses pull in, work orders auto-create, and clean status pushes back.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Roomward RoomMaster PMS integration" }],
  },
};

export default function Page() {
  return (
    <SeoLanding
      canonicalPath={PATH}
      keyword="RoomMaster integration"
      eyebrow="RoomMaster PMS integration"
      h1={<>Roomward + RoomMaster,<br />synced both ways.</>}
      intro="Roomward connects directly to RoomMaster (IQware) so your operations layer and your PMS stay in step. Room statuses pull into Roomward on every sync, dirty and out-of-service rooms automatically become work orders, and clean status pushes straight back to RoomMaster — no double entry, no stale boards."
      heroImg="00-property-map"
      heroAlt="Roomward property map syncing room statuses from RoomMaster PMS"
      features={[
        { icon: RefreshCw, title: "Pull room statuses", body: "Every sync pulls current RoomMaster statuses — clean, dirty, occupied, out of service — onto your live property map." },
        { icon: Wrench, title: "Auto-create work orders", body: "Out-of-service and maintenance statuses become assignable Roomward work orders automatically, so nothing waits on a phone call." },
        { icon: ArrowLeftRight, title: "Push clean status back", body: "When housekeeping marks a room ready in Roomward, the clean status pushes back to RoomMaster — your front desk sees it instantly." },
        { icon: Sparkles, title: "Status mapping done right", body: "RoomMaster codes map cleanly to Roomward statuses — Dirty, Pickup, Occupied Dirty, Out of Service, Maintenance — each handled sensibly." },
        { icon: Bell, title: "Webhook updates", body: "Single-room changes can flow in via webhook the moment they happen in RoomMaster, not just on a full sync." },
        { icon: ShieldCheck, title: "No rip-and-replace", body: "Keep running RoomMaster exactly as you do today. Roomward adds the operations layer on top — it doesn't replace your PMS." },
      ]}
      benefits={[
        "Two-way sync with RoomMaster (IQware)",
        "Dirty / out-of-service rooms auto-create work orders",
        "Clean status pushes back to your PMS",
        "Live property map reflects PMS state",
        "Webhook support for instant updates",
        "Keep your existing RoomMaster setup",
      ]}
      faqs={[
        { q: "How does the RoomMaster integration work?", a: "Roomward syncs two-way with RoomMaster. On each sync it pulls every room's status into Roomward; actionable statuses like Out of Service and Maintenance automatically create work orders; and when a room is marked clean or ready in Roomward, that status pushes back to RoomMaster — so both systems always agree." },
        { q: "Do I have to replace RoomMaster?", a: "No. Roomward is an operations layer that sits on top of RoomMaster. You keep RoomMaster as your PMS and gain work orders, a maintenance/housekeeping board, an asset registry, and team chat alongside it." },
        { q: "Which RoomMaster statuses create work orders?", a: "Dirty, Occupied Dirty, Pickup, Out of Service, and Maintenance are treated as actionable and can auto-create a work order. Clean, Inspected, Do Not Disturb, and Occupied Clean are not — they just update the room's status." },
        { q: "Is the sync real time?", a: "You can run a full sync on demand, and single-room changes can also arrive instantly via webhook, so a status change in RoomMaster shows up in Roomward right away." },
        { q: "How much does it cost?", a: "The RoomMaster integration is included. Standard is $149/month per property for up to 25 team members; Pro is $249/month for unlimited team members. Every plan starts with a free 14-day trial, no credit card required." },
      ]}
      related={[
        { href: "/hotel-housekeeping-software", label: "Hotel housekeeping software" },
        { href: "/hotel-work-order-software", label: "Hotel work order software" },
        { href: "/hotel-operations-software", label: "Hotel operations software" },
        { href: "/eptura-integration", label: "Eptura integration" },
      ]}
    />
  );
}
