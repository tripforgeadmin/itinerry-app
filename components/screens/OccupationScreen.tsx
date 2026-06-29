"use client";

import { useRef } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { QuestionShell } from "@/components/screens/QuestionShell";
import type { ScreenProps } from "@/components/screens/types";

// occupation value → scene mascot (-sm), per design (wireframe 09). retired/homemaker reuse unemploy.
const MASCOT: Record<string, string> = {
  employee: "/mascot/itin-occupation-office-sm.png",
  government: "/mascot/itin-occupation-officer-sm.png",
  freelance: "/mascot/itin-occupation-freelance-sm.png",
  business_owner: "/mascot/itin-occupation-business-owner-sm.png",
  retired: "/mascot/itin-occupation-unemploy-sm.png",
  homemaker: "/mascot/itin-occupation-unemploy-sm.png",
  student_occ: "/mascot/itin-occupation-student-sm.png",
};

// wireframe-only sub labels (not in question data).
const SUB: Record<string, string> = {
  employee: "บริษัทเอกชน",
  government: "หน่วยงานรัฐ / รัฐวิสาหกิจ",
  freelance: "อาชีพอิสระ",
  business_owner: "กิจการส่วนตัว",
  retired: "เกษียณอายุ",
  homemaker: "ดูแลครอบครัว",
  student_occ: "กำลังศึกษา",
};

/** Screen 7 · occupation (q24) — alternating image rows (mascot side flips per row), auto-advance;
 * per-option branch routing via each option's nextId. (Phase-transition loader on exit → Phase 4.) */
export function OccupationScreen({
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
      title={lang === "th" ? "อาชีพปัจจุบันของคุณ?" : "What's your occupation?"}
      subtitle={lang === "th" ? "เพื่อเตรียมรายการเอกสารที่เหมาะกับคุณ" : "To prepare the right document checklist"}
      footerHint="แตะเพื่อเลือกและไปต่อ"
    >
      <div className="flex flex-col gap-3">
        {question.options?.map((o, i) => (
          <GlassCard key={o.value} selected={value === o.value} onSelect={() => select(o.value)}>
            <div className={`flex items-center gap-4 p-3 ${i % 2 === 1 ? "flex-row-reverse text-right" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={MASCOT[o.value]} alt="" className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-primary">{lang === "th" ? o.label : o.labelEn ?? o.label}</p>
                {SUB[o.value] && <p className="text-xs text-muted">{SUB[o.value]}</p>}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </QuestionShell>
  );
}
