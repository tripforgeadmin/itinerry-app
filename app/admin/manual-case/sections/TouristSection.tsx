"use client";

import { QUESTIONS_MAP } from "@/lib/questions";
import { SectionCard, DateInput } from "../FormField";
import { t, type Lang } from "@/lib/i18n";

export default function TouristSection({
  answers,
  setAnswer,
  lang,
}: {
  answers: Record<string, string>;
  setAnswer: (key: string, value: string) => void;
  lang: Lang;
}) {
  return (
    <SectionCard title={t(lang, "S2A · วีซ่าท่องเที่ยว", "S2A · Tourist Visa")}>
      <DateInput question={QUESTIONS_MAP.q10} value={answers.q10 ?? ""} onChange={(v) => setAnswer("q10", v)} lang={lang} />
      <DateInput question={QUESTIONS_MAP.q11} value={answers.q11 ?? ""} onChange={(v) => setAnswer("q11", v)} lang={lang} min={answers.q10 || undefined} />
    </SectionCard>
  );
}
