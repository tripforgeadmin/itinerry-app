import { NextRequest, NextResponse } from "next/server";
import { anonymizeAccount } from "@/lib/anonymize";
import { verifyAdminSession } from "@/app/api/admin/login/route";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { accountId } = await request.json();
  if (!accountId) return NextResponse.json({ ok: false, error: "missing accountId" }, { status: 400 });

  const ok = await anonymizeAccount(accountId);
  if (!ok) return NextResponse.json({ ok: false }, { status: 500 });

  return NextResponse.json({ ok: true });
}
