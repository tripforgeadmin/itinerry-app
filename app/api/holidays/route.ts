import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { DEFAULT_HOLIDAYS } from "@/lib/holidays";

export const dynamic = "force-dynamic";

/**
 * Public read of the callback calendar config — blocked holiday dates + recurring weekly days off
 * (0=Sun..6=Sat) — so the client can build the callback date picker. Falls back to the hardcoded
 * 2569 defaults on any error so scheduling never breaks.
 */
export async function GET() {
  try {
    const [{ data: hol }, { data: cfg }] = await Promise.all([
      supabase.from("holiday").select("holiday_date"),
      supabase.from("app_config").select("value").eq("key", "callback_weekly_off").maybeSingle(),
    ]);

    const holidays = (hol ?? []).map((r) => r.holiday_date as string);
    let weeklyOff: number[] = [0];
    try {
      const parsed = cfg?.value ? JSON.parse(cfg.value as string) : null;
      if (Array.isArray(parsed)) weeklyOff = parsed.map(Number).filter((n) => n >= 0 && n <= 6);
    } catch {
      /* keep default */
    }

    return NextResponse.json({
      holidays: holidays.length ? holidays : DEFAULT_HOLIDAYS,
      weeklyOff,
    });
  } catch (err) {
    console.error("holidays route error:", err);
    return NextResponse.json({ holidays: DEFAULT_HOLIDAYS, weeklyOff: [0] });
  }
}
