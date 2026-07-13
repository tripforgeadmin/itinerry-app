"use client";

import { QUESTIONS_MAP } from "@/lib/questions";
import { SectionCard, RadioGroup } from "../FormField";
import { t, type Lang } from "@/lib/i18n";

export default function IntentSection({
  answers,
  setAnswer,
  lang,
}: {
  answers: Record<string, string>;
  setAnswer: (key: string, value: string) => void;
  lang: Lang;
}) {
  return (
    <SectionCard title={t(lang, "S8 · ขั้นตอนสุดท้าย", "S8 · Final Step")}>
      <RadioGroup question={QUESTIONS_MAP.q38} value={answers.q38 ?? ""} onChange={(v) => setAnswer("q38", v)} lang={lang} />
    </SectionCard>
  );
}
