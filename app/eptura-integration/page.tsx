import type { Metadata } from "next";
import { RefreshCw, ArrowLeftRight, Package, ClipboardList, Wrench, ShieldCheck } from "lucide-react";
import { SeoLanding } from "@/components/marketing/seo-landing";

const PATH = "/eptura-integration";

export const metadata: Metadata = {
  title: "Eptura Integration — Sync CMMS Work Orders & Assets",
  description:
    "Connect Eptura Asset (CMMS) to Roomward for two-way work-order and asset sync. Pull Eptura work orders onto your live property view; push status changes back. Free 14-day trial.",
  alternates: { canonical: PATH },
  openGraph: {
    type: "website",
    url: `https://roomward.app${PATH}`,
    title: "Eptura Integration — Roomward",
    description:
      "Two-way sync between Eptura Asset and Roomward: work orders and assets flow in, status updates push back.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Roomward Eptura CMMS integration" }],
  },
};

export default function Page() {
  return (
    <SeoLanding
      canonicalPath={PATH}
      keyword="Eptura integration"
      eyebrow="Eptura CMMS integration"
      h1={<>Roomward + Eptura,<br />work orders in sync.</>}
      intro="Roomward connects two-way with Eptura Asset (formerly ManagerPlus / Hippo CMMS). Pull Eptura work orders and your asset registry onto Roomward's live property view, and push status changes back automatically — so your maintenance team works from one place while your CMMS stays the system of record."
      heroImg="07-assets"
      heroAlt="Roomward syncing work orders and assets from Eptura CMMS"
      features={[
        { icon: ClipboardList, title: "Pull work orders", body: "Eptura work orders flow into Roomward with status and priority mapped automatically — New, Assigned, In Progress, On Hold, and more." },
        { icon: ArrowLeftRight, title: "Push updates back", body: "When a tech changes a status in Roomward, it pushes back to Eptura, so both systems always agree without double entry." },
        { icon: Package, title: "Asset registry sync", body: "Pull your Eptura assets — HVAC, boilers, elevators, pumps — with category, condition, and next-PM dates, tied to real rooms." },
        { icon: Wrench, title: "Mapped to your rooms", body: "Each synced work order and asset links to a specific room and floor, so technicians know exactly where to go." },
        { icon: RefreshCw, title: "Status & priority mapping", body: "Eptura statuses and priorities map cleanly to Roomward's, including On Hold → waiting on parts and Urgent → critical." },
        { icon: ShieldCheck, title: "Keep Eptura as your CMMS", body: "Roomward adds a fast operations layer and live property map on top — it doesn't replace your CMMS system of record." },
      ]}
      benefits={[
        "Two-way work-order sync with Eptura Asset",
        "Asset registry import with PM dates",
        "Status and priority mapped automatically",
        "Work orders tied to real rooms and floors",
        "One operations view across maintenance",
        "Keep Eptura as your system of record",
      ]}
      faqs={[
        { q: "How does the Eptura integration work?", a: "Roomward syncs two-way with Eptura Asset. It pulls work orders and assets into Roomward — mapping Eptura's statuses and priorities to Roomward's — and pushes status changes back when work happens in Roomward, so both systems stay aligned." },
        { q: "Does it replace Eptura?", a: "No. Eptura stays your CMMS system of record. Roomward adds a fast, mobile operations layer and a live property map on top, connecting maintenance with housekeeping and front desk." },
        { q: "Does it sync assets too?", a: "Yes. Roomward pulls your Eptura asset registry — category, condition, and next preventive-maintenance date — and ties each asset to the room or area it lives in." },
        { q: "How are statuses mapped?", a: "Eptura statuses map to Roomward's: New → open, Assigned → assigned, In Progress → in progress, On Hold/Waiting → waiting on parts, Completed/Closed → completed, Cancelled → cancelled. Priorities map similarly, with Urgent and Critical becoming critical." },
        { q: "How much does it cost?", a: "The Eptura integration is included. Standard is $149/month per property for up to 25 team members; Pro is $249/month for unlimited team members. Every plan starts with a free 14-day trial, no credit card required." },
      ]}
    />
  );
}
