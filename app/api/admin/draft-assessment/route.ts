import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/app/api/admin/login/route";
import { getAnthropic, AI_DRAFT_MODEL, AI_DRAFT_ENABLED } from "@/lib/anthropic";
import { buildDraftPrompt } from "@/lib/assessment-draft-prompt";
import type { EngineResult, EngineCase } from "@/lib/assessment/types";

// Layout caps mirror AssessmentResultForm / evaluate route: 5 items × 250 chars map 1:1 onto
// the customer healthcheck PDF. Structured-output JSON schema can't express maxLength/maxItems,
// so we clamp the model output here; the evaluate route re-validates on save.
const MAX_ITEMS = 5;
const MAX_ITEM_LEN = 250;

// json_schema for the draft. additionalProperties:false + all keys required, per the structured
// outputs contract. Length/count limits are enforced in code (clamp below), not in the schema.
const DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
    suggestedPass: { type: "boolean" },
    notes: { type: "string" },
  },
  required: ["strengths", "improvements", "suggestedPass", "notes"],
} as const;

const clampItems = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean).slice(0, MAX_ITEMS).map((s) => s.slice(0, MAX_ITEM_LEN))
    : [];

export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // No key configured: say so plainly instead of letting the SDK fail deep inside the try/catch
  // below, which would report "ลองใหม่" for a condition retrying can never resolve.
  if (!AI_DRAFT_ENABLED) {
    return NextResponse.json(
      { ok: false, error: "ฟีเจอร์ร่างด้วย AI ยังไม่เปิดใช้งาน (ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY)" },
      { status: 503 },
    );
  }

  const { assessmentId } = await request.json();
  if (!assessmentId || typeof assessmentId !== "string") {
    return NextResponse.json({ ok: false, error: "invalid input" }, { status: 400 });
  }

  // Read the auto-assessment result (PII-free: EngineResult + meta.input_snapshot). We never load
  // the account/trip PII — the draft is built entirely from the engine's normalized output.
  const { data: row, error } = await supabase
    .from("visa_evaluation")
    .select("result")
    .eq("assessment_id", assessmentId)
    .single();
  if (error || !row?.result) {
    return NextResponse.json(
      { ok: false, error: "ยังไม่มีผลประเมินอัตโนมัติสำหรับเคสนี้ (ต้องผ่านการ submit/ประเมินก่อน)" },
      { status: 404 },
    );
  }

  const stored = row.result as EngineResult & { meta?: { input_snapshot?: EngineCase } };
  const engineCase = stored.meta?.input_snapshot ?? {};
  const { system, user } = buildDraftPrompt(stored, engineCase);

  let draft: { strengths: unknown; improvements: unknown; suggestedPass: unknown; notes: unknown };
  try {
    const response = await getAnthropic().messages.create({
      model: AI_DRAFT_MODEL,
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: { type: "json_schema", schema: DRAFT_SCHEMA } },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (response.stop_reason === "refusal") {
      return NextResponse.json({ ok: false, error: "AI ปฏิเสธการร่างเคสนี้ กรุณาเขียนเอง" }, { status: 502 });
    }
    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    if (!textBlock) throw new Error("no text block in response");
    draft = JSON.parse(textBlock.text);
  } catch (err) {
    console.error("draft-assessment error:", err);
    return NextResponse.json({ ok: false, error: "ร่างด้วย AI ไม่สำเร็จ กรุณาลองใหม่หรือเขียนเอง" }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    draft: {
      strengths: clampItems(draft.strengths),
      improvements: clampItems(draft.improvements),
      suggestedPass: typeof draft.suggestedPass === "boolean" ? draft.suggestedPass : null,
      notes: typeof draft.notes === "string" ? draft.notes.trim() : "",
    },
  });
}
