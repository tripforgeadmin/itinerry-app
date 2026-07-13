"use client";

import { useEffect, useState } from "react";
import { QUESTIONS_MAP } from "@/lib/questions";
import {
  type CallbackConfig, DEFAULT_CONFIG, makeConfig, earliestCallbackDate, maxCallbackDate,
  slotsForDate, hourLabel,
} from "@/lib/holidays";
import { SectionCard, RadioGroup } from "../FormField";
import { t, type Lang } from "@/lib/i18n";

export default function ContactPreferenceSection({
  answers,
  setAnswer,
  lang,
}: {
  answers: Record<string, string>;
  setAnswer: (key: string, value: string) => void;
  lang: Lang;
}) {
  const [cfg, setCfg] = useState<CallbackConfig>(DEFAULT_CONFIG);
  const now = new Date();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/holidays")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d?.holidays)) setCfg(makeConfig(d.holidays, d.weeklyOff ?? [0]));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const minDate = earliestCallbackDate(now, cfg);
  const maxDate = maxCallbackDate(now);
  const hours = answers.q37_date ? slotsForDate(answers.q37_date, now, cfg) : [];

  return (
    <SectionCard title={t(lang, "S6–S7 · ช่องทางติดต่อ + เวลานัดโทรกลับ", "S6–S7 · Contact + Callback Time")}>
      <RadioGroup question={QUESTIONS_MAP.q36} value={answers.q36 ?? ""} onChange={(v) => setAnswer("q36", v)} lang={lang} />

      {answers.q36 === "call" && (
        <div className="flex gap-2 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t(lang, "วันที่นัดโทรกลับ", "Callback date")}</label>
            <input
              type="date"
              value={answers.q37_date ?? ""}
              min={minDate}
              max={maxDate}
              onChange={(e) => {
                setAnswer("q37_date", e.target.value);
                setAnswer("q37", "");
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t(lang, "เวลา", "Time")}</label>
            <select
              value={answers.q37 ?? ""}
              onChange={(e) => setAnswer("q37", e.target.value)}
              disabled={!answers.q37_date}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
            >
              <option value="">— {t(lang, "เลือก", "Select")} —</option>
              {hours.map((h) => (
                <option key={h} value={hourLabel(h)}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
