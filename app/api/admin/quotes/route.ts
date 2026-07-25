import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/app/api/admin/login/route";
import { resolveUnitPrice } from "@/lib/products";
import {
  generateQuoteNumber,
  recomputeQuoteTotals,
  toLineRow,
  toQuoteRow,
} from "@/lib/quotes";
import { computeLineTotal } from "@/lib/quote-math.ts";
import { canTransition, isQuoteEditable, VALID_QUOTE_STATUSES } from "@/lib/quote-status";
import { bangkokNow } from "@/lib/holidays";

async function requireAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("admin_session")?.value;
  return !!token && (await verifyAdminSession(token));
}

const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

async function getQuote(id: string) {
  const { data } = await supabase.from("quote").select("*").eq("id", id).maybeSingle();
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

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  if (body.action === "create") {
    const name = clean(body.name);
    const customerName = clean(body.customerName, 120);
    const priceBookId = clean(body.priceBookId, 40);
    if (!name || !customerName || !priceBookId) {
      return NextResponse.json(
        { ok: false, error: "name, customerName, priceBookId required" },
        { status: 400 }
      );
    }
    const { data: book } = await supabase
      .from("price_book")
      .select("id, active")
      .eq("id", priceBookId)
      .maybeSingle();
    if (!book || !(book as { active: boolean }).active) {
      return NextResponse.json({ ok: false, error: "invalid price book" }, { status: 400 });
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
    };
    let { data, error } = await supabase.from("quote").insert(insert).select("id").single();
    if (error && error.code === "23505") {
      // quote_number collision (fail-soft random path) — retry once with a fresh number.
      insert.quote_number = await generateQuoteNumber();
      ({ data, error } = await supabase.from("quote").insert(insert).select("id").single());
    }
    if (error || !data) {
      return NextResponse.json({ ok: false, error: error?.message ?? "insert failed" }, { status: 500 });
    }
    await journal(data.id, null, "draft");
    return NextResponse.json({ ok: true, id: data.id });
  }

  // Everything below operates on an existing quote.
  const quoteId = clean(body.quoteId, 40);
  if (!quoteId) return NextResponse.json({ ok: false, error: "quoteId required" }, { status: 400 });
  const quote = await getQuote(quoteId);
  if (!quote) return NextResponse.json({ ok: false, error: "quote not found" }, { status: 404 });

  if (body.action === "update_header") {
    if (!isQuoteEditable(quote.status)) {
      return NextResponse.json({ ok: false, error: "แก้ไขได้เฉพาะฉบับร่าง" }, { status: 400 });
    }
    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string") {
      const v = clean(body.name);
      if (!v) return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
      patch.name = v;
    }
    if (typeof body.customerName === "string") {
      const v = clean(body.customerName, 120);
      if (!v) return NextResponse.json({ ok: false, error: "customerName required" }, { status: 400 });
      patch.customer_name = v;
    }
    if (typeof body.customerPhone === "string") patch.customer_phone = clean(body.customerPhone, 40) || null;
    if (typeof body.customerEmail === "string") patch.customer_email = clean(body.customerEmail, 120) || null;
    if (typeof body.customerAddress === "string") patch.customer_address = clean(body.customerAddress, 500) || null;
    if (typeof body.notes === "string") patch.notes = clean(body.notes, 2000) || null;
    if (typeof body.terms === "string") patch.terms = clean(body.terms, 2000) || null;
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
        .eq("quote_id", quoteId);
      if ((count ?? 0) > 0) {
        return NextResponse.json(
          { ok: false, error: "เปลี่ยน price book ไม่ได้เมื่อมีรายการแล้ว — ลบรายการก่อน" },
          { status: 400 }
        );
      }
      patch.price_book_id = clean(body.priceBookId, 40);
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "nothing to update" }, { status: 400 });
    }
    patch.updated_at = new Date().toISOString();
    const { error } = await supabase.from("quote").update(patch).eq("id", quoteId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (moneyChanged) await recomputeQuoteTotals(quoteId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "add_line") {
    if (!isQuoteEditable(quote.status)) {
      return NextResponse.json({ ok: false, error: "แก้ไขได้เฉพาะฉบับร่าง" }, { status: 400 });
    }
    const productId = clean(body.productId, 40);
    if (!productId) return NextResponse.json({ ok: false, error: "productId required" }, { status: 400 });
    const { data: product } = await supabase
      .from("product")
      .select("id, code, name, unit, taxable, active")
      .eq("id", productId)
      .maybeSingle();
    if (!product || !(product as { active: boolean }).active) {
      return NextResponse.json({ ok: false, error: "invalid product" }, { status: 400 });
    }
    const unitPrice = await resolveUnitPrice(productId, quote.price_book_id);
    if (unitPrice === null) {
      return NextResponse.json(
        { ok: false, error: "สินค้านี้ยังไม่มีราคาใน price book ของใบเสนอราคานี้" },
        { status: 400 }
      );
    }
    const quantity = num(body.quantity) ?? 1;
    const discountPct = num(body.discountPct) ?? 0;
    if (quantity <= 0 || quantity > 999 || discountPct < 0 || discountPct > 100) {
      return NextResponse.json({ ok: false, error: "invalid quantity/discount" }, { status: 400 });
    }
    const { data: last } = await supabase
      .from("quote_line_item")
      .select("sort_order")
      .eq("quote_id", quoteId)
      .order("sort_order", { ascending: false })
      .limit(1);
    const p = product as { code: string; name: string; unit: string | null; taxable: boolean };
    const { error } = await supabase.from("quote_line_item").insert({
      quote_id: quoteId,
      product_id: productId,
      product_code: p.code,
      product_name: p.name,
      unit: p.unit,
      taxable: p.taxable,
      quantity,
      unit_price: unitPrice,
      discount_pct: discountPct,
      line_total: computeLineTotal({ quantity, unitPrice, discountPct }),
      sort_order: ((last?.[0]?.sort_order as number) ?? 0) + 10,
    });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    await recomputeQuoteTotals(quoteId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "update_line" || body.action === "delete_line") {
    if (!isQuoteEditable(quote.status)) {
      return NextResponse.json({ ok: false, error: "แก้ไขได้เฉพาะฉบับร่าง" }, { status: 400 });
    }
    const lineId = clean(body.lineId, 40);
    if (!lineId) return NextResponse.json({ ok: false, error: "lineId required" }, { status: 400 });
    const { data: lineRaw } = await supabase
      .from("quote_line_item")
      .select("*")
      .eq("id", lineId)
      .eq("quote_id", quoteId)
      .maybeSingle();
    if (!lineRaw) return NextResponse.json({ ok: false, error: "line not found" }, { status: 404 });

    if (body.action === "delete_line") {
      const { error } = await supabase.from("quote_line_item").delete().eq("id", lineId);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      await recomputeQuoteTotals(quoteId);
      return NextResponse.json({ ok: true });
    }

    const line = toLineRow(lineRaw as Record<string, unknown>);
    const quantity = num(body.quantity) ?? line.quantity;
    const unitPrice = num(body.unitPrice) ?? line.unit_price;
    const discountPct = num(body.discountPct) ?? line.discount_pct;
    if (quantity <= 0 || quantity > 999 || unitPrice < 0 || discountPct < 0 || discountPct > 100) {
      return NextResponse.json({ ok: false, error: "invalid quantity/price/discount" }, { status: 400 });
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
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    await recomputeQuoteTotals(quoteId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "set_status") {
    const status = clean(body.status, 20);
    if (!VALID_QUOTE_STATUSES.includes(status)) {
      return NextResponse.json({ ok: false, error: "invalid status" }, { status: 400 });
    }
    if (!canTransition(quote.status, status)) {
      return NextResponse.json(
        { ok: false, error: `เปลี่ยนสถานะจาก ${quote.status} เป็น ${status} ไม่ได้` },
        { status: 400 }
      );
    }
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === "sent") patch.sent_at = new Date().toISOString();
    if (["accepted", "rejected", "expired", "canceled"].includes(status)) {
      patch.decided_at = new Date().toISOString();
    }
    if (status === "draft") patch.decided_at = null; // revise clears the decision stamp
    const { error } = await supabase.from("quote").update(patch).eq("id", quoteId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    await journal(quoteId, quote.status, status, clean(body.note, 300) || undefined);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    if (!isQuoteEditable(quote.status)) {
      return NextResponse.json({ ok: false, error: "ลบได้เฉพาะฉบับร่าง" }, { status: 400 });
    }
    const { error } = await supabase.from("quote").delete().eq("id", quoteId); // lines cascade
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
}
