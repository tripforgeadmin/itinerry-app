import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import { clean } from "@/lib/normalize";
import { isQuoteEditable } from "@/lib/quote-status";
import {
  addQuoteLine,
  createQuote,
  deleteQuoteLine,
  getQuoteById,
  setQuoteStatus,
  updateQuoteHeader,
  updateQuoteLine,
  type ActionResult,
} from "@/lib/quote-actions";

/**
 * Quote mutations over HTTP — thin dispatcher; the business logic lives in
 * lib/quote-actions.ts (shared with the MCP quote tools). Hard `delete` stays
 * HTTP-only by design: the MCP layer cancels via set_quote_status instead.
 */

function respond<T>(result: ActionResult<T>) {
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.code });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  if (body.action === "create") return respond(await createQuote(body));

  // Everything below operates on an existing quote.
  const quoteId = clean(body.quoteId, 40);
  if (!quoteId) return NextResponse.json({ ok: false, error: "quoteId required" }, { status: 400 });
  const quote = await getQuoteById(quoteId);
  if (!quote) return NextResponse.json({ ok: false, error: "quote not found" }, { status: 404 });

  switch (body.action) {
    case "update_header":
      return respond(await updateQuoteHeader(quote, body));
    case "add_line":
      return respond(await addQuoteLine(quote, body));
    case "update_line":
      return respond(await updateQuoteLine(quote, body));
    case "delete_line":
      return respond(await deleteQuoteLine(quote, body));
    case "set_status":
      return respond(await setQuoteStatus(quote, body));
    case "delete": {
      if (!isQuoteEditable(quote.status)) {
        return NextResponse.json({ ok: false, error: "ลบได้เฉพาะฉบับร่าง" }, { status: 400 });
      }
      const { error } = await supabase.from("quote").delete().eq("id", quoteId); // lines cascade
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  }
}
