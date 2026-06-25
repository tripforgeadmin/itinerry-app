import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  getLineProfile,
  createSessionToken,
} from "@/lib/line";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/auth?error=cancelled", request.url));
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    const profile = await getLineProfile(accessToken);
    const sessionToken = await createSessionToken(profile);

    const response = NextResponse.redirect(new URL("/q", request.url));
    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/auth?error=failed", request.url));
  }
}
