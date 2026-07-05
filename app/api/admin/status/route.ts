import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/app/api/admin/login/route";
import { VALID_STATUSES } from "@/lib/status";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id, status } = await request.json();
  if (!id || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ ok: false, error: "invalid input" }, { status: 400 });
  }

  const { data: current } = await supabase
    .from("user_assessment")
    .select("status")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("user_assessment")
    .update({ status })
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false }, { status: 500 });

  if (current && current.status !== status) {
    const { error: historyError } = await supabase
      .from("status_history")
      .insert({ assessment_id: id, from_status: current.status, to_status: status });
    if (historyError) console.error("status_history insert failed:", historyError);
  }

  return NextResponse.json({ ok: true });
}
