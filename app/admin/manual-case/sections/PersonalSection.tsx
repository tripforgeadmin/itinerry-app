"use client";

import { QUESTIONS_MAP } from "@/lib/questions";
import { DIAL_CODES, DEFAULT_DIAL_CODE } from "@/lib/dialCodes";
import { SectionCard, RadioGroup, TextInput } from "../FormField";
import { t, type Lang } from "@/lib/i18n";

export default function PersonalSection({
  answers,
  setAnswer,
  lang,
}: {
  answers: Record<string, string>;
  setAnswer: (key: string, value: string) => void;
  lang: Lang;
}) {
  return (
    <SectionCard title={t(lang, "S1 · ข้อมูลส่วนตัว", "S1 · Personal Information")}>
      <TextInput question={QUESTIONS_MAP.q3} value={answers.q3 ?? ""} onChange={(v) => setAnswer("q3", v)} lang={lang} />

      <RadioGroup
        question={QUESTIONS_MAP.q4}
        value={answers.q4 ?? ""}
        onChange={(v) => setAnswer("q4", v)}
        lang={lang}
        otherValue={answers.q4_other ?? ""}
        onOtherChange={(v) => setAnswer("q4_other", v)}
      />

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          {t(lang, "เบอร์โทรศัพท์", "Phone Number")}
          <span className="text-red-500 ml-0.5">*</span>
        </label>
        <div className="flex gap-2">
          <select
            value={answers.q5_cc || DEFAULT_DIAL_CODE}
            onChange={(e) => setAnswer("q5_cc", e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
          >
            {DIAL_CODES.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} {lang === "en" ? d.en : d.th}
              </option>
            ))}
          </select>
          <input
            type="tel"
            value={answers.q5 ?? ""}
            onChange={(e) => setAnswer("q5", e.target.value)}
            placeholder="0812345678"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <TextInput question={QUESTIONS_MAP.q6} value={answers.q6 ?? ""} onChange={(v) => setAnswer("q6", v)} lang={lang} type="email" />

      <RadioGroup
        question={QUESTIONS_MAP.q7}
        value={answers.q7 ?? ""}
        onChange={(v) => setAnswer("q7", v)}
        lang={lang}
        otherValue={answers.q7_other ?? ""}
        onOtherChange={(v) => setAnswer("q7_other", v)}
      />
    </SectionCard>
  );
}
