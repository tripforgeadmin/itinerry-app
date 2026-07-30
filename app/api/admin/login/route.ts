import { NextRequest, NextResponse } from "next/server";
import { signAdminSession, verifyAdminSession } from "@/lib/adminAuth";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// Session signing/verification lives in lib/adminAuth.ts (dedicated ADMIN_JWT_SECRET,
// no longer the password itself). Re-exported here because ~20 routes historically
// imported verifyAdminSession from this file; new code imports from @/lib/adminAuth.
export { verifyAdminSession };

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!(await checkRateLimit(`admin_login:${ip}`, 5, 15 * 60 * 1000))) {
    return NextResponse.json({ ok: false, error: "too many attempts" }, { status: 429 });
  }

  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || password !== adminPassword) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = await signAdminSession();

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
