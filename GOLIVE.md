# Roomward — Go-Live Checklist

Current state and the exact steps to take Roomward from **demo mode** to a
**live, multi-user, persistent** production app.

---

## Where things stand today

| Layer | Status |
|---|---|
| UI / all pages | ✅ Built, deployed, live on Cloudflare |
| Auth (demo) | ✅ Server-side, httpOnly sessions, rate-limited |
| Security hardening | ✅ Headers, secret scanning, CVE patches |
| Supabase clients + middleware | ✅ Wired, auto-activates when keys are present |
| Database schema + RLS + seed | ✅ Written ([migrations](supabase/migrations/)) — not yet run |
| PMS integrations (RoomMaster, Eptura) | ✅ Scaffolds with mock data — need real API tokens |
| **Page data layer → Supabase** | ⛔ **Not yet wired** — pages still read the demo store |

> The last item is the real work between "demo" and "live." Do **Phase 1** below
> (create the project), then I wire + test the data layer against your real tables.

---

## Phase 1 — You create the Supabase project (~10 min)

1. Go to **[supabase.com](https://supabase.com)** → **New Project**
   - Name: `facilityflow`
   - Region: **East US (North Virginia)** — closest to Georgia
   - Set a strong database password (save it in your password manager)
2. Wait ~2 min for it to provision.
3. **Settings → API** — copy these three values:
   - `Project URL`            → e.g. `https://abcdxyz.supabase.co`
   - `anon` `public` key      → safe for the browser
   - `service_role` key       → **secret** — server-only, never commit it
4. **SQL Editor → New query** — run the two migration files in order:
   - Paste all of [`001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql) → Run
   - Paste all of [`002_chat_and_seed.sql`](supabase/migrations/002_chat_and_seed.sql) → Run
5. **Database → Replication** (or Realtime settings) — confirm Realtime is on for
   `spaces`, `work_orders`, `notifications`, `messages`, `channels`.

✅ When done, send me the **Project URL** and **anon key** (NOT the service_role key —
that one goes straight into Cloudflare, never into chat or code).

---

## Phase 2 — I wire + test the data layer (my step)

Once your project exists, I:
1. Replace the demo-store reads with Supabase queries on every page
   (buildings, spaces, work orders, technicians, chat).
2. Wire Supabase Realtime so room-status + chat updates are live across users.
3. Connect the org/profile flow so signups land in your `organizations` table.
4. Test each page against your real tables + RLS policies.
5. Push — Cloudflare auto-deploys.

---

## Phase 3 — Set production secrets in Cloudflare (you, ~5 min)

**Cloudflare Pages → facilityflow → Settings → Variables and Secrets.**
Add as **encrypted** secrets:

| Name | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Project URL | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key | public-safe |
| `SUPABASE_SERVICE_ROLE_KEY` | your service_role key | **secret** |
| `DEMO_MODE` | `false` | turns OFF the demo backdoor |
| `DEMO_PASSWORD` | *(remove, or set strong)* | only if keeping a demo login |
| `RM_API_TOKEN` | *(from RoomMaster Agora)* | when integration goes live |
| `EPTURA_API_TOKEN` | *(from Eptura, Power Plan)* | when integration goes live |

Setting `DEMO_MODE=false` + the Supabase keys flips the app to real auth automatically.

---

## Phase 4 — Final hardening (you, ~5 min)

- [ ] **GitHub → repo Settings → Code security → Secret scanning → Enable** (+ Push protection)
- [ ] Confirm `git config core.hooksPath .githooks` is set on each machine you commit from
- [ ] Enable **2FA** on the Supabase account
- [ ] In Supabase **Auth → URL Configuration**, set Site URL to your Cloudflare domain
- [ ] Invite the real team via **Auth → Users** (or the signup page) and set their roles

---

## Phase 5 — Connect the real PMS data (when Coral is ready)

- **RoomMaster:** request sandbox access at [innquest.com/openapi](https://www.innquest.com/openapi/),
  get the API token + endpoint, drop into `RM_API_TOKEN`, swap the mock block in
  [`app/api/roommaster/route.ts`](app/api/roommaster/route.ts) for the real call.
- **Eptura:** confirm Coral's plan includes API access (Power tier), get the token,
  same swap in [`app/api/eptura/route.ts`](app/api/eptura/route.ts).

---

## Quick reference — what "live" looks like when done

- Real users log in with their own credentials (Supabase Auth)
- Every building, room, work order, and message persists in Postgres
- Room-status + chat updates appear in real time across all logged-in staff
- Each org sees only its own data (enforced by Row Level Security)
- RoomMaster/Eptura sync against real APIs
- Encrypted in transit (TLS 1.3) and at rest (AES-256)
