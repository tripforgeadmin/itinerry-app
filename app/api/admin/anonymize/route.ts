import { NextRequest, NextResponse } from "next/server";
import { anonymizeAccount } from "@/lib/anonymize";

export async function POST(request: NextRequest) {
  const { accountId } = await request.json();
  if (!accountId) return NextResponse.json({ ok: false, error: "missing accountId" }, { status: 400 });

  const ok = await anonymizeAccount(accountId);
  if (!ok) return NextResponse.json({ ok: false }, { status: 500 });

  return NextResponse.json({ ok: true });
}
