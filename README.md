# Roomward

Real-time operational visibility platform for maintenance teams and facilities management.

## Quick Start

```bash
cd facilityflow
npm install
cp .env.local.example .env.local
# fill in Supabase credentials (optional — app runs with mock data without them)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **No Supabase?** The app runs fully with mock data out of the box. Auth routes will redirect to the dashboard in demo mode.

---

## Setup with Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your **Project URL** and **anon key** into `.env.local`
3. Run the migration in the Supabase SQL editor:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
4. Enable Realtime on tables: `spaces`, `work_orders`, `notifications`, `profiles`

---

## Architecture

```
app/
  (auth)/          # Login, Signup
  (dashboard)/     # All authenticated routes
    page.tsx       # Operations dashboard
    buildings/     # Building list + floorplan detail
    work-orders/   # Work order list, create, detail
    technicians/   # Technician management
components/
  layout/          # Sidebar, Header
  dashboard/       # Stats, charts, activity feed
  buildings/       # Building cards, create modal
  floorplan/       # Interactive floor grid + room cells
  work-orders/     # Cards, form
  shared/          # Badges, empty states, loaders
  ui/              # Radix-based primitives (shadcn style)
lib/
  supabase/        # Browser + server clients, middleware
  store/           # Zustand app state
  mock-data.ts     # Demo data for development
  utils.ts         # cn(), status configs, formatters
types/index.ts     # All TypeScript types
supabase/
  migrations/      # SQL schema
```

## Tech Stack

- **Next.js 15** (App Router, Turbopack)
- **React 19**
- **Tailwind CSS 3**
- **Framer Motion** — animations
- **Supabase** — Postgres, Auth, Realtime
- **Zustand** — UI state
- **Recharts** — metrics chart
- **Radix UI** — accessible primitives
- **lucide-react** — icons

## Key Features

| Feature | Status |
|---|---|
| Operations dashboard | ✅ |
| Building management | ✅ |
| Interactive floorplan with room status | ✅ |
| Work order lifecycle | ✅ |
| Technician overview | ✅ |
| Auth (Supabase) | ✅ |
| Realtime subscriptions | Wired (needs Supabase) |
| Mobile responsive | ✅ |
| Dark mode | ✅ Always-on |
