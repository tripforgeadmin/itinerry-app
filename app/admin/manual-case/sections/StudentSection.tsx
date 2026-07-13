"use client";

import { QUESTIONS_MAP } from "@/lib/questions";
import { SectionCard, DateInput, RadioGroup } from "../FormField";
import { t, type Lang } from "@/lib/i18n";

export default function StudentSection({
  answers,
  setAnswer,
  lang,
}: {
  answers: Record<string, string>;
  setAnswer: (key: string, value: string) => void;
  lang: Lang;
}) {
  return (
    <SectionCard title={t(lang, "S2D · วีซ่านักเรียน", "S2D · Student Visa")}>
      <DateInput question={QUESTIONS_MAP.q21} value={answers.q21 ?? ""} onChange={(v) => setAnswer("q21", v)} lang={lang} />
      <RadioGroup question={QUESTIONS_MAP.q22} value={answers.q22 ?? ""} onChange={(v) => setAnswer("q22", v)} lang={lang} />
      <RadioGroup question={QUESTIONS_MAP.q23} value={answers.q23 ?? ""} onChange={(v) => setAnswer("q23", v)} lang={lang} />
    </SectionCard>
  );
}
