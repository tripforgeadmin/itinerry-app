import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "./lib/line";
import { verifyAdminSession } from "./lib/adminAuth";
import { LINE_APP_ONLY, requiresLineHandoffUA } from "./lib/line-browser";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes — verify signed JWT (not raw password)
  if (pathname.startsWith("/admin")) {
    if (pathname.startsWith("/admin/login")) return NextResponse.next();
    const adminSession = request.cookies.get("admin_session")?.value;
    if (!adminSession || !(await verifyAdminSession(adminSession))) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  // Phones/tablets outside the LINE app (lib/line-browser.ts): the questionnaire and the login
  // entry bounce to /auth, which shows the "open in LINE" deep-link hand-off instead of a login
  // button. Checked BEFORE the session, so a phone browser already holding a valid session is
  // still sent to LINE. Desktop UAs fall through to the session check below — without a session
  // they land on /auth (LINE Login or a QR to the phone); /api/auth/login proceeds to LINE OAuth.
  // Tablets sending a desktop UA (iPadOS, Android "Desktop site") look like desktops here —
  // components/LineHandoffGuard.tsx bounces those client-side. /auth itself is never gated, so
  // this can't loop.
  const handoffPaths = ["/q", "/done", "/result", "/api/auth/login"];
  if (
    LINE_APP_ONLY &&
    handoffPaths.some((p) => pathname.startsWith(p)) &&
    requiresLineHandoffUA(request.headers.get("user-agent") ?? "")
  ) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // User routes — check LINE session
  const protectedPaths = ["/q", "/done", "/result"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("session")?.value;
  if (!token) return NextResponse.redirect(new URL("/auth", request.url));

  const profile = await verifySessionToken(token);
  if (!profile) return NextResponse.redirect(new URL("/auth", request.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/q/:path*", "/done", "/result/:path*", "/admin/:path*", "/api/auth/login"],
};
