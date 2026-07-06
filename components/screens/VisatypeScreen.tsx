"use client";

import { useRef } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { QuestionShell } from "@/components/screens/QuestionShell";
import type { ScreenProps } from "@/components/screens/types";

// visa value → mascot.
const IMG: Record<string, string> = {
  tourist: "/mascot/itin-travel-visa-cut.png",
  visitor: "/mascot/itin-visit-visa-cut.png",
  business: "/mascot/itin-business-visa-cut.png",
  student: "/mascot/itin-student-visa-cut.png",
};

/** Screen 4 · visatype (q9) — full-bleed mascot cards (left-aligned, like OccupationScreen).
 * All types auto-advance on tap. */
export function VisatypeScreen({
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
      title={lang === "th" ? "ขอวีซ่าประเภทไหน?" : "Which visa type?"}
      subtitle={lang === "th" ? "เลือกประเภทวีซ่าที่ต้องการยื่น" : "Pick the visa you plan to apply for"}
      footerHint="แตะเพื่อเลือกและไปต่อ"
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
    </QuestionShell>
  );
}
