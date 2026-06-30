import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { checkRateLimit } from "@/lib/rateLimit";

function getAdminSecret() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error("ADMIN_PASSWORD is not set");
  return new TextEncoder().encode(pw);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(`admin_login:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "too many attempts" }, { status: 429 });
  }

  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || password !== adminPassword) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Store a signed JWT in the cookie — not the raw password
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getAdminSecret());

  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}

// Helper used by proxy.ts and middleware to validate the session cookie
export async function verifyAdminSession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getAdminSecret());
    return true;
  } catch {
    return false;
  }
}
