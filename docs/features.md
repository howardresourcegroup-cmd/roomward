# Roomward — Feature Documentation

A complete walkthrough of everything Roomward does today and how each piece works.

Roomward is a **hotel facilities-operations + CMMS platform**. It sits on top of your PMS and
gives maintenance, housekeeping, and the front desk one shared, live view of the property —
work orders, room status, assets, and the hand-offs between teams.

---

## How it runs (two modes)

Roomward detects its mode from whether Supabase is configured (`NEXT_PUBLIC_SUPABASE_URL`):

- **Demo mode** (no Supabase) — runs on mock data held in the browser; a signed cookie logs you
  in. The public `/demo` route provisions a throwaway sandbox that resets when you leave.
- **Production mode** (Supabase) — real Postgres with **Row-Level Security**. Every query is
  automatically scoped to your organization; users only ever see their own org's data.

Everything below works the same in both modes from the user's point of view.

---

## Roles & permissions (the foundation)

Access everywhere is driven by a single **permission catalog** ([lib/permissions.ts](../lib/permissions.ts)).
Each capability is a granular key (e.g. `work_orders.create`, `roles.manage`). The same catalog
drives the role-editor UI *and* every in-app permission check — so a role only ever sees the
pages and buttons it's allowed to use.

**System roles** (seeded per organization):

| Role | What they can do |
|---|---|
| **Administrator** | Everything, including roles & settings |
| **Manager** | Runs operations: work orders, team, buildings, integrations, settings (not roles) |
| **Maintenance Tech** | Works and closes assigned jobs |
| **Housekeeping** | Updates room cleaning status, raises housekeeping issues |
| **Front Desk** | Logs guest-reported issues, views status |
| **Viewer** | Read-only |
| **HR** | Staff directory / corporate (added with the Corporate module) |

You can also create **custom roles** with any combination of permissions in
**Settings → (Roles)**. A user's effective role is their assigned role's slug; managers and
admins manage who has which role.

---

## Navigation map

The sidebar shows only what your role can access:

Dashboard · Buildings · Property Map · Work Orders · Housekeeping · Front Desk · Team Chat ·
Corporate · Technicians · Assets · Reports · Help & Guides · Settings

---

## Dashboard

The home screen is **role-tailored** — each role lands on what matters to them:

- **Maintenance Tech** → "Your active jobs" (the work orders assigned to you).
- **Housekeeping** → "Rooms to clean" (your cleaning queue).
- **Front Desk** → a quick-log view for guest-reported issues.
- **Managers / Admins / Viewers** → the full **operations dashboard**:
  - **Live stat tiles** — active issues, % operational, technicians online, critical alerts,
    completed today, average resolution time (all computed live from your data).
  - **Metrics chart** — work-order trends over time.
  - **Active & Critical** — the most urgent open orders, one click from the detail.
  - **Activity feed** — recent work orders, assignments, and team messages.
  - **Building health** — each building's operational status at a glance.
  - **Integrations panel** (managers/admins only) — RoomMaster + Eptura sync, and the
    "connect your PMS" list.

A greeting, local time, and (in demo) a sandbox banner sit at the top.

---

## Buildings & Property Map

The operational heart of Roomward.

**Buildings list** → pick a building → **building detail**:

- **Live Status by Floor** — every floor with its operational %, issue count, and the specific
  rooms needing attention.
- **Interactive floor plan** — a to-scale grid of rooms, color-coded by status (operational,
  needs maintenance, offline, cleaning required, inspection due, emergency). Cells glow/pulse
  on attention states.
- **Floor builder** (with `buildings.edit_layout`) — draw and resize rooms on the grid with
  real-world scale (feet per cell → automatic square footage), rename floors, set the grid.
- **Add buildings/floors** — manually, or via **AI setup** (below).

### Room detail panel

Click any room to open its panel:

- **Current status** + when it last changed.
- **Why this status** — the open work orders driving the room's state, each linked to its
  work-order detail, plus (for guest rooms) occupancy + housekeeping context and any notes.
  When there are no open orders it tells you the status was set manually or via PMS sync.
- **Change status** — collapsed by default to stay uncluttered; expand to set any status.
  For guest rooms, a status change **pushes back to RoomMaster** automatically.
- **Create Work Order** — opens a new order pre-linked to this room.
- **Mark Resolved** — one-click back to operational when the issue is cleared.

The **Property Map** page is the same live view across the whole property.

---

## Work Orders

Full maintenance lifecycle: **open → assigned → in progress → waiting on parts → completed**
(or cancelled).

- **Create** — title, description, priority (low → critical), category (HVAC, Plumbing,
  Electrical, Housekeeping, Inspection, …), optional room link, optional assignee.
- **Auto-flag the room** — when an order is created against a room, the room's status updates
  to reflect the issue **if it isn't already flagged** ("if not already"): critical → emergency,
  housekeeping → cleaning required, inspection → inspection due, otherwise → needs maintenance.
  This works for **techs and front desk**, not just managers.
- **Detail view** — status changes, reassignment, **photo attachments** (stored in Supabase
  Storage), and a **comment thread** for back-and-forth with full history.
- **Assignment** — dispatch to a technician or team; everyone sees what's theirs.

Who can do what is governed by `work_orders.view/create/edit/assign/complete/delete`.

---

## Housekeeping

