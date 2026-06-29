"use client";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { RevealBlock } from "@/components/ui/RevealBlock";
import { QuestionShell } from "@/components/screens/QuestionShell";
import { QUESTIONS_MAP } from "@/lib/questions";
import type { ScreenProps } from "@/components/screens/types";

// Blue reassurance banner copy per screen.
const BANNER: Record<string, string> = {
  q30: "ตอบตามจริงช่วยให้เราเตรียมเคสได้แม่นขึ้น — เราไม่ตัดสิน และทุกอย่างเก็บเป็นความลับ",
  q32: "ข้อมูลนี้ช่วยให้ทีมวางแผนรับมือล่วงหน้าได้ ไม่มีผลต่อการให้บริการของเรา",
};

/**
 * Sensitive Yes/No screens (refused q30, overstay q32). Combines the design's Y/N + inline detail
 * reveal: "ไม่เคย" = accent, "เคย" = warning and reveals the detail field (the as-is detail question
 * q31/q33, written via its own key). On Next we `advanceTo` the post-detail question, so the
 * separate detail screen is skipped while its value is still captured for submit.
 */
export function SensitiveYesNoScreen({
  question,
  value,
  answers,
  onAnswer,
  advanceTo,
  onBack,
  isFirst,
  lang,
  onLangChange,
  boxes,
  activeIndex,
}: ScreenProps) {
  const opts = question.options ?? [];
  const yesOpt = opts.find((o) => o.value === "yes");
  const neverOpt = opts.find((o) => o.value === "never");
  const detailId = yesOpt?.nextId; // q31 / q33
  const target = neverOpt?.nextId ?? ""; // q32 / q34 — both Y/N paths converge here
  const detailQ = detailId ? QUESTIONS_MAP[detailId] : undefined;
  const detailVal = detailId ? answers[detailId] ?? "" : "";
  const isYes = value === "yes";
  const gateOk = !!value && (!isYes || detailVal.trim().length > 0);

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
        <Button disabled={!gateOk} onClick={() => advanceTo(target)}>
          {lang === "th" ? "ถัดไป" : "Next"}
        </Button>
      }
    >
      <div className="mb-4 flex items-start gap-2 rounded-xl bg-accent-bg px-4 py-3 text-sm font-medium text-primary-mid">
        <span aria-hidden>💙</span>
        <span>{BANNER[question.id]}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {opts.map((o) => {
          const on = value === o.value;
          const warn = o.value === "yes";
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onAnswer(question.id, o.value)}
              className={
                "rounded-2xl border-2 px-4 py-5 text-center text-base font-bold transition-colors " +
                (on
                  ? warn
                    ? "border-warning bg-yellow-pale text-warning-deep"
                    : "border-accent bg-accent-subtle text-primary"
                  : "border-border bg-card text-muted hover:border-border-mid")
              }
            >
              {lang === "th" ? o.label : o.labelEn ?? o.label}
            </button>
          );
        })}
      </div>

      {detailQ && detailId && (
        <RevealBlock open={isYes}>
          <div className="pt-3">
            <TextField
              value={detailVal}
              onChange={(e) => onAnswer(detailId, e.target.value)}
              placeholder={lang === "th" ? detailQ.placeholder : detailQ.placeholderEn}
            />
          </div>
        </RevealBlock>
      )}

      <div className="mt-6 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot/itin_main.png" alt="" className="h-32 w-32 object-contain" />
      </div>
    </QuestionShell>
  );
}
