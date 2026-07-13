"use client";

import { QUESTIONS_MAP } from "@/lib/questions";
import { CountryHistoryEditor, type HistoryEntry } from "@/components/screens/CountryHistoryEditor";
import { SectionCard, RadioGroup, MultiCheckboxGroup } from "../FormField";
import { t, type Lang } from "@/lib/i18n";

function parseEntries(v: string | undefined): HistoryEntry[] {
  if (!v) return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function CoreQualificationSection({
  answers,
  setAnswer,
  lang,
}: {
  answers: Record<string, string>;
  setAnswer: (key: string, value: string) => void;
  lang: Lang;
}) {
  function setRefused(entries: HistoryEntry[]) {
    setAnswer("q31_entries", JSON.stringify(entries));
    setAnswer("q31", entries.map((e) => `${e.country} ${e.year}`).join(", "));
  }
  function setOverstay(entries: HistoryEntry[]) {
    setAnswer("q33_entries", JSON.stringify(entries));
    setAnswer(
      "q33",
      entries.map((e) => `${e.country} ${e.year}${e.days ? ` · ${e.days} ${t(lang, "วัน", "days")}` : ""}`).join(", ")
    );
  }

  return (
    <SectionCard title={t(lang, "S5 · คัดกรองหลัก", "S5 · Core Qualification")}>
      <div>
        <RadioGroup question={QUESTIONS_MAP.q30} value={answers.q30 ?? ""} onChange={(v) => setAnswer("q30", v)} lang={lang} />
        {answers.q30 === "yes" && (
          <CountryHistoryEditor entries={parseEntries(answers.q31_entries)} onChange={setRefused} lang={lang} />
        )}
      </div>

      <div>
        <RadioGroup question={QUESTIONS_MAP.q32} value={answers.q32 ?? ""} onChange={(v) => setAnswer("q32", v)} lang={lang} />
        {answers.q32 === "yes" && (
          <CountryHistoryEditor entries={parseEntries(answers.q33_entries)} onChange={setOverstay} withDays lang={lang} />
        )}
      </div>

      {answers.q9 !== "student" && (
        <RadioGroup question={QUESTIONS_MAP.q34} value={answers.q34 ?? ""} onChange={(v) => setAnswer("q34", v)} lang={lang} />
      )}

      <MultiCheckboxGroup question={QUESTIONS_MAP.q35} value={answers.q35 ?? ""} onChange={(v) => setAnswer("q35", v)} lang={lang} exclusiveValue="none" />
    </SectionCard>
  );
}
