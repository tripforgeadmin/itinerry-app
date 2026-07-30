import { supabase } from "./supabase";
import { clean } from "./normalize";
import { resolveKitComponents, resolveUnitPrice } from "./products";
import { generateQuoteNumber, recomputeQuoteTotals, toLineRow, toQuoteRow, type QuoteRow } from "./quotes";
import { computeLineTotal, expandKit } from "./quote-math.ts";
import { canTransition, isQuoteEditable, VALID_QUOTE_STATUSES } from "./quote-status";
import { bangkokNow } from "./holidays";

/**
 * Quote mutations — the single implementation behind both the admin HTTP route
 * (app/api/admin/quotes) and the MCP quote tools. Extracted verbatim from the
 * route's action dispatch; hard-delete deliberately stays HTTP-only.
 */

export type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string; code: 400 | 404 | 500 };

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export async function getQuoteById(id: string): Promise<QuoteRow | null> {
  const { data } = await supabase.from("quote").select("*").eq("id", id).maybeSingle();
  return data ? toQuoteRow(data as Record<string, unknown>) : null;
}

export async function getQuoteByNumber(quoteNumber: string): Promise<QuoteRow | null> {
  const { data } = await supabase.from("quote").select("*").eq("quote_number", quoteNumber).maybeSingle();
  return data ? toQuoteRow(data as Record<string, unknown>) : null;
}

async function journal(quoteId: string, from: string | null, to: string, note?: string) {
  await supabase.from("quote_status_history").insert({
    quote_id: quoteId,
    from_status: from,
    to_status: to,
    note: note || null,
  });
}

export async function createQuote(body: Record<string, unknown>): Promise<ActionResult<{ id: string }>> {
  const name = clean(body.name);
  const customerName = clean(body.customerName, 120);
  const priceBookId = clean(body.priceBookId, 40);
  if (!name || !customerName || !priceBookId) {
    return { ok: false, error: "name, customerName, priceBookId required", code: 400 };
  }
  const { data: book } = await supabase
    .from("price_book")
    .select("id, active")
    .eq("id", priceBookId)
    .maybeSingle();
  if (!book || !(book as { active: boolean }).active) {
    return { ok: false, error: "invalid price book", code: 400 };
  }
  const vatRate = num(body.vatRate);
  const insert: Record<string, unknown> = {
    quote_number: await generateQuoteNumber(),
    name,
    customer_name: customerName,
    customer_phone: clean(body.customerPhone, 40) || null,
    customer_email: clean(body.customerEmail, 120) || null,
    customer_address: clean(body.customerAddress, 500) || null,
    price_book_id: priceBookId,
    quote_date: bangkokNow().iso,
    valid_until: isDate(body.validUntil) ? body.validUntil : null,
    vat_rate: vatRate !== null && vatRate >= 0 && vatRate <= 100 ? vatRate : 0,
    assessment_id: clean(body.assessmentId, 40) || null,
    account_id: clean(body.accountId, 40) || null,
    credit_days:
      typeof body.creditDays === "number" && Number.isInteger(body.creditDays) && body.creditDays >= 0 && body.creditDays <= 365
        ? body.creditDays
        : null,
    sales_person: clean(body.salesPerson, 80) || null,
  };
  let { data, error } = await supabase.from("quote").insert(insert).select("id").single();
  if (error && error.code === "23505") {
    // quote_number collision (fail-soft random path) — retry once with a fresh number.
    insert.quote_number = await generateQuoteNumber();
    ({ data, error } = await supabase.from("quote").insert(insert).select("id").single());
  }
  if (error || !data) {
    return { ok: false, error: error?.message ?? "insert failed", code: 500 };
  }
  await journal(data.id, null, "draft");
  return { ok: true, id: data.id };
}

