"use client";

import { Button } from "@/components/ui/Button";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { RevealBlock } from "@/components/ui/RevealBlock";
import { QuestionShell } from "@/components/screens/QuestionShell";
import type { ScreenProps } from "@/components/screens/types";

const EXCLUSIVE = "never";
const OTHER = "other";

function parse(v: string): string[] {
  return v ? v.split(", ").filter(Boolean) : [];
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

/**
 * Prior-visa history (q12 / q20). Bespoke per design (wireframe 08): green "more history helps"
 * banner, wrapping flag chips with a check when selected, the itin_main mascot, gated Next.
 * Adds an "อื่นๆ" chip with a free-text field (stored under `${id}_other`).
 */
export function PriorVisasScreen({
  question,
  value,
  otherValue,
  onAnswer,
  onOther,
  onNext,
  onBack,
  isFirst,
  lang,
  onLangChange,
  boxes,
  activeIndex,
}: ScreenProps) {
  const selected = parse(value);
  const otherOn = selected.includes(OTHER);

  function toggle(v: string) {
    let next: string[];
    if (v === EXCLUSIVE) {
      next = selected.includes(v) ? [] : [v];
    } else {
      const base = selected.filter((x) => x !== EXCLUSIVE);
      next = base.includes(v) ? base.filter((x) => x !== v) : [...base, v];
    }
    onAnswer(question.id, next.join(", "));
  }

  const gateOk = selected.length > 0 && (!otherOn || otherValue.trim().length > 0);
  const chips = [...(question.options ?? []), { value: OTHER, label: "อื่นๆ", labelEn: "Other", emoji: "✨" }];

  return (
    <QuestionShell
      boxes={boxes}
      activeIndex={activeIndex}
      isFirst={isFirst}
      onBack={onBack}
      lang={lang}
      onLangChange={onLangChange}
      screenKey={question.id}
      title={lang === "th" ? question.question : question.questionEn ?? question.question}
      subtitle="UK · Schengen · USA · Canada · Australia · NZ"
      footer={
        <Button disabled={!gateOk} onClick={onNext}>
          {lang === "th" ? "ถัดไป" : "Next"}
        </Button>
      }
    >
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-success-bg px-4 py-2.5 text-sm font-semibold text-success-deep">
        <span aria-hidden>✓</span>
        <span>
          {lang === "th"
            ? "เลือกที่เคยได้ — ยิ่งมีประวัติยิ่งดีต่อเคส"
            : "Pick all you've had — more history helps your case"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {chips.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors active:scale-[0.97] " +
                (on ? "border-accent bg-accent-subtle text-accent-hover" : "border-border-mid bg-card text-primary hover:border-accent")
              }
            >
              {on && <Check />}
              {o.emoji && <span className="text-base leading-none">{o.emoji}</span>}
              {lang === "th" ? o.label : o.labelEn ?? o.label}
            </button>
          );
        })}
      </div>

      <RevealBlock open={otherOn}>
        <div className="pt-3">
          <CountrySelect value={otherValue} onChange={(v) => onOther(v)} lang={lang} />
        </div>
      </RevealBlock>

      <div className="mt-6 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot/itin_main.png" alt="" className="h-36 w-36 object-contain" />
      </div>
    </QuestionShell>
  );
}
