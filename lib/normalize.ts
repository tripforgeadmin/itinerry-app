/**
 * Tiny input/row normalizers that ~20 routes and pages had each re-implemented.
 * New code imports from here; existing copies migrate opportunistically.
 */

/** Trim + cap a string body field; anything non-string becomes "". */
export function clean(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** PostgREST FK embeds come back object-or-array depending on relationship shape. */
export function one<T>(v: unknown): T | null {
  return ((Array.isArray(v) ? v[0] : v) ?? null) as T | null;
}
