import type { Metadata } from "next";
import { Wrench, CalendarClock, Package, ClipboardList, RefreshCw, BarChart3 } from "lucide-react";
import { SeoLanding } from "@/components/marketing/seo-landing";

const PATH = "/hotel-cmms-software";

export const metadata: Metadata = {
  title: "CMMS for Hotels — Maintenance Management Built for Hospitality",
  description:
    "Roomward is a CMMS for hotels: work orders, preventive maintenance schedules, and an asset registry tied to your rooms and your PMS. Purpose-built for hospitality, not retrofitted. Free 14-day trial.",
  alternates: { canonical: PATH },
  openGraph: {
    type: "website",
    url: `https://roomward.app${PATH}`,
    title: "Hotel CMMS — Roomward",
    description:
      "A computerized maintenance management system built for hotels: work orders, PM schedules, and asset tracking tied to rooms and your PMS.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Roomward hotel CMMS software" }],
  },
};

export default function Page() {
  return (
    <SeoLanding
      canonicalPath={PATH}
      keyword="hotel CMMS"
      eyebrow="CMMS for hotels"
      h1={<>A CMMS built for hotels —<br />not retrofitted for them.</>}
      intro="Roomward is a computerized maintenance management system (CMMS) made for hospitality. Work orders, preventive maintenance schedules, and your full asset registry live together — tied to specific rooms and synced with your PMS — so the maintenance side of the property runs on the same data as the guest side."
      heroImg="07-assets"
      heroAlt="Hotel CMMS asset registry showing equipment with status and next maintenance dates"
      features={[
        { icon: ClipboardList, title: "Work orders", body: "Log, assign, prioritize, and close every repair with photos and full history — reactive and scheduled in one queue." },
        { icon: CalendarClock, title: "Preventive maintenance", body: "Set recurring schedules per asset; due tasks become assignable work orders before small problems become guest complaints." },
        { icon: Package, title: "Asset registry", body: "Track make, model, serial, location, and condition for HVAC, pumps, elevators, and appliances across the property." },
        { icon: Wrench, title: "Tied to your rooms", body: "Every asset and work order is linked to a real room and floor, so technicians know exactly where to go." },
        { icon: RefreshCw, title: "PMS integration", body: "Two-way sync with RoomMaster and Eptura keeps room status and maintenance state aligned automatically." },
        { icon: BarChart3, title: "Maintenance reporting", body: "Resolution times, recurring failures, and asset history — the numbers to plan budgets and prevent breakdowns." },
      ]}
      benefits={[
        "Work orders + preventive maintenance in one queue",
        "Full asset registry with maintenance history",
        "Assets and orders tied to real rooms",
        "Two-way PMS sync (RoomMaster, Eptura)",
        "Role-based access for your maintenance team",
        "Reporting built for hospitality, not factories",
      ]}
      faqs={[
        { q: "What is a CMMS for hotels?", a: "A CMMS (computerized maintenance management system) is software for managing maintenance work and assets. A hotel CMMS like Roomward is purpose-built for hospitality — work orders, preventive maintenance, and assets are organized around rooms, floors, and the guest experience, and it integrates with your PMS rather than treating the property like a factory floor." },
        { q: "How is this different from a generic CMMS?", a: "Generic CMMS tools are built for plants and facilities and bolt on a 'hospitality' label. Roomward is built around hotel operations from the ground up: rooms and floors are first-class, housekeeping and front desk are in the loop, and it syncs two-way with hotel PMS systems like RoomMaster." },
        { q: "Does it handle preventive maintenance?", a: "Yes. Set recurring upkeep intervals per asset — monthly filter changes, quarterly inspections — and Roomward turns due tasks into assignable work orders with reminders, so scheduled work doesn't slip." },
        { q: "Can it track our equipment?", a: "Yes. The asset registry tracks make, model, serial number, location, condition, and maintenance history for every piece of equipment, each tied to the room or area it lives in." },
        { q: "How much does it cost?", a: "Standard is $149/month per property for up to 25 team members; Pro is $249/month for unlimited team members. Every plan starts with a free 14-day trial, no credit card required." },
      ]}
      related={[
        { href: "/hotel-work-order-software", label: "Hotel work order software" },
        { href: "/hotel-preventive-maintenance-software", label: "Hotel preventive maintenance software" },
        { href: "/hotel-operations-software", label: "Hotel operations software" },
        { href: "/blog/what-is-a-cmms-hotel-guide", label: "Guide: What is a CMMS? A hotel operator's guide" },
      ]}
    />
  );
}