export async function updateQuoteHeader(quote: QuoteRow, body: Record<string, unknown>): Promise<ActionResult> {
  if (!isQuoteEditable(quote.status)) {
    return { ok: false, error: "แก้ไขได้เฉพาะฉบับร่าง", code: 400 };
  }
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const v = clean(body.name);
    if (!v) return { ok: false, error: "name required", code: 400 };
    patch.name = v;
  }
  if (typeof body.customerName === "string") {
    const v = clean(body.customerName, 120);
    if (!v) return { ok: false, error: "customerName required", code: 400 };
    patch.customer_name = v;
  }
  if (typeof body.customerPhone === "string") patch.customer_phone = clean(body.customerPhone, 40) || null;
  if (typeof body.customerEmail === "string") patch.customer_email = clean(body.customerEmail, 120) || null;
  if (typeof body.customerAddress === "string") patch.customer_address = clean(body.customerAddress, 500) || null;
  if (typeof body.notes === "string") patch.notes = clean(body.notes, 2000) || null;
  if (typeof body.terms === "string") patch.terms = clean(body.terms, 2000) || null;
  if (typeof body.salesPerson === "string") patch.sales_person = clean(body.salesPerson, 80) || null;
  if ("creditDays" in body) {
    patch.credit_days =
      typeof body.creditDays === "number" && Number.isInteger(body.creditDays) && body.creditDays >= 0 && body.creditDays <= 365
        ? body.creditDays
        : null;
  }
  if ("validUntil" in body) patch.valid_until = isDate(body.validUntil) ? body.validUntil : null;
  let moneyChanged = false;
  const vatRate = num(body.vatRate);
  if (vatRate !== null && vatRate >= 0 && vatRate <= 100) {
    patch.vat_rate = vatRate;
    moneyChanged = true;
  }
  const discount = num(body.discountAmount);
  if (discount !== null && discount >= 0) {
    patch.discount_amount = Math.round(discount * 100) / 100;
    moneyChanged = true;
  }
  if (typeof body.priceBookId === "string" && body.priceBookId !== quote.price_book_id) {
    // Re-pricing ambiguity: lines were priced from the current book.
    const { count } = await supabase
      .from("quote_line_item")
      .select("id", { count: "exact", head: true })
      .eq("quote_id", quote.id);
    if ((count ?? 0) > 0) {
      return { ok: false, error: "เปลี่ยน price book ไม่ได้เมื่อมีรายการแล้ว — ลบรายการก่อน", code: 400 };
    }
    patch.price_book_id = clean(body.priceBookId, 40);
  }
  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "nothing to update", code: 400 };
  }
  patch.updated_at = new Date().toISOString();
  const { error } = await supabase.from("quote").update(patch).eq("id", quote.id);
  if (error) return { ok: false, error: error.message, code: 500 };
  if (moneyChanged) await recomputeQuoteTotals(quote.id);
  return { ok: true };
}

export async function addQuoteLine(
  quote: QuoteRow,
  body: Record<string, unknown>
): Promise<ActionResult<{ exploded?: number }>> {
  if (!isQuoteEditable(quote.status)) {
    return { ok: false, error: "แก้ไขได้เฉพาะฉบับร่าง", code: 400 };
  }
  const productId = clean(body.productId, 40);
  if (!productId) return { ok: false, error: "productId required", code: 400 };
  const { data: product } = await supabase
    .from("product")
    .select("id, code, name, unit, taxable, active")
    .eq("id", productId)
    .maybeSingle();
  if (!product || !(product as { active: boolean }).active) {
    return { ok: false, error: "invalid product", code: 400 };
  }
  const quantity = num(body.quantity) ?? 1;
  const discountPct = num(body.discountPct) ?? 0;
  if (quantity <= 0 || quantity > 999 || discountPct < 0 || discountPct > 100) {
    return { ok: false, error: "invalid quantity/discount", code: 400 };
  }
  const { data: last } = await supabase
    .from("quote_line_item")
    .select("sort_order")
    .eq("quote_id", quote.id)
    .order("sort_order", { ascending: false })
    .limit(1);
  let sortOrder = (last?.[0]?.sort_order as number) ?? 0;

  // Kit (has components) → phantom-BoM explode: one ordinary line per component,
  // snapshots from the COMPONENT (name/unit/taxable), qty = kit qty × component qty.
  const kitResolution = await resolveKitComponents(productId, quote.price_book_id);
  if (kitResolution.ok) {
    const rows = kitResolution.components.map((c) => {
      const lineQty = expandKit(c.quantity, quantity);
      sortOrder += 10;
      return {
        quote_id: quote.id,
        product_id: c.product.id,
        product_code: c.product.code,
        product_name: c.product.name,
        unit: c.product.unit,
        taxable: c.product.taxable,
        quantity: lineQty,
        unit_price: c.unitPrice,
        discount_pct: discountPct,
        line_total: computeLineTotal({ quantity: lineQty, unitPrice: c.unitPrice, discountPct }),
        sort_order: sortOrder,
      };
    });
    const { error } = await supabase.from("quote_line_item").insert(rows);
    if (error) return { ok: false, error: error.message, code: 500 };
    await recomputeQuoteTotals(quote.id);
    return { ok: true, exploded: rows.length };
  }
  if (!kitResolution.ok && kitResolution.missing.length > 0) {
    return {
      ok: false,
      error: `ส่วนประกอบยังไม่มีราคาใน price book นี้: ${kitResolution.missing.join(", ")}`,
      code: 400,
    };
  }

  // Plain (non-kit) product.
  const unitPrice = await resolveUnitPrice(productId, quote.price_book_id);
  if (unitPrice === null) {
    return { ok: false, error: "สินค้านี้ยังไม่มีราคาใน price book ของใบเสนอราคานี้", code: 400 };
  }
  const p = product as { code: string; name: string; unit: string | null; taxable: boolean };
  const { error } = await supabase.from("quote_line_item").insert({
    quote_id: quote.id,
    product_id: productId,
    product_code: p.code,
    product_name: p.name,
    unit: p.unit,
    taxable: p.taxable,
    quantity,
    unit_price: unitPrice,
    discount_pct: discountPct,
    line_total: computeLineTotal({ quantity, unitPrice, discountPct }),
    sort_order: sortOrder + 10,
  });
  if (error) return { ok: false, error: error.message, code: 500 };
  await recomputeQuoteTotals(quote.id);
  return { ok: true };
}

