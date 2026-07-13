"use client";

import { QUESTIONS_MAP } from "@/lib/questions";
import { SectionCard, MultiCheckboxGroup } from "../FormField";
import { t, type Lang } from "@/lib/i18n";

// q12 is universal — every visa branch converges here, not tied to any one visa type.
export default function PriorVisaSection({
  answers,
  setAnswer,
  lang,
}: {
  answers: Record<string, string>;
  setAnswer: (key: string, value: string) => void;
  lang: Lang;
}) {
  return (
    <SectionCard title={t(lang, "ประวัติวีซ่าที่เคยได้รับ", "Prior Visa History")}>
      <MultiCheckboxGroup question={QUESTIONS_MAP.q12} value={answers.q12 ?? ""} onChange={(v) => setAnswer("q12", v)} lang={lang} exclusiveValue="never" />
    </SectionCard>
  );
}
