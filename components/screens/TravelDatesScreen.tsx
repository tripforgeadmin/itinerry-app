"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DateCalendar } from "@/components/ui/DateCalendar";
import { RevealBlock } from "@/components/ui/RevealBlock";
import { QuestionShell } from "@/components/screens/QuestionShell";
import { QUESTIONS_MAP } from "@/lib/questions";
import type { ScreenProps } from "@/components/screens/types";

const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const TH_DOW = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Arrival question id → the return-date question it captures on this combined screen.
const RETURN_Q: Record<string, string> = { q10: "q11", q13: "q39", q17: "q18" };

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

function splitParen(text: string): { main: string; paren: string } {
  const m = text.match(/^(.*?)\s*(\([^)]*\))\s*$/);
  return m ? { main: m[1], paren: m[2] } : { main: text, paren: "" };
}

/**
 * Combined travel-dates step (rendered at the arrival question q10/q13/q17/q21): arrival + return
 * dropdown-calendar cards and the stay duration on ONE screen, then `advanceTo` the question after
 * the captured return question. Student (q21) and "other" visa show the single departure date only.
 */
export function TravelDatesScreen({
  question,
  value,
  answers,
  onAnswer,
  advanceTo,
  onBack,
  isFirst,
  lang,
  onLangChange,
  boxes,
  activeIndex,
}: ScreenProps) {
  const returnQid = RETURN_Q[question.id];
  // Student (q21) has no return question; "other" visa keeps its arrival-only rule.
  const single = !returnQid || answers.q9 === "other";
  const arrival = value ?? "";
  const ret = (returnQid ? answers[returnQid] : "") ?? "";
  const [open, setOpen] = useState<"arrival" | "return" | null>(arrival ? null : "arrival");

  const isStudy = question.id === "q21";
  const arrivalLabel = isStudy ? (lang === "th" ? "วันเริ่มเรียน" : "Study start") : lang === "th" ? "วันเดินทางไป" : "Departure";
  const returnLabel = lang === "th" ? "วันเดินทางกลับ" : "Return";

  function pickArrival(iso: string) {
    onAnswer(question.id, iso);
    // a return date sitting before the new arrival is no longer valid — clear it
    if (returnQid && ret && ret < iso) onAnswer(returnQid, "");
  }

  function closeArrival() {
    // guide straight into the return picker when it's still empty
    setOpen(!single && !ret ? "return" : null);
  }

  const stay = !single && arrival && ret ? daysBetween(arrival, ret) : null;
  const gateOk = !!arrival && (single || !!ret);
  // advance past the captured return question (q11→q12, q39→q14, q18→q19); student q21→q22
  const nextId = returnQid ? QUESTIONS_MAP[returnQid].defaultNextId : question.defaultNextId;

  const qtext = lang === "th" ? question.question : question.questionEn ?? question.question;
  const { main, paren } = splitParen(qtext);

  const missingArrivalMsg = lang === "th" ? "รบกวนระบุวันเดินทาง" : "Please pick your departure date";

  function DateCard({
    label,
    iso,
    placeholder,
    placeholderTone,
    expanded,
    onTap,
  }: {
    label: string;
    iso: string;
    placeholder: string;
    placeholderTone: "muted" | "alert";
    expanded: boolean;
    onTap: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onTap}
        className={
          "flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 text-left transition-colors " +
          (expanded ? "border-accent" : iso ? "border-border" : placeholderTone === "alert" ? "border-red-alert/40" : "border-border")
        }
      >
        <span aria-hidden>📅</span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-muted">{label}</span>
          <span
            className={
              "block truncate text-sm font-bold " +
              (iso ? "text-primary" : placeholderTone === "alert" ? "text-red-alert" : "text-muted-soft")
            }
          >
            {iso ? fmt(iso, lang) : placeholder}
          </span>
        </span>
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 text-muted-soft transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    );
  }

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
        single ? (
          <>
            {main}
            {paren && <span className="font-normal text-muted"> {paren}</span>}
          </>
        ) : lang === "th" ? (
          "วันเดินทางไป-กลับ"
        ) : (
          "Travel dates"
        )
      }
      subtitle={single ? undefined : lang === "th" ? "เลือกวันไปและวันกลับ ระบบจะคำนวณระยะเวลาพำนักให้" : "Pick both dates — we'll compute your stay"}
      footer={
        <Button disabled={!gateOk} onClick={() => nextId && advanceTo(nextId)}>
          {lang === "th" ? "ถัดไป" : "Next"}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {/* arrival */}
        <div>
          <DateCard
            label={arrivalLabel}
            iso={arrival}
            placeholder={missingArrivalMsg}
            placeholderTone="alert"
            expanded={open === "arrival"}
            onTap={() => setOpen(open === "arrival" ? null : "arrival")}
          />
          <RevealBlock open={open === "arrival"}>
            <div className="pt-3">
              <DateCalendar value={arrival || undefined} onChange={pickArrival} hideMascot />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={!arrival}
                  onClick={closeArrival}
                  className="rounded-full bg-accent px-6 py-2 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-40"
                >
                  {lang === "th" ? "เสร็จ" : "Done"}
                </button>
              </div>
            </div>
          </RevealBlock>
        </div>

        {/* return (hidden for student / "other" visa) */}
        {!single && (
          <div>
            <DateCard
              label={returnLabel}
              iso={ret}
              placeholder={
                arrival
                  ? lang === "th"
                    ? "แตะเพื่อเลือกวันกลับ"
                    : "Tap to pick your return date"
                  : missingArrivalMsg
              }
              placeholderTone={arrival ? "muted" : "alert"}
              // without an arrival, steer the tap into the arrival picker instead
              expanded={open === "return"}
              onTap={() => setOpen(arrival ? (open === "return" ? null : "return") : "arrival")}
            />
            <RevealBlock open={open === "return"}>
              <div className="pt-3">
                <DateCalendar
                  value={ret || undefined}
                  onChange={(iso) => onAnswer(returnQid!, iso)}
                  minDate={arrival || undefined}
                  hideMascot
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    disabled={!ret}
                    onClick={() => setOpen(null)}
                    className="rounded-full bg-accent px-6 py-2 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-40"
                  >
                    {lang === "th" ? "เสร็จ" : "Done"}
                  </button>
                </div>
              </div>
            </RevealBlock>
          </div>
        )}

        {/* optional: dates aren't locked in yet */}
        {!single && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl px-1 py-1 text-sm text-muted">
            <input
              type="checkbox"
              checked={answers.flex_dates === "yes"}
              onChange={(e) => onAnswer("flex_dates", e.target.checked ? "yes" : "")}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-mid accent-accent"
            />
            <span>
              {lang === "th" ? "วันที่ยังไม่ล็อกตายตัว สามารถยืดหยุ่นเวลาในการเดินทางได้" : "My travel dates aren't fixed — I can be flexible"}
            </span>
          </label>
        )}

        {/* stay duration */}
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

      {open === null && (
        <div className="mt-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot/itin_main.png" alt="" className="h-28 w-28 object-contain" />
        </div>
      )}
    </QuestionShell>
  );
}
