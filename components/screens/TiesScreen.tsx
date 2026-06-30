"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { QuestionShell } from "@/components/screens/QuestionShell";
import type { ScreenProps } from "@/components/screens/types";

// ties value → obligation cut-out illustration.
const IMG: Record<string, string> = {
  job: "/mascot/itin-obligation-job-cut.png",
  property: "/mascot/itin-obligation-house-cut.png",
  spouse_children: "/mascot/itin-obligation-wife-child-cut.png",
  dependents: "/mascot/itin-obligation-elder-cut.png",
  investments: "/mascot/itin-obligation-other-asset-cut.png",
  none: "/mascot/itin-obligation-no-cut.png",
};

const EXCLUSIVE = "none";

function parse(v: string): string[] {
  return v ? v.split(", ").filter(Boolean) : [];
}

/** Ties to Thailand (q35) — 2-col illustrated card grid, green positive banner, multi-select with
 * exclusive "ไม่มีข้อใด", gated Next. */
export function TiesScreen({
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
  const selected = parse(value);

  function toggle(v: string) {
    let next: string[];
    if (v === EXCLUSIVE) {
      next = selected.includes(v) ? [] : [v];
    } else {
      const base = selected.filter((x) => x !== EXCLUSIVE);
      next = base.includes(v) ? base.filter((x) => x !== v) : [...base, v];
    }
    onAnswer(question.id, next.join(", "));
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
      title={lang === "th" ? "ความผูกพันกับเมืองไทย" : "Ties to Thailand"}
      subtitle={lang === "th" ? "สิ่งที่ทำให้คุณต้องกลับไทย — เป็นสัญญาณบวกสำคัญต่อวีซ่า" : "What ties you back to Thailand — a strong positive signal"}
      footer={
        <Button disabled={selected.length === 0} onClick={onNext}>
          {lang === "th" ? "ถัดไป" : "Next"}
        </Button>
      }
    >
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-success-bg px-4 py-2.5 text-sm font-semibold text-success-deep">
        <span aria-hidden>✓</span>
        <span>{lang === "th" ? "เลือกทุกข้อที่ใช่ — ยิ่งมากยิ่งช่วยเคส" : "Pick all that apply — more helps your case"}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {question.options?.map((o) => (
          <GlassCard key={o.value} selected={selected.includes(o.value)} onSelect={() => toggle(o.value)}>
            <div className="flex flex-col items-center gap-2 p-3 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMG[o.value]} alt="" className="h-20 w-20 object-contain" />
              <p className="line-clamp-2 text-xs font-bold leading-tight text-primary">
                {lang === "th" ? o.label : o.labelEn ?? o.label}
              </p>
            </div>
          </GlassCard>
        ))}
      </div>
    </QuestionShell>
  );
}
