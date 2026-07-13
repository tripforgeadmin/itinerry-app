"use client";

import { QUESTIONS_MAP } from "@/lib/questions";
import { SectionCard, RadioGroup } from "../FormField";
import { t, type Lang } from "@/lib/i18n";

export default function BusinessOwnerSection({
  answers,
  setAnswer,
  lang,
}: {
  answers: Record<string, string>;
  setAnswer: (key: string, value: string) => void;
  lang: Lang;
}) {
  return (
    <SectionCard title={t(lang, "S4C · เจ้าของธุรกิจ", "S4C · Business Owner")}>
      <RadioGroup question={QUESTIONS_MAP.q28} value={answers.q28 ?? ""} onChange={(v) => setAnswer("q28", v)} lang={lang} />
    </SectionCard>
  );
}
