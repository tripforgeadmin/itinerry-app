import { NextRequest } from "next/server";
import { supabase } from "./supabase";

/**
 * Durable fixed-window rate limiter backed by the rate_limit table + atomic
 * rate_limit_hit() RPC (migration 0031). The previous in-process Map was
 * per-instance and cold-start-reset — useless on serverless.
 *
 * Fail-open by default (availability over strictness: an RPC hiccup must not lock
 * the team out of login); pass failClosed=true on abuse-critical endpoints
 * (OAuth token) where letting requests through unmetered is worse.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
  opts: { failClosed?: boolean } = {}
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("rate_limit_hit", {
      p_key: key,
      p_max: maxAttempts,
      p_window_sec: Math.ceil(windowMs / 1000),
    });
    if (error) throw error;
    return data === true;
  } catch (err) {
    console.error("rate_limit_hit error:", err);
    return !opts.failClosed;
  }
}

/** Client IP for rate-limit keys. x-real-ip is set by Vercel's edge (platform-
 * controlled); x-forwarded-for's leftmost hop is caller-spoofable — don't use it. */
export function clientIp(request: NextRequest): string {
  return request.headers.get("x-real-ip") ?? "unknown";
}
