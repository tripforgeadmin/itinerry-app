"use client";

import { ChoiceRow } from "@/components/ui/ChoiceRow";
import { Button } from "@/components/ui/Button";
import { QuestionShell } from "@/components/screens/QuestionShell";
import type { ScreenProps } from "@/components/screens/types";

// Values that clear all others when picked (and are cleared when any other is picked).
const EXCLUSIVE = new Set(["never", "none"]);

function parse(v: string): string[] {
  return v ? v.split(", ").filter(Boolean) : [];
}

/** Generic renderer for any `type: "multiCheckbox"` question — multi-select rows with an
 * exclusive "none/never" option, gated Next. Value stored comma-space-joined (engine convention).
 * Bespoke screens (e.g. PriorVisasScreen) override this in the registry. */
export function MultiSelectScreen({
  question,
  value,
  onAnswer,
  onNext,
  onBack,
  isFirst,
  lang,
  onLangChange,
  boxes,
  activeIndex,
}: ScreenProps) {
  const selected = parse(value);

  function toggle(v: string) {
    let next: string[];
    if (EXCLUSIVE.has(v)) {
      next = selected.includes(v) ? [] : [v];
    } else {
      const base = selected.filter((x) => !EXCLUSIVE.has(x));
      next = base.includes(v) ? base.filter((x) => x !== v) : [...base, v];
    }
    onAnswer(question.id, next.join(", "));
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
      title={lang === "th" ? question.question : question.questionEn ?? question.question}
      footer={
        <Button disabled={selected.length === 0} onClick={onNext}>
          {lang === "th" ? "ถัดไป" : "Next"}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {question.options?.map((o) => (
          <ChoiceRow
            key={o.value}
            selected={selected.includes(o.value)}
            onSelect={() => toggle(o.value)}
            icon={o.emoji ? <span className="text-2xl">{o.emoji}</span> : undefined}
            title={lang === "th" ? o.label : o.labelEn ?? o.label}
          />
        ))}
      </div>
    </QuestionShell>
  );
}
