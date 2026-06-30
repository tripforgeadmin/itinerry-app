"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { DateCalendar } from "@/components/ui/DateCalendar";
import { QuestionShell } from "@/components/screens/QuestionShell";
import type { ScreenProps } from "@/components/screens/types";

const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const TH_DOW = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmt(iso: string, lang: "th" | "en"): string {
  const d = new Date(`${iso}T00:00:00`);
  return lang === "th"
    ? `${TH_DOW[d.getDay()]} ${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear()}`
    : `${d.getDate()} ${EN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T00:00:00`).getTime();
  const b = new Date(`${bIso}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Split "วันที่วางแผนเดินทาง (วันแรกที่ถึงปลายทาง)" → main + parenthetical (rendered lighter). */
function splitParen(text: string): { main: string; paren: string } {
  const m = text.match(/^(.*?)\s*(\([^)]*\))\s*$/);
  return m ? { main: m[1], paren: m[2] } : { main: text, paren: "" };
}

/** Generic renderer for any `type: "date"` question. For a return date (question.returnFromId set)
 * it defaults to / can't precede the arrival date, and shows the stay duration. */
export function DateScreen({
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
}: ScreenProps) {
  const isReturn = !!question.returnFromId;
  const arrivalIso = isReturn ? answers[question.returnFromId as string] || "" : "";

  // Return date: default to the arrival date, and never let it sit before the arrival — re-clamps
  // automatically if the user goes back and pushes the arrival past the current return (#15).
  useEffect(() => {
    if (!isReturn || !arrivalIso) return;
    if (!value || value < arrivalIso) onAnswer(question.id, arrivalIso);
  }, [isReturn, arrivalIso, value, question.id, onAnswer]);

  const qtext = lang === "th" ? question.question : question.questionEn ?? question.question;
  const { main, paren } = splitParen(qtext);
  const stay = isReturn && arrivalIso && value ? daysBetween(arrivalIso, value) : null;

  return (
    <QuestionShell
      boxes={boxes}
      activeIndex={activeIndex}
      isFirst={isFirst}
      onBack={onBack}
      lang={lang}
      onLangChange={onLangChange}
      screenKey={question.id}
      title={
        <>
          {main}
          {paren && <span className="font-normal text-muted"> {paren}</span>}
        </>
      }
      footer={
        <Button disabled={!value} onClick={onNext}>
          {lang === "th" ? "ถัดไป" : "Next"}
        </Button>
      }
    >
      {/* Selected-date summary + stay duration, above the calendar */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
          <span aria-hidden>📅</span>
          <span className={`text-sm font-bold ${value ? "text-primary" : "text-muted-soft"}`}>
            {value ? fmt(value, lang) : lang === "th" ? "ยังไม่ได้เลือกวันที่" : "No date selected"}
          </span>
        </div>
        {stay !== null && (
          <div className="flex items-center gap-2 rounded-xl bg-accent-bg px-4 py-2.5 text-sm font-semibold text-accent-hover">
            <span aria-hidden>🗓️</span>
            <span>
              {stay <= 0
                ? lang === "th"
                  ? "ไป-กลับวันเดียว"
                  : "Same-day trip"
                : lang === "th"
                  ? `ระยะเวลาพำนักต่างประเทศ ${stay} วัน`
                  : `Stay abroad: ${stay} day${stay > 1 ? "s" : ""}`}
            </span>
          </div>
        )}
      </div>

      <DateCalendar
        value={value || undefined}
        onChange={(iso) => onAnswer(question.id, iso)}
        minDate={arrivalIso || undefined}
      />
    </QuestionShell>
  );
}
