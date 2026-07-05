import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/app/api/admin/login/route";
import { renderWorksheetPdf, worksheetFromDbRow } from "@/lib/worksheet-pdf";

export const dynamic = "force-dynamic";

/** Internal case-worksheet PDF (ใบงานประเมินวีซ่า) — admin-only, PII-free by design. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get("admin_session")?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  // account deliberately NOT selected — the worksheet carries no PII, the ticket is the key.
  const { data: row, error } = await supabase
    .from("user_assessment")
    .select("*, trip:trip_id(*), visa_evaluation(*)")
    .eq("id", id)
    .single();

  if (error || !row) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  try {
    const data = worksheetFromDbRow(row as Record<string, unknown>);
    const pdf = await renderWorksheetPdf(data);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${data.ticketId}-worksheet.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("worksheet pdf error:", err);
    return NextResponse.json({ ok: false, error: "pdf render failed" }, { status: 500 });
  }
}
