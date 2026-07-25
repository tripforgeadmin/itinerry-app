import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/app/api/admin/login/route";
import { fetchProducts, VALID_FAMILIES } from "@/lib/products";
import { COUNTRIES } from "@/lib/countries";

async function requireAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("admin_session")?.value;
  return !!token && (await verifyAdminSession(token));
}

const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const VALID_DESTINATIONS = new Set(COUNTRIES.map((c) => c.code));
// Same vocabulary as user_trip.visa_type (lib/answer-labels.ts).
const VALID_VISA_TYPES = new Set(["tourist", "visitor", "business", "student"]);

/** Shared field extraction for add/update. Returns null on a validation error. */
function productPatch(body: Record<string, unknown>): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const name = clean(body.name);
    if (!name) return null;
    patch.name = name;
  }
  if (typeof body.nameEn === "string") patch.name_en = clean(body.nameEn) || null;
  if (typeof body.description === "string") patch.description = clean(body.description, 500) || null;
  if (typeof body.family === "string") {
    if (!VALID_FAMILIES.includes(body.family)) return null;
    patch.family = body.family;
  }
  if (typeof body.destination === "string") {
    const dest = clean(body.destination, 2).toUpperCase();
    if (dest && !VALID_DESTINATIONS.has(dest)) return null;
    patch.destination = dest || null;
  }
  if (typeof body.visaType === "string") {
    const vt = clean(body.visaType, 20);
    if (vt && !VALID_VISA_TYPES.has(vt)) return null;
    patch.visa_type = vt || null;
  }
  if (typeof body.unit === "string") patch.unit = clean(body.unit, 20) || null;
  if (typeof body.taxable === "boolean") patch.taxable = body.taxable;
  if (typeof body.sortOrder === "number") patch.sort_order = body.sortOrder;
  return patch;
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, products: await fetchProducts(false) });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  if (body.action === "add") {
    const code = clean(body.code, 40).toUpperCase().replace(/\s+/g, "-");
    const name = clean(body.name);
    if (!code || !name) {
      return NextResponse.json({ ok: false, error: "code and name required" }, { status: 400 });
    }
    const patch = productPatch(body);
    if (!patch) return NextResponse.json({ ok: false, error: "invalid field" }, { status: 400 });
    // Default sort_order: bottom of the family group, steps of 10 (lost-reasons pattern).
    if (patch.sort_order === undefined) {
      const q = supabase.from("product").select("sort_order").order("sort_order", { ascending: false }).limit(1);
      const { data } = typeof patch.family === "string" ? await q.eq("family", patch.family) : await q;
      patch.sort_order = ((data?.[0]?.sort_order as number) ?? 0) + 10;
    }
    const { data, error } = await supabase
      .from("product")
      .insert({ code, ...patch })
      .select("id")
      .single();
    if (error) {
      const msg = error.code === "23505" ? "รหัสสินค้า (code) นี้มีอยู่แล้ว" : error.message;
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data.id });
  }

  if (body.action === "update") {
    const id = clean(body.id, 40);
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const patch = productPatch(body);
    if (!patch || Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "invalid field" }, { status: 400 });
    }
    patch.updated_at = new Date().toISOString();
    const { error } = await supabase.from("product").update(patch).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "toggle") {
    const id = clean(body.id, 40);
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const { error } = await supabase
      .from("product")
      .update({ active: body.active === true, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    // Safe: quote_line_item snapshots the product and its FK is on delete set null,
    // so history keeps rendering. UI still prefers toggle (soft-deactivate).
    const id = clean(body.id, 40);
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const { error } = await supabase.from("product").delete().eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
}
