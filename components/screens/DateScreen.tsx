"use client";

import { Button } from "@/components/ui/Button";
import { DateCalendar } from "@/components/ui/DateCalendar";
import { QuestionShell } from "@/components/screens/QuestionShell";
import type { ScreenProps } from "@/components/screens/types";

/** Generic renderer for any `type: "date"` question (travel/study dates across visa branches). */
export function DateScreen({
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
        <Button disabled={!value} onClick={onNext}>
          {lang === "th" ? "ถัดไป" : "Next"}
        </Button>
      }
    >
      <DateCalendar value={value || undefined} onChange={(iso) => onAnswer(question.id, iso)} />
    </QuestionShell>
  );
}
