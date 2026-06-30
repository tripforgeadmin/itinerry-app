"use client";

import { useState } from "react";
import { ConsentCheck } from "@/components/ui/ConsentCheck";
import { Button } from "@/components/ui/Button";
import { RevealBlock } from "@/components/ui/RevealBlock";
import { QuestionShell } from "@/components/screens/QuestionShell";
import { RowEditor } from "@/components/screens/RowEditor";
import { QUESTIONS_MAP } from "@/lib/questions";
import { CATEGORIES, categoryIndexOf } from "@/lib/categories";
import type { ScreenProps } from "@/components/screens/types";

// Curated review order (label, question id). Only answered rows are shown.
const ROWS: [string, string][] = [
  ["ชื่อ-นามสกุล", "q3"], ["เบอร์โทร", "q5"], ["อีเมล", "q6"],
  ["สัญชาติ", "q4"], ["ประเทศปลายทาง", "q8"], ["ประเภทวีซ่า", "q9"],
  ["วันเดินทาง", "q10"], ["วันกลับ", "q11"], ["วันเดินทาง", "q13"], ["วันเดินทาง", "q17"], ["วันกลับ", "q18"], ["วันเริ่มเรียน", "q21"],
  ["ประวัติวีซ่า", "q12"], ["ประวัติวีซ่า", "q20"],
  ["อาชีพ", "q24"], ["หนังสือรับรองงาน", "q25"], ["เอกสารรายได้", "q26"], ["เอกสารภาษี", "q27"], ["จดทะเบียนธุรกิจ", "q28"], ["ผู้รับผิดชอบค่าใช้จ่าย", "q29"],
  ["เคยถูกปฏิเสธวีซ่า", "q30"], ["รายละเอียดการปฏิเสธ", "q31"], ["Overstay", "q32"], ["รายละเอียด Overstay", "q33"],
  ["เงินออม", "q34"], ["ความผูกพันกับไทย", "q35"],
  ["ช่องทางติดต่อ", "q36"], ["เวลาติดต่อ", "q37"], ["ความต้องการ", "q38"], ["รู้จักจาก", "q7"],
];

function display(qid: string, answers: Record<string, string>, lang: "th" | "en"): string | null {
  const q = QUESTIONS_MAP[qid];
  const v = answers[qid];
  if (!q || !v) return null;
  const label = (val: string) => {
    const o = q.options?.find((opt) => opt.value === val);
    return o ? (lang === "th" ? o.label : o.labelEn ?? o.label) : val;
  };
  // radio "other" with a free-text write-in
  if (q.allowOtherText && v === "other") return answers[`${qid}_other`] || label("other");
  if (q.type === "multiCheckbox") return v.split(", ").filter(Boolean).map(label).join(", ");
  // q8 destination "other" (ISO code not among the card options) → stored display name
  if (qid === "q8" && q.options && !q.options.some((o) => o.value === v)) return answers["q8_other"] || v;
  if (q.options) return label(v);
  return v;
}

/** Summary (q2) — review grouped by category; an Edit toggle expands each row into an inline editor
 * (RowEditor) that writes back via onAnswer. Certify + submit. */
export function SummaryScreen({
  question,
  value,
  answers,
  onAnswer,
  onNext,
  onBack,
  isFirst,
  lang,
  onLangChange,
  boxes,
  activeIndex,
  submitting,
}: ScreenProps) {
  const [editing, setEditing] = useState(false);
  const [openQid, setOpenQid] = useState<string | null>(null);
  const certified = value === "true";

  // Keep an open row visible even if its value is momentarily cleared while editing.
  const answered = ROWS.map(([label, qid]) => ({ label, qid, value: display(qid, answers, lang) })).filter(
    (r) => r.value || (editing && r.qid === openQid)
  );
  const groups = CATEGORIES.map((cat, i) => ({
    cat,
    items: answered.filter((r) => categoryIndexOf(r.qid) === i),
  })).filter((g) => g.items.length > 0);

  return (
    <QuestionShell
      boxes={boxes}
      activeIndex={activeIndex}
      isFirst={isFirst}
      onBack={onBack}
      lang={lang}
      onLangChange={onLangChange}
      screenKey={question.id}
      title={lang === "th" ? "สรุปข้อมูลของคุณ" : "Review your info"}
      subtitle={lang === "th" ? "ตรวจความถูกต้องก่อนส่งให้ทีมวีซ่า" : "Check before sending to our visa team"}
      footer={
        <Button disabled={!certified || submitting} onClick={onNext}>
          {submitting ? (lang === "th" ? "กำลังส่ง…" : "Submitting…") : lang === "th" ? "ส่งแบบประเมิน →" : "Submit →"}
        </Button>
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-muted-soft">{lang === "th" ? "แตะ “แก้ไข” เพื่อปรับคำตอบ" : "Tap Edit to change answers"}</span>
        <button
          type="button"
          onClick={() => {
            setEditing((e) => !e);
            setOpenQid(null);
          }}
          className="rounded-full border border-accent px-3.5 py-1.5 text-xs font-bold text-accent transition-colors hover:bg-accent-bg"
        >
          {editing ? (lang === "th" ? "เสร็จสิ้น" : "Done") : lang === "th" ? "✎ แก้ไข" : "✎ Edit"}
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-card border border-border bg-card p-4 text-sm text-muted-soft">
          {lang === "th" ? "ยังไม่ได้เลือกข้อมูล" : "No info yet"}
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map(({ cat, items }) => (
            <div key={cat.label}>
              <h3 className="mb-2 text-sm font-semibold text-primary">{lang === "th" ? cat.label : cat.labelEn}</h3>
              <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
                {items.map((r) => {
                  const open = editing && openQid === r.qid;
                  return (
                    <div key={r.qid}>
                      {editing ? (
                        <button
                          type="button"
                          onClick={() => setOpenQid(open ? null : r.qid)}
                          className="flex w-full items-start justify-between gap-4 px-4 py-2.5 text-left transition-colors hover:bg-accent-bg"
                        >
                          <span className="shrink-0 text-sm text-muted">{r.label}</span>
                          <span className="flex items-center gap-1 text-right text-sm font-semibold text-accent">
                            {r.value || (lang === "th" ? "เลือก…" : "Pick…")}
                            <svg
                              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                              className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-start justify-between gap-4 px-4 py-2.5">
                          <span className="shrink-0 text-sm text-muted">{r.label}</span>
                          <span className="text-right text-sm font-semibold text-primary">{r.value}</span>
                        </div>
                      )}
                      {editing && (
                        <RevealBlock open={open}>
                          <div className="border-t border-border bg-surface-soft/50 px-4 py-3">
                            <RowEditor qid={r.qid} answers={answers} onAnswer={onAnswer} lang={lang} />
                          </div>
                        </RevealBlock>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <ConsentCheck checked={certified} onToggle={() => onAnswer(question.id, certified ? "" : "true")}>
          {question.question}
        </ConsentCheck>
      </div>
    </QuestionShell>
  );
}
