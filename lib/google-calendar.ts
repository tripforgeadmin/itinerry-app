import { SignJWT, importPKCS8 } from "jose";

/**
 * Google Calendar WRITE access for consultation bookings — creates a real event (with a
 * Google Meet link for online meetings) on the team calendar, separate from the read-only
 * iCal feed in lib/ads-calendar.ts (GOOGLE_CALENDAR_ICS_URL) used for availability checks.
 *
 * Two auth methods are supported, tried in this order:
 *  1. OAuth refresh token (GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN) — a real Google
 *     account (e.g. admin@tripforge.co) authorizes this app once via the standard consent
 *     screen; the refresh token then mints access tokens indefinitely. Not a service-account
 *     key, so it isn't affected by an org policy that blocks service-account key creation
 *     (constraints/iam.disableServiceAccountKeyCreation) — the fallback for orgs that
 *     enforce that policy and can't grant a project-level override.
 *  2. Service-account JWT-bearer (GOOGLE_SERVICE_ACCOUNT_EMAIL/PRIVATE_KEY) — the original
 *     method, works when service-account keys are allowed.
 * Both are signed/exchanged with `jose` + plain fetch — no googleapis SDK needed, matching
 * the rest of this codebase's external-API style (see lib/ads-calendar.ts).
 *
 * Every export here is best-effort: on any failure it logs and returns null rather than
 * throwing, because a booking must always succeed even if the calendar push fails. With
 * neither auth method configured, the feature silently no-ops — same posture as
 * GOOGLE_CALENDAR_ICS_URL / AI_DRAFT_ENABLED elsewhere in the app.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/calendar";
const API_BASE = "https://www.googleapis.com/calendar/v3/calendars";

function hasOAuthCreds(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  );
}

function hasServiceAccountCreds(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
}

export function calendarWriteEnabled(): boolean {
  return (hasOAuthCreds() || hasServiceAccountCreds()) && Boolean(process.env.GOOGLE_CALENDAR_ID);
}

// Module-level cache — tokens are valid ~1h; refresh a little early. Shared across both
// auth methods since only one is ever configured at a time in practice.
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessTokenViaOAuth(): Promise<string | null> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN!;
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) {
      console.error("google calendar oauth refresh failed:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = (await res.json()) as { access_token: string; expires_in: number };
    tokenCache = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 300) * 1000 };
    return json.access_token;
  } catch (err) {
    console.error("google calendar oauth refresh error:", err);
    return null;
  }
}

async function getAccessTokenViaServiceAccount(): Promise<string | null> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!;
  try {
    // Env editors vary on whether embedded newlines survive; accept either real newlines
    // or the common \n-escaped form.
    const pem = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;
    const key = await importPKCS8(pem, "RS256");

    const now = Math.floor(Date.now() / 1000);
    const assertion = await new SignJWT({ scope: SCOPE })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(email)
      .setAudience(TOKEN_URL)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(key);

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    if (!res.ok) {
      console.error("google calendar token exchange failed:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = (await res.json()) as { access_token: string; expires_in: number };
    tokenCache = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 300) * 1000 };
    return json.access_token;
  } catch (err) {
    console.error("google calendar auth error:", err);
    return null;
  }
}

async function getAccessToken(): Promise<string | null> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  if (hasOAuthCreds()) return getAccessTokenViaOAuth();
  if (hasServiceAccountCreds()) return getAccessTokenViaServiceAccount();
  return null;
}

export type CreatedCalendarEvent = { eventId: string; meetLink: string | null };

/** Creates a calendar event; for channel "online" also requests a Google Meet link. */
export async function createCalendarEvent(args: {
  channel: "phone" | "online";
  startIso: string;
  endIso: string;
  title: string;
  description: string;
}): Promise<CreatedCalendarEvent | null> {
  if (!calendarWriteEnabled()) return null;
  const token = await getAccessToken();
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!token || !calendarId) return null;

  const body: Record<string, unknown> = {
    summary: args.title,
    description: args.description,
    start: { dateTime: args.startIso, timeZone: "Asia/Bangkok" },
    end: { dateTime: args.endIso, timeZone: "Asia/Bangkok" },
  };
  if (args.channel === "online") {
    body.conferenceData = {
      createRequest: {
        requestId: `booking-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  try {
    const url = `${API_BASE}/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("google calendar create event failed:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = (await res.json()) as { id: string; hangoutLink?: string };
    return { eventId: json.id, meetLink: json.hangoutLink ?? null };
  } catch (err) {
    console.error("google calendar create event error:", err);
    return null;
  }
}

/** Best-effort title patch — used once the ticket ID is minted (after the event already
 * exists, since ticket generation happens later in the booking flow). */
export async function updateCalendarEventTitle(eventId: string, title: string): Promise<void> {
  if (!calendarWriteEnabled()) return;
  const token = await getAccessToken();
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!token || !calendarId) return;

  try {
    const url = `${API_BASE}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ summary: title }),
    });
    if (!res.ok) {
      console.error("google calendar update event title failed:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("google calendar update event title error:", err);
  }
}

/** Best-effort delete — used when a booking is cancelled. */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  if (!calendarWriteEnabled()) return;
  const token = await getAccessToken();
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!token || !calendarId) return;

  try {
    const url = `${API_BASE}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
    const res = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    // 410 Gone = already deleted (e.g. removed by hand on the calendar) — not an error.
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      console.error("google calendar delete event failed:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("google calendar delete event error:", err);
  }
}
