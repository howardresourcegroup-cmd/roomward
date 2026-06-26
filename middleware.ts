import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, decodeSession } from "@/lib/server/session";
import { updateSession } from "@/lib/supabase/middleware";

// ─── Security headers applied to every response ───────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
  // Prevent clickjacking
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "frame-ancestors 'none'",

  // Prevent MIME sniffing
  "X-Content-Type-Options": "nosniff",

  // Control referrer info
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Disable browser features not needed
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",

  // Enforce HTTPS for 2 years (Cloudflare already enforces this, belt-and-suspenders)
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",

  // Prevent XSS in older browsers
  "X-XSS-Protection": "1; mode=block",
};

function addSecurityHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthPage    = pathname === "/login" || pathname === "/signup";
  const MARKETING_PAGES = new Set([
    "/landing", "/privacy", "/terms", "/demo",
    "/hotel-work-order-software",
    "/hotel-preventive-maintenance-software",
    "/hotel-housekeeping-software",
    "/hotel-operations-software",
    "/hotel-cmms-software",
    "/roommaster-integration",
    "/eptura-integration",
    "/opera-pms-integration",
    "/cloudbeds-integration",
    "/quore-alternative",
  ]);
  const isPublicPage  = MARKETING_PAGES.has(pathname) || pathname.startsWith("/blog");
  const isApiAuth     = pathname.startsWith("/api/auth");
  const isOAuthCallback = pathname === "/auth/callback" || pathname === "/auth/reset-password";
  const isStatic      = pathname.startsWith("/_next") || pathname.includes(".");

  // Statics don't need auth or headers overhead
  if (isStatic) return NextResponse.next();

  const isDemoMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-id");

  // ── Production: Supabase JWT auth ──────────────────────────────────────────
  if (!isDemoMode) {
    // Public pages, auth pages, and OAuth callback bypass auth entirely
    if (isPublicPage || isAuthPage || isOAuthCallback) {
      return addSecurityHeaders(NextResponse.next());
    }
    const res = await updateSession(request);
    return addSecurityHeaders(res);
  }

  // ── Demo mode: cookie-based session ────────────────────────────────────────

  // Public pages + auth endpoints never require a session
  if (isAuthPage || isPublicPage || isApiAuth || isOAuthCallback) {
    const res = NextResponse.next();
    return addSecurityHeaders(res);
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  const session = sessionCookie ? decodeSession(sessionCookie.value) : null;

  // Not authenticated → redirect to login
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const res = NextResponse.redirect(url);
    return addSecurityHeaders(res);
  }

  // Authenticated → pass through with security headers
  // Inject session info as request headers so server components can read it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-session-user",  session.name);
  requestHeaders.set("x-session-role",  session.role);
  requestHeaders.set("x-session-org",   session.org);
  requestHeaders.set("x-session-orgid", session.orgId);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  return addSecurityHeaders(res);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
