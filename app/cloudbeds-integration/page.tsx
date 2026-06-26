import type { Metadata } from "next";
import { RefreshCw, Map, Wrench, Sparkles, MessagesSquare, ShieldCheck } from "lucide-react";
import { SeoLanding } from "@/components/marketing/seo-landing";

const PATH = "/cloudbeds-integration";

export const metadata: Metadata = {
  title: "Cloudbeds Integration — Maintenance & Housekeeping on Top",
  description:
    "Connect Cloudbeds to Roomward and add maintenance work orders, a live property map, and a housekeeping board on top of your PMS. Room status stays in sync. Free 14-day trial.",
  alternates: { canonical: PATH },
  openGraph: {
    type: "website",
    url: `https://roomward.app${PATH}`,
    title: "Cloudbeds Integration — Roomward",
    description:
      "Add maintenance work orders, a live property map, and housekeeping on top of Cloudbeds — with room status kept in sync.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Roomward Cloudbeds PMS integration" }],
  },
};

export default function Page() {
  return (
    <SeoLanding
      canonicalPath={PATH}
      keyword="Cloudbeds integration"
      eyebrow="Cloudbeds PMS integration"
      h1={<>Maintenance & housekeeping<br />on top of Cloudbeds.</>}
      intro="Roomward connects to Cloudbeds so your team can run maintenance, housekeeping, and front-desk hand-offs on a live operations layer — while Cloudbeds stays your PMS. Room status stays in sync, and we set up the connection for you."
      heroImg="00-property-map"
      heroAlt="Roomward property map and operations layer connected to Cloudbeds PMS"
      features={[
        { icon: RefreshCw, title: "Room status in sync", body: "Keep Cloudbeds and Roomward aligned on room state, so housekeeping and front desk work from the same live picture." },
        { icon: Map, title: "Live property map", body: "Every building, floor, and room with real-time status — drill into a room for its assets and open work orders." },
        { icon: Wrench, title: "Real work orders", body: "Log, assign, and track maintenance with photos, priorities, and full history — across shifts, on any device." },
        { icon: Sparkles, title: "Housekeeping board", body: "Track every room from dirty to ready on one live board, and turn rooms faster for arriving guests." },
        { icon: MessagesSquare, title: "Teams in context", body: "Maintenance, housekeeping, and front desk coordinate in channels tied to the rooms and orders they're discussing." },
        { icon: ShieldCheck, title: "We connect it for you", body: "Cloudbeds stays your PMS. Our team sets up the connection so you get the operations layer without the IT lift." },
      ]}
      benefits={[
        "Operations layer on top of Cloudbeds",
        "Room status kept in sync",
        "Work orders, assets, and reporting",
        "Live property map and housekeeping board",
        "In-context team chat across departments",
        "Concierge setup — we connect it for you",
      ]}
      faqs={[
        { q: "How does the Cloudbeds integration work?", a: "Roomward sits on top of Cloudbeds as an operations layer. It keeps room status in sync and adds work orders, a live property map, a housekeeping board, assets, and team chat. Our team handles the connection setup for your property." },
        { q: "Does it replace Cloudbeds?", a: "No. Cloudbeds stays your PMS for bookings and the guest experience. Roomward adds the operations side — maintenance, housekeeping, and the daily hand-offs between teams." },
        { q: "What does Roomward add to Cloudbeds?", a: "A fast, mobile work-order system, a live property map down to the room, a housekeeping status board, an asset registry with preventive maintenance, and team chat — everything that keeps the property running behind the booking." },
        { q: "How do we get connected?", a: "Start a free trial and request the Cloudbeds connection — our team sets it up for you, so you can get going without a big IT project." },
        { q: "How much does it cost?", a: "Standard is $149/month per property for up to 25 team members; Pro is $249/month for unlimited team members. Every plan starts with a free 14-day trial, no credit card required." },
      ]}
    />
  );
}
