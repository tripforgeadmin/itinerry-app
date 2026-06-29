"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { RevealBlock } from "@/components/ui/RevealBlock";
import { QuestionShell } from "@/components/screens/QuestionShell";
import type { Question } from "@/lib/questions";
import type { Lang } from "@/components/ui/LangToggle";
import type { ProgressBox } from "@/components/ui/ProgressTopBar";

interface FrameProps {
  question: Question;
  value: string;
  onAnswer: (key: string, value: string) => void;
  advanceTo: (id: string) => void;
  onBack: () => void;
  isFirst: boolean;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  boxes: ProgressBox[];
  activeIndex: number;
  banner: string;
  gateOk: boolean;
  /** Render the Y/N options as 1:1 square cards. */
  squareOptions?: boolean;
  children: ReactNode; // reveal content (shown when "เคย")
}

/** Shared frame for the sensitive Y/N screens (refused, overstay): blue reassurance banner, Y/N
 * buttons (accent / warning), an inline reveal, mascot, and a Next that `advanceTo`s past the
 * separate detail question. */
export function SensitiveYesNoFrame({
  question,
  value,
  onAnswer,
  advanceTo,
  onBack,
  isFirst,
  lang,
  onLangChange,
  boxes,
  activeIndex,
  banner,
  gateOk,
  squareOptions = false,
  children,
}: FrameProps) {
  const opts = question.options ?? [];
  const target = opts.find((o) => o.value === "never")?.nextId ?? "";
  const isYes = value === "yes";

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
        <span>{banner}</span>
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
                "rounded-2xl border-2 text-center text-base font-bold transition-colors " +
                (squareOptions ? "flex aspect-square flex-col items-center justify-center p-3 " : "px-4 py-5 ") +
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

      <RevealBlock open={isYes}>{children}</RevealBlock>

      <div className="mt-6 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot/itin_main.png" alt="" className="h-32 w-32 object-contain" />
      </div>
    </QuestionShell>
  );
}
