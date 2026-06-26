import type { Metadata } from "next";
import { CalendarClock, Package, ClipboardList, Bell, BarChart3, RefreshCw } from "lucide-react";
import { SeoLanding } from "@/components/marketing/seo-landing";

const PATH = "/hotel-preventive-maintenance-software";

export const metadata: Metadata = {
  title: "Hotel Preventive Maintenance Software — Schedule & Track",
  description:
    "Roomward is hotel preventive maintenance software — schedule recurring upkeep on every asset, get reminders before things break, and keep a full service history. Free 14-day trial.",
  alternates: { canonical: PATH },
  openGraph: {
    type: "website",
    url: `https://roomward.app${PATH}`,
    title: "Hotel Preventive Maintenance Software — Roomward",
    description:
      "Schedule recurring maintenance on every asset, get reminders before things break, and keep a full service history per property.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Roomward hotel preventive maintenance software" }],
  },
};

export default function Page() {
  return (
    <SeoLanding
      canonicalPath={PATH}
      keyword="hotel preventive maintenance software"
      eyebrow="Hotel preventive maintenance software"
      h1={<>Fix it before<br />the guest notices.</>}
      intro="Roomward is preventive maintenance software for hotels. Put every asset — HVAC, pumps, elevators, appliances — on a recurring schedule, get reminders before something fails, and keep a complete service history for each property."
      heroImg="07-assets"
      heroAlt="Hotel preventive maintenance software showing an asset list with maintenance schedules and statuses"
      features={[
        { icon: CalendarClock, title: "Recurring schedules", body: "Set upkeep intervals per asset — monthly filter changes, quarterly inspections — and let Roomward keep the calendar." },
        { icon: Bell, title: "Reminders before failure", body: "Get a heads-up when maintenance is due, so small jobs get done before they turn into guest complaints." },
        { icon: Package, title: "Every asset in one place", body: "Track make, model, serial, location, and condition for HVAC, pumps, elevators, and appliances across the property." },
        { icon: ClipboardList, title: "Auto-generated work orders", body: "Due tasks become assignable work orders — with the same photos, history, and tracking as reactive repairs." },
        { icon: BarChart3, title: "Service history & reporting", body: "See what's been serviced, what's overdue, and which assets cost you the most time and money." },
        { icon: RefreshCw, title: "Syncs your PMS", body: "Two-way sync with RoomMaster and Eptura keeps your operations layer aligned with the systems you already run." },
      ]}
      benefits={[
        "Recurring schedules on every asset",
        "Due-date reminders before breakdowns",
        "Full asset register with condition",
        "Preventive tasks become work orders",
        "Complete per-asset service history",
        "Reporting on overdue and costly assets",
      ]}
      faqs={[
        { q: "What is hotel preventive maintenance software?", a: "It schedules recurring upkeep on a hotel's equipment and rooms so problems are caught before they fail — rather than waiting for something to break and reacting. Roomward tracks each asset, reminds you when maintenance is due, and keeps the full service history." },
        { q: "What assets can I track?", a: "Anything with a maintenance need — HVAC units, pool pumps, elevators, kitchen and laundry equipment, guest-room appliances. You record make, model, serial, location, and condition, then set a schedule for each." },
        { q: "Do preventive tasks turn into work orders?", a: "Yes. When a scheduled task comes due it becomes an assignable work order with the same photo documentation, priorities, and tracking as a reactive repair — so it actually gets done and logged." },
        { q: "Does it integrate with our PMS?", a: "Roomward syncs two-way with RoomMaster and Eptura, adding a live operations and maintenance layer on top of the systems you already use." },
        { q: "How much does it cost?", a: "Standard is $149/month per property for up to 25 team members; Pro is $249/month for unlimited team members. Every plan starts with a free 14-day trial, no credit card required." },
      ]}
    />
  );
}
