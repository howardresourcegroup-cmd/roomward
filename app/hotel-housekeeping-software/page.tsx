import type { Metadata } from "next";
import { Sparkles, RefreshCw, LayoutGrid, Bell, Users, BarChart3 } from "lucide-react";
import { SeoLanding } from "@/components/marketing/seo-landing";

const PATH = "/hotel-housekeeping-software";

export const metadata: Metadata = {
  title: "Hotel Housekeeping Software — Room Status in Real Time",
  description:
    "Roomward is hotel housekeeping software that keeps room status live across housekeeping, front desk, and maintenance — clean, dirty, in-progress, and ready, synced to your PMS. Free 14-day trial.",
  alternates: { canonical: PATH },
  openGraph: {
    type: "website",
    url: `https://roomward.app${PATH}`,
    title: "Hotel Housekeeping Software — Roomward",
    description:
      "Live room status for housekeeping, front desk, and maintenance — clean, dirty, in-progress, ready — synced two-way with your PMS.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Roomward hotel housekeeping software" }],
  },
};

export default function Page() {
  return (
    <SeoLanding
      canonicalPath={PATH}
      keyword="hotel housekeeping software"
      eyebrow="Hotel housekeeping software"
      h1={<>Room status everyone<br />can see, in real time.</>}
      intro="Roomward is housekeeping software for hotels. Track every room from dirty to in-progress to ready on one live board, raise maintenance issues without leaving the room, and keep front desk and housekeeping in sync — so rooms turn faster and guests check in sooner."
      heroImg="03-housekeeping"
      heroAlt="Hotel housekeeping software board showing rooms by cleaning status across floors"
      features={[
        { icon: LayoutGrid, title: "One live board", body: "Every room, every floor, color-coded by cleaning status — dirty, in progress, cleaned, ready, out of service." },
        { icon: RefreshCw, title: "Synced with your PMS", body: "Two-way sync with RoomMaster pulls occupancy and pushes clean status, so the front desk always sees what's ready." },
        { icon: Sparkles, title: "Update from the room", body: "Housekeepers mark a room ready from any phone — no radio calls, no clipboard, no walking to the desk." },
        { icon: Bell, title: "Flag issues instantly", body: "Spot a broken AC mid-clean? Raise a work order to maintenance in two taps, with a photo, without breaking stride." },
        { icon: Users, title: "Front desk in the loop", body: "Arrivals and departures are visible to housekeeping; ready rooms are visible to the desk. No more guessing." },
        { icon: BarChart3, title: "See the turn", body: "Reports show clean times, rooms turned per shift, and where the bottlenecks are by floor and by person." },
      ]}
      benefits={[
        "Live status for every room and floor",
        "Two-way PMS sync (RoomMaster + more)",
        "Raise maintenance issues mid-clean",
        "Arrivals & departures visible to staff",
        "Clean-time and turn reporting",
        "Works on any phone, tablet, or desktop",
      ]}
      faqs={[
        { q: "What is hotel housekeeping software?", a: "It's a tool that tracks the cleaning status of every room across a property in real time — replacing printed room lists and radio calls. Roomward shows each room as dirty, in progress, cleaned, ready, or out of service, and keeps housekeeping, front desk, and maintenance looking at the same live picture." },
        { q: "Does it sync with our PMS?", a: "Yes. Roomward syncs two-way with RoomMaster (and others), pulling occupancy and arrivals/departures and pushing clean/ready status back, so your front desk sees an accurate, current room state without double entry." },
        { q: "Can housekeepers report maintenance problems?", a: "Yes — that's a core benefit. A housekeeper who finds a fault can open a work order for maintenance in seconds, attach a photo, and keep working. The issue is tracked to resolution instead of getting lost." },
        { q: "Does it work on a phone?", a: "Yes. Roomward runs in any mobile browser, so staff update room status right where they're standing — no app install, no shared clipboard." },
        { q: "How much does it cost?", a: "Standard is $149/month per property for up to 25 team members; Pro is $249/month for unlimited team members. Every plan starts with a free 14-day trial, no credit card required." },
      ]}
      related={[
        { href: "/hotel-operations-software", label: "Hotel operations software" },
        { href: "/hotel-work-order-software", label: "Hotel work order software" },
        { href: "/roommaster-integration", label: "RoomMaster integration" },
        { href: "/blog/hotel-housekeeping-checklist", label: "Guide: Hotel housekeeping checklist" },
      ]}
    />
  );
}
