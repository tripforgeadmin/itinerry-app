import { NextRequest, NextResponse } from "next/server";
import { availabilityByDay, freeSlotsForDate, DISPLAY_MINUTES } from "@/lib/booking";

export const dynamic = "force-dynamic";

/**
 * Public consultation-slot availability, built for the Q form's former booking step.
 *  - GET /api/booking/slots            → per-day free counts across the horizon
 *  - GET /api/booking/slots?date=ISO   → free 30-min slot starts for that date
 * Read-only. DORMANT since 2026-09-27: the contact step no longer books a slot (every
 * customer is contacted back within 2 days) and /api/submit no longer claims one, so
 * nothing calls this route; kept, with lib/booking.ts, in case booking returns.
 */
export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get("date");
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ ok: false, error: "bad date" }, { status: 400 });
      }
      const slots = await freeSlotsForDate(date);
      return NextResponse.json({ ok: true, displayMinutes: DISPLAY_MINUTES, slots });
    }
    const days = await availabilityByDay();
    return NextResponse.json({ ok: true, displayMinutes: DISPLAY_MINUTES, days });
  } catch (err) {
    console.error("booking slots error:", err);
    return NextResponse.json({ ok: false, error: "internal error" }, { status: 500 });
  }
}
