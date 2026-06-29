"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { RevealBlock } from "@/components/ui/RevealBlock";
import { QuestionShell } from "@/components/screens/QuestionShell";
import type { ScreenProps } from "@/components/screens/types";

const LOGO: Record<string, string> = {
  facebook: "/social/facebook.png",
  instagram: "/social/instagram.png",
  tiktok: "/social/tiktok.png",
  google: "/social/google.png",
  referral: "/social/referral.png",
  other: "/social/other.png",
};

/** Found (q7) — 2-col logo tiles, single-select (kept single per decision), optional Next,
 * "อื่นๆ" reveals a free-text field. */
export function FoundScreen({
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
  const isOther = value === "other";
  const gateOk = !isOther || otherValue.trim().length > 0; // optional, but "other" needs text

  return (
    <QuestionShell
      boxes={boxes}
      activeIndex={activeIndex}
      isFirst={isFirst}
      onBack={onBack}
      lang={lang}
      onLangChange={onLangChange}
      screenKey={question.id}
      title={lang === "th" ? "รู้จัก itinerry จากช่องไหน?" : "How did you find itinerry?"}
      subtitle={lang === "th" ? "ช่วยเราพัฒนาบริการ (ไม่บังคับ)" : "Helps us improve (optional)"}
      footer={
        <Button disabled={!gateOk} onClick={onNext}>
          {lang === "th" ? "ถัดไป →" : "Next →"}
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {question.options?.map((o) => (
          <GlassCard key={o.value} selected={value === o.value} onSelect={() => onAnswer(question.id, o.value)}>
            <div className="flex flex-col items-center gap-2 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO[o.value]} alt="" className="h-11 w-11 object-contain" />
              <p className="text-sm font-bold text-primary">{lang === "th" ? o.label : o.labelEn ?? o.label}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {question.allowOtherText && (
        <RevealBlock open={isOther}>
          <div className="pt-3">
            <TextField
              value={otherValue}
              onChange={(e) => onOther(e.target.value)}
              placeholder={lang === "th" ? question.otherPlaceholder : question.otherPlaceholderEn}
            />
          </div>
        </RevealBlock>
      )}
    </QuestionShell>
  );
}
