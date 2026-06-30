import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "./lib/line";
import { verifyAdminSession } from "./app/api/admin/login/route";

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

  // User routes — check LINE session
  const protectedPaths = ["/q", "/done"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("session")?.value;
  if (!token) return NextResponse.redirect(new URL("/auth", request.url));

  const profile = await verifySessionToken(token);
  if (!profile) return NextResponse.redirect(new URL("/auth", request.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/q/:path*", "/done", "/admin/:path*"],
};