A live board of every room by cleaning status: **dirty → in progress → cleaned → ready →
out of service**. Staff update a room's status from any phone; raising a maintenance issue
mid-clean creates a work order without leaving the room. Two-way **RoomMaster** sync keeps
clean/ready status aligned with the PMS so the front desk sees an accurate picture.

---

## Front Desk

A focused console for the desk: see arrivals/departures and room readiness, and **log
guest-reported issues** as work orders (with an optional room link) that route straight to
maintenance. Front-desk orders flag the room status just like any other.

---

## Technicians

The team view for field staff: availability (online/busy), active task counts, and the ability
to assign work orders directly from a technician's card. Counts treat the legacy `technician`
and the current `maintenance` role slug as the same thing, so no one is miscounted.

---

## Assets

The equipment registry / CMMS backbone: track make, model, serial number, location, condition
(operational / degraded / failed / maintenance), and **next preventive-maintenance date** for
HVAC, boilers, elevators, pumps, and appliances. Assets tie to the rooms they live in, and
appear in the room detail drill-down. Governed by `assets.view` / `assets.manage`.

---

## Team Chat

Real-time messaging organized by **channel** (e.g. maintenance, housekeeping, front desk).
Messages can reference a work order or room for context, and update live via Supabase Realtime.
Gated by `chat.participate`.

---

## Reports

Operational analytics (`reports.view`):

- **KPI tiles** — average resolution time, completion rate, open work orders, critical this month.
- **Monthly bar chart** — orders opened vs. closed vs. critical over time.
- **Category breakdown** — a pie chart of where the work is going (HVAC, plumbing, etc.).

All computed from your live work-order history.

---

## Corporate

A management layer (three tabs):

- **Announcements** — post to the whole org or target specific roles; targeted staff get an
  in-app notification.
- **Staff** — the organization directory.
- **Audit Log** — a chronological trail of who changed what (work orders, rooms, staff), with
  filters. Populated automatically by database triggers, so it's tamper-resistant.

---

## Settings

- **Organization** — name and org-level settings.
- **Billing & Plan** — current plan, trial status, and upgrade (Stripe).
- **Integrations** — connect/sync PMS & CMMS systems (`integrations.manage`).
- **Team Members** — invite, edit, and assign roles (`team.manage`).
- **Roles** — the permission-matrix editor, generated from the permission catalog
  (`roles.manage`).
- **Notifications**, **Security**, and **Appearance** (accent color) preferences.

---

## PMS / CMMS integrations

Roomward is an operations layer *on top of* your existing systems — it syncs, it doesn't replace.

- **RoomMaster (IQware)** — **two-way room-status sync**. Pulls room statuses on every sync;
  dirty / out-of-service / maintenance statuses **auto-create work orders**; clean/ready status
  set in Roomward **pushes back** to RoomMaster. Single-room updates can arrive instantly via
  webhook. Status codes map cleanly both directions.
- **Eptura Asset (CMMS)** — **two-way work-order + asset sync**. Pulls Eptura work orders and
  the asset registry (with status/priority mapped automatically) and pushes status changes back.
- **Opera (Oracle Hospitality)** and **Cloudbeds** — operations-layer connections set up by the
  Roomward team; room status stays in sync while you keep your PMS.
- **Request another** — any other PMS can be requested and the team will connect it.

Each integration also has a public marketing page (e.g. `/roommaster-integration`,
`/eptura-integration`) explaining the sync in detail.

---

## AI property setup

Instead of building floors and rooms by hand, describe your property in plain English
("3-story boutique hotel, 14 rooms per floor, plus a lobby and a pool house"). An AI assistant
(Claude Haiku) parses that into a structured configuration — room counts per floor and floor
labels — and Roomward generates the whole building: floors, grid-positioned guest rooms, and a
realistic starting status mix, all flowing into the floor plan, housekeeping board, and work
orders from that one description. Requires an Anthropic API key; the rest of the app works
without it.

---

## Billing & plans

Stripe-powered subscriptions with a **14-day free trial**:

- **Standard** — $149/month per property, up to 25 team members.
- **Pro** — $249/month per property, unlimited team members (auto-selected for 25+ user orgs).

Checkout, subscription, and webhook handling run as edge API routes.

---

## Public / marketing surface

Beyond the app, Roomward ships a marketing + SEO surface at `roomward.app`:

- A landing page, a blog, and **keyword-targeted landing pages** for hotel work-order software,
  preventive maintenance, housekeeping software, operations software, and hotel CMMS.
- **Integration pages** (RoomMaster, Eptura, Opera, Cloudbeds) and a **Quore alternative**
  comparison page.
- Each page emits structured data (SoftwareApplication + FAQPage JSON-LD) and a canonical URL;
  all are listed in the sitemap and allowed in robots.

See [seo-visibility-plan.md](seo-visibility-plan.md) for the visibility strategy.

---

## Quality & security model

- **RLS everywhere** in production — queries are org-scoped automatically; there are no manual
  org filters to forget.
- **Security headers** on every response (CSP, HSTS, frame-deny, no-sniff).
- **Demo login** is env-only — no password is baked into the code; it fails closed if unset.
- **Unit tests** (Vitest) cover the pure logic — RoomMaster/Eptura status mapping, the
  permission catalog, dashboard-stats math, and the work-order → room-status rule.

---

## Onboarding helpers

- **Product tour** — an interactive, restartable walkthrough that spotlights real UI (auto-starts
  from the demo, restartable from Help).
- **Welcome modal** and **Getting Started** checklist for new orgs.
- **Help & Guides** — in-app tutorials for the core workflows.
