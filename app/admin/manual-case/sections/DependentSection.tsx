"use client";

import { QUESTIONS_MAP } from "@/lib/questions";
import { SectionCard, RadioGroup } from "../FormField";
import { t, type Lang } from "@/lib/i18n";

export default function DependentSection({
  answers,
  setAnswer,
  lang,
}: {
  answers: Record<string, string>;
  setAnswer: (key: string, value: string) => void;
  lang: Lang;
}) {
  return (
    <SectionCard title={t(lang, "S4D · ผู้รับผิดชอบค่าใช้จ่าย", "S4D · Travel Expenses")}>
      <RadioGroup question={QUESTIONS_MAP.q29} value={answers.q29 ?? ""} onChange={(v) => setAnswer("q29", v)} lang={lang} />
    </SectionCard>
  );
}
