"use client";

import { QUESTIONS_MAP } from "@/lib/questions";
import { SectionCard, RadioGroup } from "../FormField";
import { t, type Lang } from "@/lib/i18n";

export default function OccupationSection({
  answers,
  setOccupation,
  lang,
}: {
  answers: Record<string, string>;
  setOccupation: (v: string) => void;
  lang: Lang;
}) {
  return (
    <SectionCard title={t(lang, "S3 · อาชีพปัจจุบัน", "S3 · Current Occupation")}>
      <RadioGroup question={QUESTIONS_MAP.q24} value={answers.q24 ?? ""} onChange={setOccupation} lang={lang} />
    </SectionCard>
  );
}
