"use client";

import { SectionCard } from "../FormField";
import { t, type Lang } from "@/lib/i18n";

export default function ConsentSection({
  answers,
  setAnswer,
  lang,
}: {
  answers: Record<string, string>;
  setAnswer: (key: string, value: string) => void;
  lang: Lang;
}) {
  return (
    <SectionCard title={t(lang, "S0 · ความยินยอม", "S0 · Consent")}>
      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={answers.q2 === "true"}
          onChange={(e) => setAnswer("q2", e.target.checked ? "true" : "")}
          className="mt-0.5"
        />
        {t(
          lang,
          "ยืนยันว่าได้แจ้งลูกค้าและได้รับความยินยอมให้เก็บข้อมูล (PDPA) ทางโทรศัพท์แล้ว",
          "Confirm the customer was informed and gave verbal PDPA consent over the phone"
        )}
      </label>
    </SectionCard>
  );
}
