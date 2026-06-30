"use client";

import { useRef } from "react";
import { ChoiceRow } from "@/components/ui/ChoiceRow";
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

/** Screen 4 · visatype (q9) — auto-advance choice rows; branching via each option's nextId. */
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
          <ChoiceRow
            key={o.value}
            selected={value === o.value}
            onSelect={() => select(o.value)}
            icon={
              // eslint-disable-next-line @next/next/no-img-element
              <img src={IMG[o.value]} alt="" className="h-full w-full object-contain" />
            }
            title={lang === "th" ? o.label : o.labelEn ?? o.label}
            sub={lang === "th" ? o.labelEn ?? undefined : undefined}
          />
        ))}
      </div>

      {/* Note for the "other visa type" card — an expert follows up for details. */}
      <p className="mt-3 flex items-start gap-1.5 px-1 text-xs leading-relaxed text-muted-soft">
        <span aria-hidden>ℹ️</span>
        <span>
          {lang === "th"
            ? "เลือก “วีซ่าประเภทอื่นๆ” ได้เลย — ผู้เชี่ยวชาญของเราจะติดต่อกลับเพื่อสอบถามรายละเอียดเพิ่มเติม"
            : "Pick “Other visa type” — our expert will follow up to ask for more details"}
        </span>
      </p>
    </QuestionShell>
  );
}
