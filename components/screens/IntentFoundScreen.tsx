"use client";

import { useEffect, useRef, useState } from "react";
import { ChoiceRow } from "@/components/ui/ChoiceRow";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { RevealBlock } from "@/components/ui/RevealBlock";
import { QuestionShell } from "@/components/screens/QuestionShell";
import { QUESTIONS_MAP } from "@/lib/questions";
import type { ScreenProps } from "@/components/screens/types";

const LOGO: Record<string, string> = {
  facebook: "/social/facebook.png",
  instagram: "/social/instagram.png",
  tiktok: "/social/tiktok.png",
  google: "/social/google.png",
  referral: "/social/referral.png",
  other: "/social/other.png",
};

/** Final step (rendered at q7): an intent question (q38) + the "how did you find us" source (q7) as
 * an icon dropdown, on one screen, just before the summary. */
export function IntentFoundScreen({
  question,
  value,
  otherValue,
  answers,
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
  const [open, setOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);
  const q38 = QUESTIONS_MAP["q38"];
  const intent = answers["q38"] ?? "";
  const isOther = value === "other";
  const foundOpt = question.options?.find((o) => o.value === value);
  const gateOk = !!intent && !!value && (!isOther || otherValue.trim().length > 0);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const Icon = ({ v, size }: { v: string; size: string }) => (
    <span className={`grid ${size} shrink-0 place-items-center rounded-lg bg-accent-bg`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO[v]} alt="" className="h-full w-full object-contain p-1" />
    </span>
  );

  return (
    <QuestionShell
      boxes={boxes}
      activeIndex={activeIndex}
      isFirst={isFirst}
      onBack={onBack}
      lang={lang}
      onLangChange={onLangChange}
      screenKey={question.id}
      title={lang === "th" ? "ขั้นตอนสุดท้าย" : "Final step"}
      footer={
        <Button disabled={!gateOk} onClick={onNext}>
          {lang === "th" ? "ถัดไป" : "Next"}
        </Button>
      }
    >
      <div className="mb-5 flex items-start gap-2 rounded-2xl bg-accent-bg px-4 py-3 text-sm font-medium text-primary-mid">
        <span aria-hidden>💙</span>
        <span>
          {lang === "th"
            ? "เพื่อให้คำแนะนำของเราช่วยเหลือคุณได้มากที่สุด เราขอสอบถามคุณในขั้นตอนสุดท้าย"
            : "So our advice can help you best, one last question."}
        </span>
      </div>

      {/* Q1 · intent (q38) */}
      <h3 className="font-bold text-primary">{lang === "th" ? q38.question : q38.questionEn ?? q38.question}</h3>
      <p className="mb-3 mt-1 text-xs text-muted">{lang === "th" ? "(ตอบคำถามที่ตรงที่สุด)" : "(pick the closest)"}</p>
      <div className="flex flex-col gap-3">
        {q38.options?.map((o) => (
          <ChoiceRow
            key={o.value}
            selected={intent === o.value}
            onSelect={() => onAnswer("q38", o.value)}
            title={lang === "th" ? o.label : o.labelEn ?? o.label}
          />
        ))}
      </div>

      {/* Q2 · source (q7) as an icon dropdown */}
      <h3 className="mb-2 mt-6 font-bold text-primary">{lang === "th" ? "รู้จัก itinerry จากช่องไหน?" : "How did you find itinerry?"}</h3>
      <div ref={ddRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-left transition-colors focus:border-accent"
        >
          {foundOpt ? (
            <>
              <Icon v={foundOpt.value} size="h-9 w-9" />
              <span className="flex-1 font-semibold text-primary">{lang === "th" ? foundOpt.label : foundOpt.labelEn ?? foundOpt.label}</span>
            </>
          ) : (
            <span className="flex-1 px-1 text-muted-soft">{lang === "th" ? "เลือกช่องทาง…" : "Select a source…"}</span>
          )}
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`shrink-0 text-muted-soft transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {open && (
          <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {question.options?.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => {
                    onAnswer(question.id, o.value);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent-bg"
                >
                  <Icon v={o.value} size="h-8 w-8" />
                  <span className="font-medium text-primary">{lang === "th" ? o.label : o.labelEn ?? o.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
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
