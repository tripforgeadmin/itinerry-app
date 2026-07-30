import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import { SLA_STAGE_HOURS_KEY, SLA_STAGES, parseStageHours } from "@/lib/sla";

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const { data } = await supabase.from("app_config").select("value").eq("key", SLA_STAGE_HOURS_KEY).maybeSingle();
  return NextResponse.json({ ok: true, stageHours: parseStageHours(data?.value as string | undefined) });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const input = (body.stageHours ?? {}) as Record<string, unknown>;

  // Require a valid non-negative integer for every known stage (0 = that stage's aging off).
  const out: Record<string, number> = {};
  for (const s of SLA_STAGES) {
    const n = Number(input[s]);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ ok: false, error: `invalid hours for ${s}` }, { status: 400 });
    }
    out[s] = Math.floor(n);
  }

  const { error } = await supabase
    .from("app_config")
    .upsert({ key: SLA_STAGE_HOURS_KEY, value: JSON.stringify(out) }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
