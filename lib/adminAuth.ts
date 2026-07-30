import { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";

/**
 * Admin session auth — extracted from app/api/admin/login/route.ts so proxy.ts and
 * the ~20 admin API routes share one seam (and so the MCP/OAuth layer never has to
 * import a route file).
 *
 * Signing key: ADMIN_JWT_SECRET, a dedicated secret. Historically the HS256 key was
 * the ADMIN_PASSWORD itself — meaning an offline JWT brute-force was a password
 * brute-force, and rotating one rotated the other. During the 7-day grace window
 * verifyAdminSession also accepts tokens signed with the legacy password-derived key
 * so nobody is force-logged-out mid-rollout; delete verifyLegacy after 2026-08-03.
 */

function encode(s: string) {
  return new TextEncoder().encode(s);
}

function getAdminJwtSecret(): Uint8Array {
  const s = process.env.ADMIN_JWT_SECRET;
  if (!s) throw new Error("ADMIN_JWT_SECRET is not set");
  return encode(s);
}

/** Sign a fresh 7-day admin session token (login route only). */
export async function signAdminSession(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getAdminJwtSecret());
}

export async function verifyAdminSession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getAdminJwtSecret());
    return true;
  } catch {
    // Legacy grace: tokens minted before the secret split were signed with the
    // password-derived key. Remove this fallback after 2026-08-03.
    const pw = process.env.ADMIN_PASSWORD;
    if (!pw) return false;
    try {
      await jwtVerify(token, encode(pw));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * CSRF guard for state-changing admin requests. The admin cookie is sameSite=lax,
 * which still leaks on some same-site/fetch paths — so mutations must additionally
 * come from our own origin. Browsers always send Origin on cross-origin POSTs;
 * non-browser clients (curl, tests) send none, which we allow because they can't
 * carry a victim's cookie anyway.
 */
export function assertSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** The one guard every admin API route uses: valid session cookie + same-origin on mutations. */
export async function requireAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("admin_session")?.value;
  if (!token || !(await verifyAdminSession(token))) return false;
  if (request.method !== "GET" && !assertSameOrigin(request)) return false;
  return true;
}
