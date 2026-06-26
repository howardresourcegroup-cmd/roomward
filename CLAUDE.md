# Roomward

Hotel facilities-operations + CMMS platform: live property map, work orders, housekeeping,
front desk, assets, technicians, team chat, corporate/audit, RBAC, billing, and PMS sync
(RoomMaster, Eptura, and others). Marketed at **roomward.app**.

> **Brand vs. infra naming.** User-facing brand is **Roomward** (capitalized). The lowercase
> identifier **`facilityflow`** is the original infra name and is load-bearing — it's the
> Cloudflare Pages project (`wrangler.toml`, the `deploy` script), the repo folder, and the
> zustand persist keys (`facilityflow-data`, `facilityflow-chat`). **Do not rename lowercase
> `facilityflow`** — it would break the live deploy and reset persisted demo state. Rename only
> capitalized brand text.

## Stack

- **Next.js 15** (App Router, Turbopack) · **React 19** · **TypeScript** (`strict: true`)
- **Tailwind CSS 3** — dark mode is always-on
- **Supabase** — Postgres + Auth + Realtime + Storage (RLS-scoped)
- **Stripe** — billing (`$149/mo` standard, `$249/mo` for 25+ user orgs)
- **zustand** (UI + demo data) · **framer-motion** · **recharts** · **Radix UI** · **lucide-react**
- **Anthropic API** — optional AI property setup ("describe your property")
- Deploy: **Cloudflare Pages** via `@cloudflare/next-on-pages`; API routes use `runtime = "edge"`

## Commands

```bash
npm run dev        # local dev (Turbopack), localhost:3000
npm run build      # next build
npm run lint       # next lint
npm test           # Vitest (unit tests for pure logic)
npm run deploy     # build:cf + wrangler pages deploy → Cloudflare project "facilityflow"
```

## Two runtime modes

The app runs with **no Supabase configured** (demo) or **with Supabase** (production). The mode
is detected in [middleware.ts](middleware.ts) from `NEXT_PUBLIC_SUPABASE_URL`
(unset or contains `your-project-id` → demo).

- **Demo mode** — mock data from [lib/mock-data.ts](lib/mock-data.ts) held in the zustand
  [data-store](lib/store/data-store.ts); auth is a signed cookie session
  ([lib/server/session.ts](lib/server/session.ts)) via [app/api/auth/login](app/api/auth/login/route.ts).
- **Production** — Supabase JWT auth; all data goes through RLS-scoped queries.

## Architecture

- `app/(auth)/` — login, signup. `app/(dashboard)/` — all authenticated routes.
  `app/api/` — edge routes (billing, PMS sync, team invites, AI). Public marketing/SEO pages
  live at the app root (`/landing`, `/blog`, `/hotel-work-order-software`, etc.).
- **Data layer** is split:
  - [lib/data/queries.ts](lib/data/queries.ts) — pure Supabase reads/writes. **RLS scopes
    every query to the user's org automatically — never add manual `organization_id` filters
    to reads.** Inserts that need the org resolve it via `profiles.organization_id`.
  - [lib/data/hooks.ts](lib/data/hooks.ts) — React hooks wrapping queries in a module-scope
    stale-while-revalidate cache + Realtime subscriptions. Dashboard pages consume these.
  - [lib/data/roles.ts](lib/data/roles.ts) — roles/permissions reads + the `my_permissions()` RPC.
- **RBAC** — [lib/permissions.ts](lib/permissions.ts) `PERMISSION_CATALOG` is the **single
  source of truth**. It drives both the role-editor UI and permission checks; add a key there
  and it appears everywhere. Roles live in the `roles` table; a profile's effective role is
  `role_slug` (resolved from the joined role), not the legacy `profiles.role` text column
  (kept in sync only for coarse RLS).
- **Types** — [types/index.ts](types/index.ts) is the hand-written type model. Virtual/joined
  fields are marked `// virtual`.
- **DB** — [supabase/migrations/](supabase/migrations/) are sequential (`001`…`014`); never
  edit a shipped migration, add a new one. `seed_demo.sql` / `seed_demo_teardown.sql` manage
  the demo org.

## Conventions

- Reference files in prose with markdown links, not backticks.
- New capabilities that need a permission: add the key to `PERMISSION_CATALOG` first.
- Marketing/SEO pages: brand string is "Roomward", canonical domain `https://roomward.app`.
  The sitemap ([app/sitemap.ts](app/sitemap.ts)) must list any new public page.
- Tests cover **pure logic** (status mappings, permission math, stats computation), not
  Supabase I/O. Keep that logic in plain modules so it stays testable.
