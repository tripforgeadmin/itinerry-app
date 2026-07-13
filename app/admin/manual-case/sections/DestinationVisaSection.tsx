"use client";

import { QUESTIONS_MAP } from "@/lib/questions";
import { sortedCountries } from "@/lib/countries";
import { SectionCard, RadioGroup } from "../FormField";
import { t, type Lang } from "@/lib/i18n";

export default function DestinationVisaSection({
  answers,
  setVisaType,
  setAnswer,
  lang,
}: {
  answers: Record<string, string>;
  setVisaType: (v: string) => void;
  setAnswer: (key: string, value: string) => void;
  lang: Lang;
}) {
  const countries = sortedCountries(lang === "en" ? "en" : "th");
  return (
    <SectionCard title={t(lang, "S2 · ปลายทาง + ประเภทวีซ่า", "S2 · Destination + Visa Type")}>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          {t(lang, "ประเทศที่ต้องการยื่นวีซ่า", "Destination Country")}
          <span className="text-red-500 ml-0.5">*</span>
        </label>
        <select
          value={answers.q8 ?? ""}
          onChange={(e) => setAnswer("q8", e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">— {t(lang, "เลือก", "Select")} —</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code.toLowerCase()}>
              {lang === "en" ? c.en : c.th}
            </option>
          ))}
        </select>
      </div>

      <RadioGroup question={QUESTIONS_MAP.q9} value={answers.q9 ?? ""} onChange={setVisaType} lang={lang} />
    </SectionCard>
  );
}
