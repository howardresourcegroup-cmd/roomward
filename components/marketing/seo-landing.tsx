import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Check, Building2 } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";

// Shared template for keyword-targeted marketing landing pages (server component
// so each page can export its own metadata). Pages pass copy + a target keyword;
// this renders the page chrome plus SoftwareApplication + FAQPage JSON-LD.

export interface SeoLandingProps {
  /** Exact target keyword, e.g. "hotel work order software". Used in schema. */
  keyword: string;
  eyebrow: string;
  h1: React.ReactNode;
  intro: string;
  heroImg: string;        // file in /public/screenshots, without extension
  heroAlt: string;
  features: { icon: LucideIcon; title: string; body: string }[];
  benefits: string[];
  faqs: { q: string; a: string }[];
  canonicalPath: string;  // e.g. "/hotel-work-order-software"
}

export function SeoLanding({
  keyword, eyebrow, h1, intro, heroImg, heroAlt, features, benefits, faqs, canonicalPath,
}: SeoLandingProps) {
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Roomward",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: keyword,
    operatingSystem: "Web",
    url: `https://roomward.app${canonicalPath}`,
    description: intro,
    offers: [
      { "@type": "Offer", price: "149", priceCurrency: "USD", name: "Standard", description: "Per property/month, up to 25 team members. 14-day free trial." },
      { "@type": "Offer", price: "249", priceCurrency: "USD", name: "Pro", description: "Per property/month, unlimited team members. 14-day free trial." },
    ],
    publisher: { "@type": "Organization", name: "Howard Resource Group LLC", url: "https://howardresourcegroup.com" },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-[#080811] text-zinc-100">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-[700px] overflow-hidden hidden md:block">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[1000px] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <Link href="/landing" className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8 rounded-lg shadow-lg shadow-indigo-500/30" />
          <span className="text-lg font-bold">Roomward</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Log in</Link>
          <Link href="/signup" className="btn-primary text-sm">Start free trial</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-16 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 mb-6">
          <Building2 className="h-3 w-3" /> {eyebrow}
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">{h1}</h1>
        <p className="text-lg text-zinc-400 mt-5 max-w-2xl mx-auto leading-relaxed">{intro}</p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link href="/signup" className="btn-primary text-base h-11 px-6">
            Start free trial <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/demo" className="btn-secondary text-base h-11 px-6">View live demo</Link>
        </div>
        <p className="text-xs text-zinc-600 mt-4">14 days free · no credit card required</p>
      </section>

      {/* Product shot */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
        <img src={`/screenshots/${heroImg}.webp`} alt={heroAlt} width={1300} height={877}
          decoding="async" fetchPriority="high" className="w-full h-auto rounded-xl border border-white/[0.06]" />
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="glass-card p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/20 mb-3">
                <f.icon className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">{f.title}</h3>
              <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits checklist */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-20">
        <div className="glass-card p-7">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-zinc-300">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" /> {b}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently asked questions</h2>
        <div className="space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="glass-card p-5 group">
              <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-semibold text-zinc-100">
                {f.q}
                <ArrowRight className="h-4 w-4 text-zinc-500 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold">See it on your own property in minutes</h2>
        <p className="text-zinc-400 mt-3">Start a free trial, or click into a live demo with no signup.</p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link href="/signup" className="btn-primary text-base h-11 px-6">Start free trial <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/demo" className="btn-secondary text-base h-11 px-6">View live demo</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <LogoMark className="h-4 w-4 rounded" />
            <span>© 2026 Roomward · by Howard Resource Group</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/landing" className="hover:text-zinc-400 transition-colors">Home</Link>
            <Link href="/blog" className="hover:text-zinc-400 transition-colors">Blog</Link>
            <Link href="/signup" className="hover:text-zinc-400 transition-colors">Start free trial</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
