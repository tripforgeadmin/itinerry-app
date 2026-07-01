"use client";

import { useEffect, useRef, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
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

// q38 intent value → mascot + a short heading (full option label is shown as the sub-line).
const PURPOSE_IMG: Record<string, string> = {
  explore: "/mascot/itin-purpose-tofu.png",
  ready: "/mascot/itin-purpose-mofu.png",
  execute: "/mascot/itin-purpose-bofu.png",
};
const PURPOSE_TITLE: Record<string, { th: string; en: string }> = {
  explore: { th: "กำลังศึกษาข้อมูล", en: "Exploring" },
  ready: { th: "พร้อมยื่น กำลังหาบริการ", en: "Ready — finding a service" },
  execute: { th: "ต้องการผู้ช่วยดำเนินการ", en: "Need hands-on help" },
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
  const foundRef = useRef<HTMLDivElement>(null);
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

  function pickIntent(v: string) {
    onAnswer("q38", v);
    // guide the eye down to the second question once intent is chosen
    setTimeout(() => foundRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
  }

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
          const t = PURPOSE_TITLE[o.value];
          return (
            <GlassCard key={o.value} selected={intent === o.value} onSelect={() => pickIntent(o.value)} className="overflow-hidden">
              <div className="flex items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={PURPOSE_IMG[o.value]} alt="" className="h-[116px] w-[116px] shrink-0 object-cover" />
                <div className="min-w-0 flex-1 px-4 py-3">
                  <p className="text-base font-bold text-primary">{lang === "th" ? t?.th : t?.en}</p>
                  <p className="mt-1 text-sm leading-snug text-muted">{lang === "th" ? o.label : o.labelEn ?? o.label}</p>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Q2 · source (q7) as an icon dropdown */}
      <div ref={foundRef} className="scroll-mt-4">
        <h2 className="mb-3 mt-8 text-2xl font-extrabold leading-snug text-primary">
          {lang === "th" ? "คุณรู้จัก itinerry จากช่องไหน?" : "How did you find itinerry?"}
        </h2>
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

        {/* data-collection reassurance */}
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-accent-bg px-3.5 py-3 text-sm leading-relaxed text-primary-mid">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#3b82f6" className="mt-0.5 shrink-0" aria-hidden>
            <path d="M12 21s-6.7-4.35-9.33-8.11C.9 10.24 1.4 6.6 4.2 5.2c2-1 4.3-.35 5.6 1.3L12 8.9l2.2-2.4c1.3-1.65 3.6-2.3 5.6-1.3 2.8 1.4 3.3 5.04 1.53 7.69C18.7 16.65 12 21 12 21Z" />
          </svg>
          <span>
            {lang === "th"
              ? "ขออนุญาตเก็บข้อมูลซักนิดนะครับ เพื่อนำไปพัฒนาสิ่งดีๆในการให้บริการและการตลาดของเราครับ"
              : "We'd love to collect a little info to keep improving our service and outreach."}
          </span>
        </p>

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
      </div>
    </QuestionShell>
  );
}
