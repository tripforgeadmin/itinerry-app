import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import { fetchLostReasonTree } from "@/lib/lost-reasons";

const clean = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Next sort_order among siblings (parent_key = parent, or null for L1). */
async function nextSort(parentKey: string | null): Promise<number> {
  const q = supabase.from("lost_reason_option").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const { data } = parentKey === null ? await q.is("parent_key", null) : await q.eq("parent_key", parentKey);
  return ((data?.[0]?.sort_order as number) ?? 0) + 10;
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, tree: await fetchLostReasonTree(false) }); // false = include inactive
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  if (body.action === "add") {
    const labelTh = clean(body.labelTh);
    if (!labelTh) return NextResponse.json({ ok: false, error: "label required" }, { status: 400 });
    const parentKey: string | null = body.parentKey ? clean(body.parentKey) : null;
    if (parentKey) {
      // sub-reason: parent must be an existing L1 category
      const { data: parent } = await supabase.from("lost_reason_option").select("parent_key").eq("key", parentKey).maybeSingle();
      if (!parent || parent.parent_key !== null) return NextResponse.json({ ok: false, error: "invalid parent" }, { status: 400 });
    }
    const key = `opt_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
    const { error } = await supabase.from("lost_reason_option").insert({
      key, parent_key: parentKey, label_th: labelTh, label_en: clean(body.labelEn) || null, sort_order: await nextSort(parentKey),
    });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, key });
  }

  if (body.action === "update") {
    const key = clean(body.key);
    if (!key) return NextResponse.json({ ok: false, error: "key required" }, { status: 400 });
    const patch: Record<string, unknown> = {};
    if (typeof body.labelTh === "string") {
      const l = clean(body.labelTh);
      if (!l) return NextResponse.json({ ok: false, error: "label required" }, { status: 400 });
      patch.label_th = l;
    }
    if (typeof body.labelEn === "string") patch.label_en = clean(body.labelEn) || null;
    if (typeof body.sortOrder === "number") patch.sort_order = body.sortOrder;
    const { error } = await supabase.from("lost_reason_option").update(patch).eq("key", key);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "toggle") {
    const key = clean(body.key);
    if (!key) return NextResponse.json({ ok: false, error: "key required" }, { status: 400 });
    const { error } = await supabase.from("lost_reason_option").update({ active: body.active === true }).eq("key", key);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    const key = clean(body.key);
    if (!key) return NextResponse.json({ ok: false, error: "key required" }, { status: 400 });
    const { error } = await supabase.from("lost_reason_option").delete().eq("key", key); // children cascade
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
}
