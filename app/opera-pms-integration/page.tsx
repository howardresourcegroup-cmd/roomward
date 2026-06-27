import type { Metadata } from "next";
import { RefreshCw, Map, Wrench, Sparkles, MessagesSquare, ShieldCheck } from "lucide-react";
import { SeoLanding } from "@/components/marketing/seo-landing";

const PATH = "/opera-pms-integration";

export const metadata: Metadata = {
  title: "Opera PMS Integration — Add an Operations Layer to OPERA",
  description:
    "Connect Oracle Hospitality OPERA to Roomward and add work orders, a live property map, and a housekeeping board on top of your PMS. Room status stays in sync. Free 14-day trial.",
  alternates: { canonical: PATH },
  openGraph: {
    type: "website",
    url: `https://roomward.app${PATH}`,
    title: "Opera PMS Integration — Roomward",
    description:
      "Add maintenance work orders, a live property map, and housekeeping on top of Oracle OPERA — with room status kept in sync.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Roomward Opera PMS integration" }],
  },
};

export default function Page() {
  return (
    <SeoLanding
      canonicalPath={PATH}
      keyword="Opera PMS integration"
      eyebrow="Oracle OPERA PMS integration"
      h1={<>An operations layer<br />on top of OPERA.</>}
      intro="Roomward connects to Oracle Hospitality OPERA so you can run maintenance, housekeeping, and the front-desk hand-offs on a live operations layer — while OPERA stays your PMS. Room status stays in sync, and we set up the connection for you."
      heroImg="01-dashboard"
      heroAlt="Roomward operations dashboard layered on top of Oracle OPERA PMS"
      features={[
        { icon: RefreshCw, title: "Room status in sync", body: "Keep OPERA and Roomward aligned on room state, so housekeeping and front desk see the same live picture." },
        { icon: Map, title: "Live property map", body: "See every building, floor, and room with real-time status — drill into a room for its assets and open work orders." },
        { icon: Wrench, title: "Work orders OPERA doesn't do", body: "Log, assign, and track maintenance with photos and full history — the operations side OPERA was never built for." },
        { icon: Sparkles, title: "Housekeeping board", body: "Dirty, in progress, cleaned, ready — a live housekeeping view that turns rooms faster and feeds the front desk." },
        { icon: MessagesSquare, title: "Teams in context", body: "Maintenance, housekeeping, and front desk coordinate in channels tied to the rooms and orders they're discussing." },
        { icon: ShieldCheck, title: "We connect it for you", body: "OPERA stays your PMS. Our team sets up the connection so you get the operations layer without a big IT project." },
      ]}
      benefits={[
        "Operations layer on top of Oracle OPERA",
        "Room status kept in sync",
        "Work orders, assets, and reporting",
        "Live property map and housekeeping board",
        "In-context team chat across departments",
        "Concierge setup — we connect it for you",
      ]}
      faqs={[
        { q: "How does the OPERA integration work?", a: "Roomward sits on top of Oracle Hospitality OPERA as an operations layer. It keeps room status in sync and adds work orders, a live property map, a housekeeping board, assets, and team chat. Our team handles the connection setup for your property." },
        { q: "Does it replace OPERA?", a: "No. OPERA stays your PMS and system of record for reservations and the guest ledger. Roomward adds the operations side — maintenance, housekeeping, and the daily hand-offs between teams." },
        { q: "What does Roomward add that OPERA doesn't have?", a: "A fast, mobile work-order system, a live property map down to the room, a housekeeping status board, an asset registry with preventive maintenance, and team chat — the operations layer that keeps the property running behind the guest experience." },
        { q: "How do we get connected?", a: "Start a free trial and request the OPERA connection — our team sets it up for you, so you don't need a big IT project to get going." },
        { q: "How much does it cost?", a: "Standard is $149/month per property for up to 25 team members; Pro is $249/month for unlimited team members. Every plan starts with a free 14-day trial, no credit card required." },
      ]}
      related={[
        { href: "/hotel-operations-software", label: "Hotel operations software" },
        { href: "/hotel-housekeeping-software", label: "Hotel housekeeping software" },
        { href: "/hotel-work-order-software", label: "Hotel work order software" },
        { href: "/cloudbeds-integration", label: "Cloudbeds integration" },
      ]}
    />
  );
}
