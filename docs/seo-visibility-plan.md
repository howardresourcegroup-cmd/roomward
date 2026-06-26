# Roomward — SEO & Visibility Plan

_Last updated: 2026-06-25. Based on Semrush research (US database)._

## Where we stand

roomward.app is effectively unranked: authority rank ~27.8M, **2 organic keywords, 0 organic
traffic**. The site is new and barely crawled. First job is getting indexed and building a few
winnable rankings — not chasing head terms.

## The category (and why we don't fight it head-on)

The anchor term **"hotel maintenance software"** (390/mo, CPC ~$35) is owned by:

- **Review aggregators / listicles**: HotelTechReport, TheHotelGM, FaultFixers ("Top 10"),
  Snapfix, Crozdesk, GoAudits, Capterra-style pages. These rank for the head terms.
- **Funded vendors**: Quore (the category leader — **22,200/mo brand searches**), MaintainX,
  Flexkeeping, UpKeep, ServiceChannel, Xenia, Coast, Infraspeak, Eptura, MaintainIQ, ClickMaint.

Ranking page-one for the head term against DR70+ vendors and listicles is a multi-year play.
**Strategy: win the long tail + integration terms now, and get _into_ the listicles via directories.**

## Target keywords (priority order)

Low competition + high commercial intent = winnable. Volumes are US/mo from Semrush.

| Keyword | Vol | Comp | CPC | Roomward page | Status |
|---|---|---|---|---|---|
| hotel operations software | 260 | 0.27 | $20 | `/hotel-operations-software` | **shipped** |
| hotel housekeeping software | 260 | 0.45 | $11 | `/hotel-housekeeping-software` | **shipped** |
| housekeeping management software | 170 | 0.09 | $18 | `/hotel-housekeeping-software` | covered |
| hotel asset management software | 140 | 0.28 | $16 | (future) | backlog |
| hotel preventive maintenance software | 110 | 0.27 | — | `/hotel-preventive-maintenance-software` | shipped |
| hotel work order software | 70 | 0.09 | — | `/hotel-work-order-software` | shipped |
| cmms for hotels / hotel cmms | 40 / 20 | 0.39 | **$38** | `/hotel-cmms-software` | **shipped** |
| RoomMaster integration | — | ~0 | — | `/roommaster-integration` | **shipped** (moat) |

Skipped on purpose: "hotel maintenance app" (comp 0.94), "maintenance management software"
(3,600/mo but generic, owned by MaintainX/UpKeep/Limble — not hotel-specific).

### The moat: integration pages

Near-zero competition and matches what Roomward uniquely does (PMS sync). RoomMaster is shipped.
**Next**: `/eptura-integration`, `/opera-pms-integration`, `/cloudbeds-integration`. Anyone
searching "<PMS> work order integration" is a perfect-fit buyer with almost no competing pages.

## Content (blog) — buyer-intent, not Q&A

The question-keyword research came back low-value (salary/tipping/"what does hotel maintenance
do"). Skip informational Q&A. Write **comparison and decision content** that buyers search:

- "Quore alternative" / "Quore vs Roomward" — Quore has 22k brand searches; alternative-seekers convert.
- "Best hotel work order software" — listicle-style, target the comparison intent.
- "Hotel preventive maintenance checklist" — already published; keep this style (practical, linkable).
- "RoomMaster + maintenance: how to auto-create work orders from room status" — ties to the moat page.

## Directories — the highest-ROI lever

The listicles that own the head terms pull from these. Getting listed puts Roomward _inside_
the pages that already rank. Do these first — they outweigh on-page SEO at this stage.

- [ ] **G2** — create listing, seed 3–5 reviews from real users _(user-owned action)_
- [ ] **Capterra / GetApp / Software Advice** (all Gartner network — one submission flows across)
- [ ] **HotelTechReport** — hospitality-specific, ranks #1 for "hotel maintenance software"
- [ ] **Crozdesk**, **GoAudits**/**Snapfix** roundups — request inclusion in their "top tools" posts
- [ ] **Product Hunt** launch (one-time traffic + a backlink)

## Technical/indexing checklist

- [x] `sitemap.ts` lists all marketing + pSEO pages (now 6 landing pages + blog)
- [x] `robots.ts` allows marketing pages, disallows app/api/demo
- [x] New pages added to `middleware.ts` public allowlist (else they'd 302 to login in prod)
- [x] Each pSEO page emits `SoftwareApplication` + `FAQPage` JSON-LD and a canonical URL
- [x] Footer internal links from `/landing` to every pSEO page (crawl paths)
- [ ] **Submit sitemap in Google Search Console** _(user-owned — verify domain first)_
- [ ] Add Bing Webmaster Tools + submit sitemap
- [ ] Confirm OG image (`/og-image.png`) renders in share previews

## Owner key

Code/config items are done in this repo. Items marked _(user-owned)_ need an account/login
(Search Console, G2, etc.) and can't be done from the codebase — they're the next manual step.
