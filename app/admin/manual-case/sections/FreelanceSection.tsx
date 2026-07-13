"use client";

import { QUESTIONS_MAP } from "@/lib/questions";
import { SectionCard, RadioGroup, MultiCheckboxGroup } from "../FormField";
import { t, type Lang } from "@/lib/i18n";

export default function FreelanceSection({
  answers,
  setAnswer,
  lang,
}: {
  answers: Record<string, string>;
  setAnswer: (key: string, value: string) => void;
  lang: Lang;
}) {
  return (
    <SectionCard title={t(lang, "S4B · Freelance / อาชีพอิสระ", "S4B · Freelance")}>
      <MultiCheckboxGroup question={QUESTIONS_MAP.q26} value={answers.q26 ?? ""} onChange={(v) => setAnswer("q26", v)} lang={lang} exclusiveValue="none" />
      <RadioGroup question={QUESTIONS_MAP.q27} value={answers.q27 ?? ""} onChange={(v) => setAnswer("q27", v)} lang={lang} />
    </SectionCard>
  );
}
