"use client";

import { useRef } from "react";
import { ChoiceRow } from "@/components/ui/ChoiceRow";
import { TextField } from "@/components/ui/TextField";
import { RevealBlock } from "@/components/ui/RevealBlock";
import { Button } from "@/components/ui/Button";
import { QuestionShell } from "@/components/screens/QuestionShell";
import type { ScreenProps } from "@/components/screens/types";

/** Generic renderer for any single-select `type: "radio"` question (auto-advance; "อื่นๆ" reveal
 * when allowOtherText). Bespoke screens (nationality, visatype) override this in the registry. */
export function ChoiceScreen({
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
  const advancing = useRef(false);
  const isOther = !!question.allowOtherText && value === "other";

  function select(v: string) {
    onAnswer(question.id, v);
    const gated = !!question.allowOtherText && v === "other";
    if (!gated && !advancing.current) {
      advancing.current = true;
      setTimeout(() => {
        advancing.current = false;
        onNext();
      }, 320);
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
      footerHint={isOther ? undefined : "แตะเพื่อเลือกและไปต่อ"}
      footer={
        isOther ? (
          <Button disabled={!otherValue.trim()} onClick={onNext}>
            {lang === "th" ? "ถัดไป" : "Next"}
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-3">
        {question.options?.map((o) => (
          <ChoiceRow
            key={o.value}
            selected={value === o.value}
            onSelect={() => select(o.value)}
            icon={o.emoji ? <span className="text-2xl">{o.emoji}</span> : undefined}
            title={lang === "th" ? o.label : o.labelEn ?? o.label}
          />
        ))}
        {question.allowOtherText && (
          <RevealBlock open={isOther}>
            <div className="pt-1">
              <TextField
                value={otherValue}
                onChange={(e) => onOther(e.target.value)}
                placeholder={lang === "th" ? question.otherPlaceholder : question.otherPlaceholderEn}
              />
            </div>
          </RevealBlock>
        )}
      </div>
    </QuestionShell>
  );
}
