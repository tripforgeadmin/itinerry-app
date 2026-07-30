import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { applyStatusChange } from "@/lib/case-status";

/**
 * Change a case's pipeline status. Thin HTTP wrapper — the transition rules
 * (close stamping, lost-reason validation, reopen clearing, history journaling)
 * live in lib/case-status.ts, shared with the MCP set_case_status tool.
 */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json();
  const result = await applyStatusChange({
    id: body.id,
    status: body.status,
    closeDate: body.closeDate,
    lostReasonL1: body.lostReasonL1,
    lostReasonL2: body.lostReasonL2,
    closeNotes: body.closeNotes,
    wonServiceType: body.wonServiceType,
    lostDestinationCountry: body.lostDestinationCountry,
    lostVisaType: body.lostVisaType,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.code });
  }
  return NextResponse.json({ ok: true });
}
