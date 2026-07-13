"use client";

import { QUESTIONS_MAP } from "@/lib/questions";
import { SectionCard, DateInput, RadioGroup, MultiCheckboxGroup } from "../FormField";
import { t, type Lang } from "@/lib/i18n";

export default function VisitorSection({
  answers,
  setAnswer,
  lang,
}: {
  answers: Record<string, string>;
  setAnswer: (key: string, value: string) => void;
  lang: Lang;
}) {
  return (
    <SectionCard title={t(lang, "S2B · วีซ่าเยี่ยมเยียน", "S2B · Visitor Visa")}>
      <DateInput question={QUESTIONS_MAP.q13} value={answers.q13 ?? ""} onChange={(v) => setAnswer("q13", v)} lang={lang} />
      <DateInput question={QUESTIONS_MAP.q39} value={answers.q39 ?? ""} onChange={(v) => setAnswer("q39", v)} lang={lang} min={answers.q13 || undefined} />
      <RadioGroup question={QUESTIONS_MAP.q14} value={answers.q14 ?? ""} onChange={(v) => setAnswer("q14", v)} lang={lang} />
      <RadioGroup question={QUESTIONS_MAP.q15} value={answers.q15 ?? ""} onChange={(v) => setAnswer("q15", v)} lang={lang} />
      <MultiCheckboxGroup question={QUESTIONS_MAP.q16} value={answers.q16 ?? ""} onChange={(v) => setAnswer("q16", v)} lang={lang} exclusiveValue="none" />
    </SectionCard>
  );
}
