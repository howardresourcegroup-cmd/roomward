export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE, sessionCookieOptions,
  encodeSession, checkRateLimit, resetRateLimit,
} from "@/lib/server/session";

// ─── Demo-mode login. Credentials come from env vars — NEVER hardcoded. ───────
// This route only exists for demo mode (no Supabase configured). Set in
// .env.local (local) or Cloudflare Pages secrets (hosted demo):
//   DEMO_PASSWORD  (required — the route fails closed without it)
//   DEMO_EMAIL, DEMO_NAME, DEMO_ORG  (optional, have non-secret defaults)
//
// There is intentionally NO fallback password: a baked-in default password is
// exactly the dead attack surface removed in commit 5ae44ac. If DEMO_PASSWORD
// is unset the route returns 503 rather than granting access with a known secret.
// When Supabase is configured this route is unused — auth goes through
// supabase.auth.signInWithPassword().

function getCredentials() {
  const password = process.env.DEMO_PASSWORD;
  if (!password) return [];
  return [
    {
      email:    (process.env.DEMO_EMAIL ?? "manager@grandviewdemo.com").toLowerCase(),
      password,
      name:     process.env.DEMO_NAME ?? "Sarah Mitchell",
      role:     "manager",
      org:      process.env.DEMO_ORG ?? "Grandview Resort & Lodge",
      orgId:    "org-amicolola",
    },
  ];
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("cf-connecting-ip")
          ?? req.headers.get("x-forwarded-for")?.split(",")[0]
          ?? "unknown";

  // Rate limit check
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email    = (body.email    ?? "").toLowerCase().trim();
  const password = (body.password ?? "").trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const users = getCredentials();
  if (users.length === 0) {
    // DEMO_PASSWORD not configured — fail closed instead of using a default.
    return NextResponse.json(
      { error: "Demo login is not configured. Set DEMO_PASSWORD." },
      { status: 503 }
    );
  }
  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    // Don't reveal whether the email exists
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Successful auth — clear rate limit for this IP
  resetRateLimit(ip);

  const session = encodeSession({
    userId: `demo-${user.email}`,
    name:   user.name,
    role:   user.role,
    org:    user.org,
    orgId:  user.orgId,
    iat:    Date.now(),
  });

  const res = NextResponse.json({ ok: true, name: user.name, role: user.role, org: user.org });
  res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
  return res;
}
