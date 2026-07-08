import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/app/api/admin/login/route";

async function requireAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("admin_session")?.value;
  return !!token && (await verifyAdminSession(token));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") patch.name = body.name.trim().slice(0, 80);
  if (typeof body.isFavorite === "boolean") patch.is_favorite = body.isFavorite;
  if (body.conditions !== undefined) {
    if (!Array.isArray(body.conditions)) return NextResponse.json({ ok: false, error: "invalid conditions" }, { status: 400 });
    patch.conditions = body.conditions;
  }
  const { error } = await supabase.from("admin_saved_filters").update(patch).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const { error } = await supabase.from("admin_saved_filters").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
