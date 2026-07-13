"use client";

import { QUESTIONS_MAP } from "@/lib/questions";
import { SectionCard, RadioGroup } from "../FormField";
import { t, type Lang } from "@/lib/i18n";

export default function EmployeeSection({
  answers,
  setAnswer,
  lang,
}: {
  answers: Record<string, string>;
  setAnswer: (key: string, value: string) => void;
  lang: Lang;
}) {
  return (
    <SectionCard title={t(lang, "S4A · พนักงานประจำ / ข้าราชการ", "S4A · Employee / Government Officer")}>
      <RadioGroup question={QUESTIONS_MAP.q25} value={answers.q25 ?? ""} onChange={(v) => setAnswer("q25", v)} lang={lang} />
    </SectionCard>
  );
}
