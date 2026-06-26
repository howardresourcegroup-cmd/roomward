import type { Metadata } from "next";
import { Map, RefreshCw, DollarSign, Smartphone, MessagesSquare, Rocket } from "lucide-react";
import { SeoLanding } from "@/components/marketing/seo-landing";

const PATH = "/quore-alternative";

export const metadata: Metadata = {
  title: "Quore Alternative — Hotel Operations Software | Roomward",
  description:
    "Looking for a Quore alternative? Roomward is hotel operations software with work orders, housekeeping, a live property map, and PMS sync — at simple, flat per-property pricing. Free 14-day trial.",
  alternates: { canonical: PATH },
  openGraph: {
    type: "website",
    url: `https://roomward.app${PATH}`,
    title: "Quore Alternative — Roomward",
    description:
      "Roomward is a modern Quore alternative for hotel operations: work orders, housekeeping, a live property map, and PMS sync at transparent flat pricing.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Roomward — a Quore alternative for hotel operations" }],
  },
};

export default function Page() {
  return (
    <SeoLanding
      canonicalPath={PATH}
      keyword="Quore alternative"
      eyebrow="A modern Quore alternative"
      h1={<>The modern way to run<br />hotel operations.</>}
      intro="If you're evaluating Quore for hotel operations, take a look at Roomward. You get work orders, housekeeping, an interactive property map, assets, and two-way PMS sync in one modern, mobile-first app — at simple flat pricing, with a free trial you can start in minutes and no sales call required."
      heroImg="01-dashboard"
      heroAlt="Roomward hotel operations dashboard — a modern Quore alternative"
      features={[
        { icon: Map, title: "Live property map", body: "See every building, floor, and room with real-time status, and drill into any room for its assets and open work orders." },
        { icon: RefreshCw, title: "Two-way PMS sync", body: "Sync room status and work orders with RoomMaster and Eptura — your operations layer and PMS stay in step automatically." },
        { icon: DollarSign, title: "Simple, flat pricing", body: "$149/month per property (up to 25 users) or $249/month for unlimited — transparent, no per-seat surprises, no quote required." },
        { icon: Smartphone, title: "Mobile-first", body: "Runs in any browser on phones, tablets, and desktop — staff update room status and work orders right where they stand." },
        { icon: MessagesSquare, title: "Team chat built in", body: "Maintenance, housekeeping, and front desk coordinate in channels tied to the rooms and work orders they're discussing." },
        { icon: Rocket, title: "Start in minutes", body: "Spin up a free 14-day trial or click into a live demo with no signup — no credit card, no sales call to get going." },
      ]}
      benefits={[
        "Work orders, housekeeping, assets in one app",
        "Interactive live property map",
        "Two-way PMS sync (RoomMaster, Eptura)",
        "Flat per-property pricing, no per-seat fees",
        "Mobile-first for every department",
        "Free trial + live demo, no sales call",
      ]}
      faqs={[
        { q: "Is Roomward a good Quore alternative?", a: "Yes. Roomward covers the same core hotel-operations ground — work orders, housekeeping, assets, and reporting — in a modern, mobile-first app, and adds an interactive live property map and two-way PMS sync. It's built for teams that want to get running quickly at transparent pricing." },
        { q: "How is Roomward different from Quore?", a: "Roomward leads with a live, interactive property map, two-way PMS sync (RoomMaster and Eptura), built-in team chat, and simple flat per-property pricing you can start without a sales call. You can try the full product free or explore a live demo with no signup." },
        { q: "How much does Roomward cost?", a: "Standard is $149/month per property for up to 25 team members; Pro is $249/month for unlimited team members. Both start with a free 14-day trial, no credit card required — no custom quote needed." },
        { q: "Can we try it before switching?", a: "Yes. Start a free 14-day trial, or open the live demo with no signup at all to click through real screens before you decide." },
        { q: "Does Roomward work with our PMS?", a: "Roomward syncs two-way with RoomMaster and Eptura, and connects to other systems like Opera and Cloudbeds. It's an operations layer on top of your PMS, not a replacement for it." },
      ]}
    />
  );
}
