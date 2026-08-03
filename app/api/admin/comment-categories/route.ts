import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import { fetchCommentCategories } from "@/lib/comment-categories";

const clean = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Flat Problem/Solution taxonomy CRUD — same shape as lost-reasons but single-level with `kind`. */
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, categories: await fetchCommentCategories(false) });
}

async function nextSort(kind: string): Promise<number> {
  const { data } = await supabase
    .from("comment_category")
    .select("sort_order")
    .eq("kind", kind)
    .order("sort_order", { ascending: false })
    .limit(1);
  return ((data?.[0]?.sort_order as number) ?? 0) + 10;
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  if (body.action === "add") {
    const labelTh = clean(body.labelTh);
    const kind = clean(body.kind);
    if (!labelTh) return NextResponse.json({ ok: false, error: "label required" }, { status: 400 });
    if (kind !== "problem" && kind !== "solution") {
      return NextResponse.json({ ok: false, error: "invalid kind" }, { status: 400 });
    }
    const key = `cc_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
    const { error } = await supabase.from("comment_category").insert({
      key, kind, label_th: labelTh, label_en: clean(body.labelEn) || null, sort_order: await nextSort(kind),
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
    const { error } = await supabase.from("comment_category").update(patch).eq("key", key);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "toggle") {
    const key = clean(body.key);
    if (!key) return NextResponse.json({ ok: false, error: "key required" }, { status: 400 });
    const { error } = await supabase.from("comment_category").update({ active: body.active === true }).eq("key", key);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    const key = clean(body.key);
    if (!key) return NextResponse.json({ ok: false, error: "key required" }, { status: 400 });
    // case_comment references stay valid history: FK has no cascade, so a referenced key
    // can't be deleted — surface that as a friendly error and suggest toggle instead.
    const { error } = await supabase.from("comment_category").delete().eq("key", key);
    if (error) {
      const inUse = error.code === "23503";
      return NextResponse.json(
        { ok: false, error: inUse ? "in_use" : error.message },
        { status: inUse ? 409 : 500 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
}
