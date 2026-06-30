"use client";

import { useRef } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { RevealBlock } from "@/components/ui/RevealBlock";
import { QuestionShell } from "@/components/screens/QuestionShell";
import type { ScreenProps } from "@/components/screens/types";

// visa value → mascot. "other" (โปรดระบุ) branches through the Tourist questions (nextId q10).
const IMG: Record<string, string> = {
  tourist: "/mascot/itin-travel-visa-cut.png",
  visitor: "/mascot/itin-visit-visa-cut.png",
  business: "/mascot/itin-business-visa-cut.png",
  student: "/mascot/itin-student-visa-cut.png",
  other: "/mascot/itin-other-visa-cut.png",
};

/** Screen 4 · visatype (q9) — full-bleed mascot cards (left-aligned, like OccupationScreen). The 4
 * preset types auto-advance; "อื่นๆ (โปรดระบุ)" reveals a write-in field + a gated Next button. */
export function VisatypeScreen({
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
    if (v === "other") return; // wait for the write-in + Next tap
    if (!advancing.current) {
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
      title={lang === "th" ? "ขอวีซ่าประเภทไหน?" : "Which visa type?"}
      subtitle={lang === "th" ? "เลือกประเภทวีซ่าที่ต้องการยื่น" : "Pick the visa you plan to apply for"}
      footer={
        isOther ? (
          <Button disabled={!otherValue.trim()} onClick={onNext}>
            {lang === "th" ? "ถัดไป" : "Next"}
          </Button>
        ) : undefined
      }
      footerHint={isOther ? undefined : "แตะเพื่อเลือกและไปต่อ"}
    >
      <div className="flex flex-col gap-3">
        {question.options?.map((o) => (
          <GlassCard key={o.value} selected={value === o.value} onSelect={() => select(o.value)} className="overflow-hidden">
            <div className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMG[o.value]} alt="" className="h-[116px] w-[116px] shrink-0 object-cover" />
              <div className="min-w-0 flex-1 px-4">
                <p className="text-lg font-bold text-primary">{lang === "th" ? o.label : o.labelEn ?? o.label}</p>
                {lang === "th" && o.labelEn && <p className="text-sm text-muted">{o.labelEn}</p>}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* "อื่นๆ" write-in + expert-followup note */}
      <RevealBlock open={isOther}>
        <div className="pt-3">
          <TextField
            value={otherValue}
            onChange={(e) => onOther(e.target.value)}
            placeholder={lang === "th" ? question.otherPlaceholder : question.otherPlaceholderEn}
          />
          <p className="mt-2 flex items-start gap-1.5 px-1 text-xs leading-relaxed text-muted-soft">
            <span aria-hidden>ℹ️</span>
            <span>
              {lang === "th"
                ? "ผู้เชี่ยวชาญของเราจะติดต่อกลับเพื่อสอบถามรายละเอียดเพิ่มเติม"
                : "Our expert will follow up to ask for more details"}
            </span>
          </p>
        </div>
      </RevealBlock>
    </QuestionShell>
  );
}
