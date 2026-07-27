import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { addContactLog } from "@/lib/contact-log-actions";

/** Log one outreach attempt on a case (append-only). Thin wrapper over
 * lib/contact-log-actions.ts, shared with the MCP add_contact_log tool. */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const result = await addContactLog({
    assessmentId: body.assessmentId,
    outcome: body.outcome,
    note: body.note,
    staff: body.staff,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.code });
  }
  return NextResponse.json({ ok: true });
}
