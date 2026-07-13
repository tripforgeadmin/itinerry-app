"use client";

import { QUESTIONS_MAP } from "@/lib/questions";
import { SectionCard, DateInput, RadioGroup } from "../FormField";
import { t, type Lang } from "@/lib/i18n";

export default function BusinessSection({
  answers,
  setAnswer,
  lang,
}: {
  answers: Record<string, string>;
  setAnswer: (key: string, value: string) => void;
  lang: Lang;
}) {
  return (
    <SectionCard title={t(lang, "S2C · วีซ่าธุรกิจ", "S2C · Business Visa")}>
      <DateInput question={QUESTIONS_MAP.q17} value={answers.q17 ?? ""} onChange={(v) => setAnswer("q17", v)} lang={lang} />
      <DateInput question={QUESTIONS_MAP.q18} value={answers.q18 ?? ""} onChange={(v) => setAnswer("q18", v)} lang={lang} min={answers.q17 || undefined} />
      <RadioGroup question={QUESTIONS_MAP.q19} value={answers.q19 ?? ""} onChange={(v) => setAnswer("q19", v)} lang={lang} />
    </SectionCard>
  );
}
