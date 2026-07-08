import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/app/api/admin/login/route";

async function requireAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("admin_session")?.value;
  return !!token && (await verifyAdminSession(token));
}

function validConditions(v: unknown): boolean {
  return (
    Array.isArray(v) &&
    v.every(
      (c) =>
        c &&
        typeof c === "object" &&
        typeof c.id === "string" &&
        ["status", "source", "date"].includes(c.field) &&
        ["is_any_of", "is_between"].includes(c.operator)
    )
  );
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const { data, error } = await supabase
    .from("admin_saved_filters")
    .select("id, name, conditions, is_favorite, created_at, updated_at")
    .order("is_favorite", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, filters: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  if (!name || !validConditions(body.conditions)) {
    return NextResponse.json({ ok: false, error: "invalid input" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("admin_saved_filters")
    .insert({ name, conditions: body.conditions, is_favorite: !!body.isFavorite })
    .select("id, name, conditions, is_favorite, created_at, updated_at")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, filter: data });
}
