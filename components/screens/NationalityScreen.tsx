"use client";

import { useRef } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { RevealBlock } from "@/components/ui/RevealBlock";
import { QuestionShell } from "@/components/screens/QuestionShell";
import type { ScreenProps } from "@/components/screens/types";

const CARDS = [
  { value: "thai", img: "/mascot/itin_thai-passport-cut.png", t: "ไทย", s: "Thai", caption: "🛂 พาสปอร์ตไทย" },
  { value: "other", img: "/mascot/itin-inter-passport-cut.png", t: "สัญชาติอื่น", s: "Other nationality", caption: "ระบุสัญชาติได้ในขั้นถัดไป" },
];

/** Screen 2 · nationality (q4) — 2 mascot cards; "อื่นๆ" reveals a specify field (allowOtherText). */
export function NationalityScreen({
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
  const isOther = value === "other";

  function select(v: string) {
    onAnswer(question.id, v);
    if (v !== "other" && !advancing.current) {
      advancing.current = true;
      setTimeout(() => {
        advancing.current = false;
        onNext();
      }, 360);
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
      title={lang === "th" ? "คุณถือสัญชาติอะไร?" : "What's your nationality?"}
      subtitle={lang === "th" ? "เลือกสัญชาติของคุณ" : "Select your nationality"}
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
        {CARDS.map((c) => (
          <GlassCard key={c.value} selected={value === c.value} onSelect={() => select(c.value)}>
            <div className="flex items-center gap-4 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.img} alt="" className="h-20 w-20 shrink-0 object-contain" />
              <div className="min-w-0">
                <p className="text-lg font-bold text-primary">{lang === "th" ? c.t : c.s}</p>
                <p className="text-xs text-muted">{c.caption}</p>
              </div>
            </div>
          </GlassCard>
        ))}
        <RevealBlock open={isOther}>
          <div className="pt-1">
            <TextField
              label={lang === "th" ? "ระบุสัญชาติ" : "Enter your nationality"}
              value={otherValue}
              onChange={(e) => onOther(e.target.value)}
              placeholder={lang === "th" ? question.otherPlaceholder : question.otherPlaceholderEn}
            />
          </div>
        </RevealBlock>
      </div>
    </QuestionShell>
  );
}
