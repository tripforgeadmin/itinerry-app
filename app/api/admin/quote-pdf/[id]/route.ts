import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { fetchQuoteWithLines } from "@/lib/quotes";
import { renderQuotePdf } from "@/lib/quote-pdf";

export const dynamic = "force-dynamic";

/** Customer-facing quotation PDF (ใบเสนอราคา) — admin-gated, rendered from snapshots. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  const result = await fetchQuoteWithLines(id);
  if (!result) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  try {
    const pdf = await renderQuotePdf(result);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${result.quote.quote_number}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("quote pdf error:", err);
    return NextResponse.json({ ok: false, error: "pdf render failed" }, { status: 500 });
  }
}
