import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware runs in Edge runtime.
// Auth cookie presence is checked; full session validation happen in Server Components.

const PUBLIC_PATHS = ["/login", "/api/auth", "/setup", "/api/setup", "/api/ping"];

function getAllowedOrigins(request: NextRequest): Set<string> {
  const allowed = new Set<string>();

  // Always allow current request's own origin (same-origin)
  if (request.nextUrl.origin) {
    allowed.add(request.nextUrl.origin);
  }

  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    envOrigins
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean)
      .forEach((o) => allowed.add(o));
  } else if (process.env.NODE_ENV !== "production") {
    // Default in non-production: permit standard local development origins
    allowed.add("http://localhost:3000");
    allowed.add("http://127.0.0.1:3000");
  }

  return allowed;
}

function applyCorsHeaders(response: NextResponse, origin: string | null, isAllowed: boolean): NextResponse {
  if (origin && isAllowed) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Vary", "Origin");
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins(request);
  const isAllowedOrigin = origin ? allowedOrigins.has(origin) : true;

  // Handle CORS preflight (OPTIONS)
  if (request.method === "OPTIONS") {
    if (origin && !isAllowedOrigin) {
      return new NextResponse("Forbidden: Invalid Origin", { status: 403 });
    }
    const preflightHeaders = new Headers({
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, izah-session-token",
      "Access-Control-Max-Age": "86400",
    });
    if (origin && isAllowedOrigin) {
      preflightHeaders.set("Access-Control-Allow-Origin", origin);
      preflightHeaders.set("Access-Control-Allow-Credentials", "true");
      preflightHeaders.set("Vary", "Origin");
    }
    return new NextResponse(null, { status: 204, headers: preflightHeaders });
  }

  // Reject cross-origin mutation requests (POST, PUT, PATCH, DELETE) with unlisted Origin
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
  if (origin && isMutation && !isAllowedOrigin) {
    return new NextResponse("Forbidden: Invalid Origin", { status: 403 });
  }

  // Allow Next.js internals & static assets (including all public/ files)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/sw.js") ||
    pathname.startsWith("/uploads") ||
    /\.(?:png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|eot|webmanifest)$/i.test(pathname)
  ) {
    return applyCorsHeaders(NextResponse.next(), origin, isAllowedOrigin);
  }

  // Check auth via session cookie – no DB round-trip needed in Edge runtime.
  const hasSession =
    !!request.cookies.get("izah_session_token")?.value ||
    !!request.cookies.get("better-auth.session_token")?.value ||
    !!request.cookies.get("__Secure-better-auth.session_token")?.value;

  // Check setup completion via cookie (set by /api/setup/complete) or existing session
  const setupDone = request.cookies.get("izah-setup-complete")?.value === "1" || hasSession;
  const hasDb = !!process.env.DATABASE_URL || !!(process.env as any).DB;
  const hasAuthSecret = true; // Native auth uses fallback secret if not explicitly provided

  // If setup IS done and trying to access /setup, redirect to login unless ?force=1
  const isSetupPath = pathname.startsWith("/setup") || pathname.startsWith("/api/setup");
  const forceSetup = request.nextUrl.searchParams.get("force") === "1" || request.nextUrl.searchParams.get("force") === "true";
  if (setupDone && isSetupPath && !forceSetup) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Auth routes must always be accessible (Better Auth sign-in/out/session)
  if (pathname.startsWith("/api/auth")) {
    return applyCorsHeaders(NextResponse.next(), origin, isAllowedOrigin);
  }

  // If setup NOT done, redirect to setup (unless already there), but allow other API routes if needed
  if ((!setupDone || !hasDb || !hasAuthSecret) && !isSetupPath) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  // Allow public paths (auth + setup wizard)
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return applyCorsHeaders(NextResponse.next(), origin, isAllowedOrigin);
  }

  // If not authenticated and trying to access protected route, redirect to login
  if (!hasSession) {
    const url = new URL("/login", request.url);
    // Optional: add ?callbackUrl=... if needed, but for POS simple redirect is fine
    return NextResponse.redirect(url);
  }

  return applyCorsHeaders(NextResponse.next(), origin, isAllowedOrigin);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|eot|webmanifest)).*)",
  ],
};
