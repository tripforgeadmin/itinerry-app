"use client";

import { useEffect, useRef, useState } from "react";
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
      hideTitleDivider
      compactTitle
      footer={
        <Button disabled={!gateOk} onClick={onNext}>
          {lang === "th" ? "ถัดไป" : "Next"}
        </Button>
      }
    >
      {/* Q1 · intent (q38) — same heading size as a step question */}
      <h2 className="text-2xl font-extrabold leading-snug text-primary">
        {lang === "th" ? q38.question : q38.questionEn ?? q38.question}{" "}
        <span className="text-xs font-medium text-muted">{lang === "th" ? "(ตอบคำถามที่ตรงที่สุด)" : "(pick the closest)"}</span>
      </h2>
      <div className="mt-4 flex flex-col gap-3">
        {q38.options?.map((o) => {
          const on = intent === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onAnswer("q38", o.value)}
              className={
                "flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-semibold leading-snug transition-colors " +
                (on ? "border-accent bg-accent-subtle text-primary" : "border-border bg-card text-primary-mid hover:border-border-mid")
              }
            >
              <span className={"grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors " + (on ? "border-accent bg-accent text-white" : "border-border-mid text-transparent")}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 13 4 4L19 7" />
                </svg>
              </span>
              <span className="flex-1">{lang === "th" ? o.label : o.labelEn ?? o.label}</span>
            </button>
          );
        })}
      </div>

      {/* Q2 · source (q7) as an icon dropdown */}
      <h3 className="mb-2 mt-6 font-bold text-primary">{lang === "th" ? "คุณรู้จัก itinerry จากช่องไหน?" : "How did you find itinerry?"}</h3>
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
            <span className="flex-1 px-1 text-muted-soft">{lang === "th" ? "โปรดระบุช่องทาง" : "Select a source…"}</span>
          )}
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`shrink-0 text-muted-soft transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {open && (
          <ul className="absolute bottom-full z-50 mb-1 max-h-[55vh] w-full overflow-y-auto rounded-2xl border border-border bg-card shadow-card">
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
