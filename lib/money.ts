/**
 * THB money helpers — the repo's first money code, so the conventions live here:
 * amounts are plain numbers in baht (numeric(12,2) in the DB), rounded half-up
 * to 2 decimals, THB-only for now (quote.currency exists for later).
 * Dependency-free; safe on both server and client.
 */

/** Round half-up to 2 decimals (positive amounts). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const THB = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const THB_WHOLE = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** "฿3,999.00" — quote lines, totals, PDF. */
export function formatTHB(n: number): string {
  return THB.format(n);
}

/** "฿3,999" — list views where satang is noise. Falls back to 2dp when not whole. */
export function formatTHBCompact(n: number): string {
  return Number.isInteger(n) ? THB_WHOLE.format(n) : THB.format(n);
}

/** Parse an admin money input ("3,999.50", "฿1200") → number, or null if not a valid amount ≥ 0. */
export function parseMoneyInput(s: string): number | null {
  const cleaned = s.replace(/[฿,\s]/g, "");
  if (!cleaned || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
