"use client";

import { useRef } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { QuestionShell } from "@/components/screens/QuestionShell";
import type { ScreenProps } from "@/components/screens/types";

/** Generic renderer for short radio questions shown as an equal-cell segmented control + centered
 * mascot (employment-document screens q25–q28). Auto-advance. 5+ options should use ChoiceScreen. */
export function SegmentedScreen({
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
  const advancing = useRef(false);

  // Document/screening questions: no emoji in the choices (review feedback).
  const segments = (question.options ?? []).map((o) => ({
    value: o.value,
    label: lang === "th" ? o.label : o.labelEn ?? o.label,
  }));

  function choose(v: string) {
    onAnswer(question.id, v);
    if (!advancing.current) {
      advancing.current = true;
      setTimeout(() => {
        advancing.current = false;
        onNext();
      }, 340);
    }
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
      footerHint="แตะเพื่อเลือกและไปต่อ"
    >
      <SegmentedControl segments={segments} value={value || null} onChange={choose} />
      <div className="mt-8 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot/itin_main.png" alt="" className="h-32 w-32 object-contain" />
      </div>
    </QuestionShell>
  );
}