export async function updateQuoteLine(quote: QuoteRow, body: Record<string, unknown>): Promise<ActionResult> {
  if (!isQuoteEditable(quote.status)) {
    return { ok: false, error: "แก้ไขได้เฉพาะฉบับร่าง", code: 400 };
  }
  const lineId = clean(body.lineId, 40);
  if (!lineId) return { ok: false, error: "lineId required", code: 400 };
  const { data: lineRaw } = await supabase
    .from("quote_line_item")
    .select("*")
    .eq("id", lineId)
    .eq("quote_id", quote.id)
    .maybeSingle();
  if (!lineRaw) return { ok: false, error: "line not found", code: 404 };

  const line = toLineRow(lineRaw as Record<string, unknown>);
  const quantity = num(body.quantity) ?? line.quantity;
  const unitPrice = num(body.unitPrice) ?? line.unit_price;
  const discountPct = num(body.discountPct) ?? line.discount_pct;
  if (quantity <= 0 || quantity > 999 || unitPrice < 0 || discountPct < 0 || discountPct > 100) {
    return { ok: false, error: "invalid quantity/price/discount", code: 400 };
  }
  const patch: Record<string, unknown> = {
    quantity,
    unit_price: Math.round(unitPrice * 100) / 100,
    discount_pct: discountPct,
    line_total: computeLineTotal({ quantity, unitPrice, discountPct }),
  };
  if (typeof body.description === "string") patch.description = clean(body.description, 500) || null;
  if (typeof body.sortOrder === "number") patch.sort_order = body.sortOrder;
  const { error } = await supabase.from("quote_line_item").update(patch).eq("id", lineId);
  if (error) return { ok: false, error: error.message, code: 500 };
  await recomputeQuoteTotals(quote.id);
  return { ok: true };
}

export async function deleteQuoteLine(quote: QuoteRow, body: Record<string, unknown>): Promise<ActionResult> {
  if (!isQuoteEditable(quote.status)) {
    return { ok: false, error: "แก้ไขได้เฉพาะฉบับร่าง", code: 400 };
  }
  const lineId = clean(body.lineId, 40);
  if (!lineId) return { ok: false, error: "lineId required", code: 400 };
  const { data: lineRaw } = await supabase
    .from("quote_line_item")
    .select("id")
    .eq("id", lineId)
    .eq("quote_id", quote.id)
    .maybeSingle();
  if (!lineRaw) return { ok: false, error: "line not found", code: 404 };
  const { error } = await supabase.from("quote_line_item").delete().eq("id", lineId);
  if (error) return { ok: false, error: error.message, code: 500 };
  await recomputeQuoteTotals(quote.id);
  return { ok: true };
}

export async function setQuoteStatus(quote: QuoteRow, body: Record<string, unknown>): Promise<ActionResult> {
  const status = clean(body.status, 20);
  if (!VALID_QUOTE_STATUSES.includes(status)) {
    return { ok: false, error: "invalid status", code: 400 };
  }
  if (!canTransition(quote.status, status)) {
    return { ok: false, error: `เปลี่ยนสถานะจาก ${quote.status} เป็น ${status} ไม่ได้`, code: 400 };
  }
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "sent") patch.sent_at = new Date().toISOString();
  if (["accepted", "rejected", "expired", "canceled"].includes(status)) {
    patch.decided_at = new Date().toISOString();
  }
  if (status === "draft") patch.decided_at = null; // revise clears the decision stamp
  const { error } = await supabase.from("quote").update(patch).eq("id", quote.id);
  if (error) return { ok: false, error: error.message, code: 500 };
  await journal(quote.id, quote.status, status, clean(body.note, 300) || undefined);
  return { ok: true };
}
