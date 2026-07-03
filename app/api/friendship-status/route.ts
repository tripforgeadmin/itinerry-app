import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/line";

/**
 * Live "is this user a friend of the OA yet?" check for the /done page — no user access token
 * needed: the Messaging API bot-profile endpoint returns 200 only for friends (404 otherwise).
 * Responds { isFriend: boolean | null } (null = couldn't determine) and refreshes the readable
 * isFriend cookie when it got a definite answer. Never 500s — this is a UX nicety.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;
    const profile = token ? await verifySessionToken(token) : null;
    const accessToken = process.env.LINE_MESSAGING_ACCESS_TOKEN;
    if (!profile?.userId || !accessToken) {
      return NextResponse.json({ isFriend: null });
    }

    const res = await fetch(`https://api.line.me/v2/bot/profile/${profile.userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status !== 200 && res.status !== 404) {
      return NextResponse.json({ isFriend: null });
    }

    const isFriend = res.status === 200;
    const response = NextResponse.json({ isFriend });
    response.cookies.set("isFriend", isFriend ? "1" : "0", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("friendship-status error:", err);
    return NextResponse.json({ isFriend: null });
  }
}
