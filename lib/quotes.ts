import { supabase } from "./supabase";
import { bangkokDay } from "./ticket";
import { computeLineTotal, computeQuoteTotals } from "./quote-math.ts";

/**
 * Quote data access. Quote numbers mint like case tickets (lib/ticket.ts):
 * Bangkok-day counter via an atomic SECURITY DEFINER upsert, fail-soft to a
 * random suffix so a counter outage never blocks quoting.
 */

export interface QuoteRow {
  id: string;
  quote_number: string;
  name: string;
  status: string;
  assessment_id: string | null;
  account_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  price_book_id: string;
  quote_date: string;
  valid_until: string | null;
  currency: string;
  subtotal: number;
  discount_amount: number;
  vat_rate: number;
  vat_amount: number;
  grand_total: number;
  notes: string | null;
  terms: string | null;
  sent_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteLineItemRow {
  id: string;
  quote_id: string;
  product_id: string | null;
  product_code: string | null;
  product_name: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  discount_pct: number;
  taxable: boolean;
  line_total: number;
  sort_order: number;
}

const MONEY_COLS = ["subtotal", "discount_amount", "vat_rate", "vat_amount", "grand_total"] as const;
const LINE_NUM_COLS = ["quantity", "unit_price", "discount_pct", "line_total", "sort_order"] as const;

/** PostgREST serializes numeric as string — normalize once at the boundary. */
export function toQuoteRow(r: Record<string, unknown>): QuoteRow {
  const out = { ...(r as unknown as QuoteRow) };
  for (const c of MONEY_COLS) out[c] = Number(r[c]);
  return out;
}

export function toLineRow(r: Record<string, unknown>): QuoteLineItemRow {
  const out = { ...(r as unknown as QuoteLineItemRow) };
  for (const c of LINE_NUM_COLS) out[c] = Number(r[c]);
  return out;
}

/** Mint the next quote number, QT-<yymmdd>-<nnn>. Fail-soft like generateTicketId. */
export async function generateQuoteNumber(): Promise<string> {
  const day = bangkokDay();
  let n: number;
  try {
    const { data, error } = await supabase.rpc("next_quote_number", { p_day: day });
    if (error || typeof data !== "number") throw error ?? new Error("counter returned no number");
    n = data;
  } catch (err) {
    console.error("quote counter error:", err);
    n = Math.floor(100 + Math.random() * 900);
  }
  return `QT-${day}-${String(n).padStart(3, "0")}`;
}

export interface QuoteListItem extends QuoteRow {
  ticket_id: string | null; // from the linked case, for the list view
}

export async function fetchQuotes(opts: { status?: string } = {}): Promise<QuoteListItem[]> {
  let q = supabase
    .from("quote")
    .select("*, assessment:assessment_id(ticket_id)")
    .order("created_at", { ascending: false });
  if (opts.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) {
    console.error("quote fetch error:", error);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const a = r.assessment as { ticket_id: string | null } | { ticket_id: string | null }[] | null;
    const ticket = Array.isArray(a) ? a[0]?.ticket_id ?? null : a?.ticket_id ?? null;
    return { ...toQuoteRow(r), ticket_id: ticket };
  });
}

export async function fetchQuoteWithLines(
  id: string
): Promise<{ quote: QuoteRow; lines: QuoteLineItemRow[] } | null> {
  const { data: quote, error } = await supabase.from("quote").select("*").eq("id", id).maybeSingle();
  if (error || !quote) return null;
  const { data: lines } = await supabase
    .from("quote_line_item")
    .select("*")
    .eq("quote_id", id)
    .order("sort_order");
  return {
    quote: toQuoteRow(quote as Record<string, unknown>),
    lines: ((lines ?? []) as Record<string, unknown>[]).map(toLineRow),
  };
}

/** Reload lines and persist recomputed totals. Call after EVERY line/header mutation
 * that affects money — stored totals are only ever written here. */
export async function recomputeQuoteTotals(quoteId: string): Promise<void> {
  const { data: quote } = await supabase
    .from("quote")
    .select("discount_amount, vat_rate")
    .eq("id", quoteId)
    .maybeSingle();
  if (!quote) return;
  const { data: lines } = await supabase
    .from("quote_line_item")
    .select("line_total, taxable")
    .eq("quote_id", quoteId);
  const totals = computeQuoteTotals({
    lines: ((lines ?? []) as { line_total: unknown; taxable: boolean }[]).map((l) => ({
      lineTotal: Number(l.line_total),
      taxable: l.taxable,
    })),
    discountAmount: Number((quote as { discount_amount: unknown }).discount_amount),
    vatRate: Number((quote as { vat_rate: unknown }).vat_rate),
  });
  await supabase
    .from("quote")
    .update({
      subtotal: totals.subtotal,
      vat_amount: totals.vatAmount,
      grand_total: totals.grandTotal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId);
}

export { computeLineTotal };
