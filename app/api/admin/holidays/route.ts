import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });

  const [{ data: hol }, { data: cfg }] = await Promise.all([
    supabase.from("holiday").select("holiday_date, name").order("holiday_date"),
    supabase.from("app_config").select("value").eq("key", "callback_weekly_off").maybeSingle(),
  ]);
  let weeklyOff: number[] = [0];
  try {
    const parsed = cfg?.value ? JSON.parse(cfg.value as string) : null;
    if (Array.isArray(parsed)) weeklyOff = parsed.map(Number).filter((n) => n >= 0 && n <= 6);
  } catch {
    /* default */
  }
  return NextResponse.json({ ok: true, holidays: hol ?? [], weeklyOff });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  if (body.action === "add") {
    if (!ISO_RE.test(body.date ?? "")) return NextResponse.json({ ok: false, error: "invalid date" }, { status: 400 });
    const { error } = await supabase
      .from("holiday")
      .upsert({ holiday_date: body.date, name: (body.name ?? "").toString().slice(0, 120) }, { onConflict: "holiday_date" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    if (!ISO_RE.test(body.date ?? "")) return NextResponse.json({ ok: false, error: "invalid date" }, { status: 400 });
    const { error } = await supabase.from("holiday").delete().eq("holiday_date", body.date);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "weeklyOff") {
    const arr = Array.isArray(body.weeklyOff) ? body.weeklyOff.map(Number).filter((n: number) => n >= 0 && n <= 6) : [];
    const { error } = await supabase
      .from("app_config")
      .upsert({ key: "callback_weekly_off", value: JSON.stringify([...new Set(arr)]) }, { onConflict: "key" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
}
