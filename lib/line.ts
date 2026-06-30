import { SignJWT, jwtVerify } from "jose";
import {
  LINE_AUTH_URL,
  LINE_TOKEN_URL,
  LINE_PROFILE_URL,
  LINE_CALLBACK_URL,
} from "./constants";

const rawSecret = process.env.LINE_CHANNEL_SECRET;
if (!rawSecret) throw new Error("LINE_CHANNEL_SECRET is not set");
const secret = new TextEncoder().encode(rawSecret);

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

export function buildLineAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINE_CHANNEL_ID ?? "",
    redirect_uri: LINE_CALLBACK_URL,
    scope: "profile openid friendship_status_read",
    state,
    bot_prompt: "aggressive",
  });
  return `${LINE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch(LINE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: LINE_CALLBACK_URL,
      client_id: process.env.LINE_CHANNEL_ID ?? "",
      client_secret: process.env.LINE_CHANNEL_SECRET ?? "",
    }),
  });
  if (!res.ok) throw new Error("Failed to exchange LINE code");
  const data = await res.json();
  return data.access_token as string;
}

export async function getLineProfile(
  accessToken: string
): Promise<LineProfile> {
  const res = await fetch(LINE_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch LINE profile");
  return res.json();
}

export async function createSessionToken(profile: LineProfile): Promise<string> {
  return new SignJWT({ ...profile })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(
  token: string
): Promise<LineProfile | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as LineProfile;
  } catch {
    return null;
  }
}

export async function checkLineFriendship(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.line.me/friendship/v1/status", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.friendFlag === true;
  } catch {
    return false;
  }
}
