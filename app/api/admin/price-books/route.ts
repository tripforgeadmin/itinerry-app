import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import { fetchEntriesForBook } from "@/lib/products";

const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const book = request.nextUrl.searchParams.get("book") ?? "";
  if (!book) return NextResponse.json({ ok: false, error: "book required" }, { status: 400 });
  return NextResponse.json({ ok: true, entries: await fetchEntriesForBook(book) });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  if (body.action === "add_book") {
    const name = clean(body.name, 100);
    if (!name) return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
    const { data, error } = await supabase
      .from("price_book")
      .insert({ name, description: clean(body.description, 300) || null })
      .select("id")
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id });
  }

  if (body.action === "update_book") {
    const id = clean(body.id, 40);
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string") {
      const name = clean(body.name, 100);
      if (!name) return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
      patch.name = name;
    }
    if (typeof body.description === "string") patch.description = clean(body.description, 300) || null;
    const { error } = await supabase.from("price_book").update(patch).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "toggle_book") {
    const id = clean(body.id, 40);
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    // The standard book stays active — quotes default to it.
    const { data: row } = await supabase.from("price_book").select("is_standard").eq("id", id).maybeSingle();
    if (row?.is_standard && body.active !== true) {
      return NextResponse.json({ ok: false, error: "ปิดใช้งาน price book มาตรฐานไม่ได้" }, { status: 400 });
    }
    const { error } = await supabase.from("price_book").update({ active: body.active === true }).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "set_standard") {
    const id = clean(body.id, 40);
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    // Two-step swap under the partial unique index (only one row may be standard):
    // clear the old flag first, then set the new one.
    const { error: clearErr } = await supabase.from("price_book").update({ is_standard: false }).eq("is_standard", true);
    if (clearErr) return NextResponse.json({ ok: false, error: clearErr.message }, { status: 500 });
    const { error } = await supabase.from("price_book").update({ is_standard: true, active: true }).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "set_entry") {
    const productId = clean(body.productId, 40);
    const priceBookId = clean(body.priceBookId, 40);
    const unitPrice = typeof body.unitPrice === "number" ? body.unitPrice : NaN;
    if (!productId || !priceBookId || !Number.isFinite(unitPrice) || unitPrice < 0) {
      return NextResponse.json({ ok: false, error: "invalid entry" }, { status: 400 });
    }
    const { error } = await supabase.from("price_book_entry").upsert(
      {
        product_id: productId,
        price_book_id: priceBookId,
        unit_price: Math.round(unitPrice * 100) / 100,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id,price_book_id" }
    );
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "toggle_entry") {
    const id = clean(body.id, 40);
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const { error } = await supabase
      .from("price_book_entry")
      .update({ active: body.active === true, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete_entry") {
    const id = clean(body.id, 40);
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const { error } = await supabase.from("price_book_entry").delete().eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
}
