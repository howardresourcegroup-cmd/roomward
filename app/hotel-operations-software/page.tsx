import type { Metadata } from "next";
import { LayoutDashboard, RefreshCw, MessagesSquare, ShieldCheck, Map, BarChart3 } from "lucide-react";
import { SeoLanding } from "@/components/marketing/seo-landing";

const PATH = "/hotel-operations-software";

export const metadata: Metadata = {
  title: "Hotel Operations Software — Run the Whole Property",
  description:
    "Roomward is hotel operations software that unifies maintenance, housekeeping, and front desk on one live property view — work orders, room status, team chat, and PMS sync. Free 14-day trial.",
  alternates: { canonical: PATH },
  openGraph: {
    type: "website",
    url: `https://roomward.app${PATH}`,
    title: "Hotel Operations Software — Roomward",
    description:
      "One operations layer for maintenance, housekeeping, and front desk — work orders, live room status, team chat, and PMS sync.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Roomward hotel operations software" }],
  },
};

export default function Page() {
  return (
    <SeoLanding
      canonicalPath={PATH}
      keyword="hotel operations software"
      eyebrow="Hotel operations software"
      h1={<>One operations layer<br />for the whole property.</>}
      intro="Roomward is operations software for hotels. It connects maintenance, housekeeping, and the front desk on a single live view of your property — so work orders, room status, and the hand-offs between teams all happen in one place, on top of the PMS you already run."
      heroImg="01-dashboard"
      heroAlt="Hotel operations software dashboard with live work orders, room status, and property KPIs"
      features={[
        { icon: LayoutDashboard, title: "One live dashboard", body: "Active issues, rooms online, critical alerts, and average resolution time — the state of the property at a glance." },
        { icon: Map, title: "Interactive property map", body: "See every building, floor, and room with its real-time status. Drill into a room for its assets and open work orders." },
        { icon: RefreshCw, title: "Sits on top of your PMS", body: "Two-way sync with RoomMaster and Eptura adds an operations layer without replacing the systems you already run." },
        { icon: MessagesSquare, title: "Teams talking in context", body: "Maintenance, housekeeping, and front desk coordinate in channels tied to the rooms and work orders they're discussing." },
        { icon: ShieldCheck, title: "Roles & permissions", body: "Give each team exactly the access they need — front desk logs issues, techs close them, managers see everything." },
        { icon: BarChart3, title: "Reporting that matters", body: "Resolution times, recurring problems, and workload by team — the numbers you need to actually improve operations." },
      ]}
      benefits={[
        "Maintenance, housekeeping & front desk in one place",
        "Live property map down to the room",
        "Two-way PMS sync (RoomMaster, Eptura)",
        "Role-based access for every team",
        "In-context team chat",
        "Operational reporting and KPIs",
      ]}
      faqs={[
        { q: "What is hotel operations software?", a: "It's the software that coordinates the work behind the guest experience — maintenance, housekeeping, and the daily hand-offs between teams. Where a PMS manages the guest's booking and bill, an operations system like Roomward manages the property and the people keeping it running." },
        { q: "Does it replace our PMS?", a: "No. Roomward is an operations layer that sits on top of your PMS. It syncs two-way with systems like RoomMaster and Eptura, so room status and operations stay in step without you ripping anything out." },
        { q: "Which teams use it?", a: "Maintenance, housekeeping, front desk, and management. Role-based permissions mean each team sees and does only what's relevant — the front desk logs issues, technicians close them, managers see the whole picture." },
        { q: "Can we see the whole property at once?", a: "Yes. The interactive property map shows every building, floor, and room with live status, and you can drill into any room to see its assets and open work orders." },
        { q: "How much does it cost?", a: "Standard is $149/month per property for up to 25 team members; Pro is $249/month for unlimited team members. Every plan starts with a free 14-day trial, no credit card required." },
      ]}
      related={[
        { href: "/hotel-cmms-software", label: "Hotel CMMS software" },
        { href: "/hotel-work-order-software", label: "Hotel work order software" },
        { href: "/hotel-housekeeping-software", label: "Hotel housekeeping software" },
        { href: "/blog/what-is-hotel-operations-management", label: "Guide: What is hotel operations management?" },
      ]}
    />
  );
}
