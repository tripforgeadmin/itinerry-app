import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/app/api/admin/login/route";

const LINE_ID_RE = /^U[0-9a-f]{32}$/; // same format the account.line_user_id_fmt_chk DB constraint enforces

export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const accountId = typeof body.accountId === "string" ? body.accountId : "";
  const lineUserId = typeof body.lineUserId === "string" ? body.lineUserId.trim() : "";

  if (!accountId) return NextResponse.json({ ok: false, error: "accountId required" }, { status: 400 });
  if (!LINE_ID_RE.test(lineUserId)) {
    return NextResponse.json({ ok: false, error: "invalid LINE user id format (expected U + 32 hex chars)" }, { status: 400 });
  }

  const { error } = await supabase
    .from("account")
    .update({ line_user_id: lineUserId, updated_at: new Date().toISOString() })
    .eq("id", accountId);

  if (error) {
    const dup = error.code === "23505"; // unique_violation
    return NextResponse.json(
      { ok: false, error: dup ? "this LINE account is already linked to another case" : error.message },
      { status: dup ? 409 : 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
