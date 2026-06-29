"use client";

import { ConsentCheck } from "@/components/ui/ConsentCheck";
import { Button } from "@/components/ui/Button";
import { QuestionShell } from "@/components/screens/QuestionShell";
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
  ["ช่องทางติดต่อ", "q36"], ["เวลาติดต่อ", "q37"], ["รู้จักจาก", "q7"],
];

function display(qid: string, answers: Record<string, string>, lang: "th" | "en"): string | null {
  const q = QUESTIONS_MAP[qid];
  const v = answers[qid];
  if (!q || !v) return null;
  const label = (val: string) => {
    const o = q.options?.find((opt) => opt.value === val);
    return o ? (lang === "th" ? o.label : o.labelEn ?? o.label) : val;
  };
  if (q.type === "multiCheckbox") return v.split(", ").filter(Boolean).map(label).join(", ");
  if (q.options) return label(v);
  return v;
}

/** Summary (q2) — review card derived from store answers + certify checkbox; submit on certify. */
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
  const certified = value === "true";
  // Group the curated rows by their category so the review reads as labeled sub-tables.
  const answered = ROWS.map(([label, qid]) => ({ label, qid, value: display(qid, answers, lang) })).filter((r) => r.value);
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
                {items.map((r) => (
                  <div key={r.qid} className="flex items-start justify-between gap-4 px-4 py-2.5">
                    <span className="shrink-0 text-sm text-muted">{r.label}</span>
                    <span className="text-right text-sm font-semibold text-primary">{r.value}</span>
                  </div>
                ))}
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
