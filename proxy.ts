import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "./lib/line";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/q/:path*", "/done"],
};
