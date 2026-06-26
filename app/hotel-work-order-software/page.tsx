import type { Metadata } from "next";
import { ClipboardList, Camera, Bell, BarChart3, Users, RefreshCw } from "lucide-react";
import { SeoLanding } from "@/components/marketing/seo-landing";

const PATH = "/hotel-work-order-software";

export const metadata: Metadata = {
  title: "Hotel Work Order Software — Log, Assign & Track Repairs",
  description:
    "Roomward is hotel work order software for maintenance teams — log a request, assign it, attach photos, and track it from open to resolved. Free 14-day trial.",
  alternates: { canonical: PATH },
  openGraph: {
    type: "website",
    url: `https://roomward.app${PATH}`,
    title: "Hotel Work Order Software — Roomward",
    description:
      "Log, assign, and track every hotel maintenance request from open to resolved — with photos, priorities, and full history.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Roomward hotel work order software" }],
  },
};

export default function Page() {
  return (
    <SeoLanding
      canonicalPath={PATH}
      keyword="hotel work order software"
      eyebrow="Hotel work order software"
      h1={<>Every hotel work order,<br />tracked end to end.</>}
      intro="Roomward is work order software built for hotels. Log a maintenance request in seconds, assign it to the right person, attach photos, and follow it from open to resolved — so nothing falls through the cracks between shifts."
      heroImg="02-work-orders"
      heroAlt="Hotel work order software showing a list of maintenance requests with priorities, assignees, and statuses"
      features={[
        { icon: ClipboardList, title: "Log in seconds", body: "Front desk or housekeeping can open a work order from any device — pick the room, set priority, and go." },
        { icon: Users, title: "Assign to the right person", body: "Route each request to a technician or team. Everyone sees what's theirs and what's next." },
        { icon: Camera, title: "Photos & notes", body: "Attach a photo of the broken faucet or the meter reading. Updates and observations live with the order." },
        { icon: Bell, title: "Nothing slips", body: "Open, assigned, in progress, resolved — every request is tracked with full history across shifts." },
        { icon: BarChart3, title: "See the patterns", body: "Reports show what's breaking, how fast you close, and where the time goes — by room, category, and tech." },
        { icon: RefreshCw, title: "Syncs your PMS", body: "Two-way sync with RoomMaster and Eptura, so room status and your operations layer stay in step." },
      ]}
      benefits={[
        "Unlimited work orders and rooms",
        "Priorities, categories, and due dates",
        "Photo documentation on every order",
        "Assign to people or whole teams",
        "Full audit trail from open to close",
        "Works on phones, tablets, and desktop",
      ]}
      faqs={[
        { q: "What is hotel work order software?", a: "It's a tool for logging, assigning, and tracking maintenance and repair requests across a hotel — replacing paper logs, group texts, and spreadsheets. Roomward gives every request an owner, a priority, photos, and a status so things actually get closed." },
        { q: "Can the front desk create work orders?", a: "Yes. Anyone you give access to — front desk, housekeeping, managers — can open a request in seconds from any device. You control who can see and do what with role-based permissions." },
        { q: "Does it work on a phone?", a: "Yes. Roomward runs in any browser on phones, tablets, and desktops, so technicians can update orders and attach photos right from the room." },
        { q: "Does it integrate with our PMS?", a: "Roomward syncs two-way with RoomMaster and Eptura, adding a live operations layer on top of the systems you already run rather than replacing them." },
        { q: "How much does it cost?", a: "Standard is $149/month per property for up to 25 team members; Pro is $249/month for unlimited team members. Every plan starts with a free 14-day trial, no credit card required." },
      ]}
    />
  );
}
