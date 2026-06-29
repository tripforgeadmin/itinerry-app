"use client";

import { useRef } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { QuestionShell } from "@/components/screens/QuestionShell";
import type { ScreenProps } from "@/components/screens/types";

/** Savings (q34) — plain glass rows (no icons; financial/screening range), encrypted-info privacy
 * note + mascot, auto-advance. */
export function SavingsScreen({
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

  function select(v: string) {
    onAnswer(question.id, v);
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
      title={lang === "th" ? "ยอดเงินออมปัจจุบันประมาณเท่าไหร่?" : "Approximate savings balance?"}
      subtitle={lang === "th" ? "ของตัวเองหรือผู้รับผิดชอบค่าใช้จ่าย" : "Yours or your sponsor's"}
      footerHint="แตะเพื่อเลือกและไปต่อ"
    >
      <div className="flex flex-col gap-3">
        {question.options?.map((o) => (
          <GlassCard key={o.value} selected={value === o.value} onSelect={() => select(o.value)}>
            <div className="p-4">
              <p className="font-bold text-primary">{lang === "th" ? o.label : o.labelEn ?? o.label}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-soft">
        <span aria-hidden>🛡</span>
        <span>{lang === "th" ? "ข้อมูลการเงินถูกเข้ารหัสและเก็บเป็นความลับ" : "Financial info is encrypted & confidential"}</span>
      </div>

      <div className="mt-5 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot/itin_main.png" alt="" className="h-28 w-28 object-contain" />
      </div>
    </QuestionShell>
  );
}
