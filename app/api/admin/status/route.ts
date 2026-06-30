import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/app/api/admin/login/route";

const VALID_STATUSES = ["new", "contacted", "in_progress", "completed", "rejected"];

export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id, status } = await request.json();
  if (!id || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ ok: false, error: "invalid input" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_assessment")
    .update({ status })
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
