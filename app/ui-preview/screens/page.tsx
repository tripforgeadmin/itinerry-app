"use client";

// TEMPORARY dev-only harness rendering the real reskinned screens with mock engine props. Delete before merge.

import { useState } from "react";
import { NationalityScreen } from "@/components/screens/NationalityScreen";
import { CountryScreen } from "@/components/screens/CountryScreen";
import { VisatypeScreen } from "@/components/screens/VisatypeScreen";
import { DateScreen } from "@/components/screens/DateScreen";
import { ChoiceScreen } from "@/components/screens/ChoiceScreen";
import { PriorVisasScreen } from "@/components/screens/PriorVisasScreen";
import { OccupationScreen } from "@/components/screens/OccupationScreen";
import { SegmentedScreen } from "@/components/screens/SegmentedScreen";
import { ExpensesScreen } from "@/components/screens/ExpensesScreen";
import { SensitiveYesNoScreen } from "@/components/screens/SensitiveYesNoScreen";
import { SavingsScreen } from "@/components/screens/SavingsScreen";
import { TiesScreen } from "@/components/screens/TiesScreen";
import { ContactScreen } from "@/components/screens/ContactScreen";
import { FoundScreen } from "@/components/screens/FoundScreen";
import { SummaryScreen } from "@/components/screens/SummaryScreen";
import { ElephantLoader } from "@/components/ui/ElephantLoader";
import { QUESTIONS_MAP } from "@/lib/questions";
import { computeBoxes } from "@/lib/categories";
import type { Lang } from "@/components/ui/LangToggle";
import type { ScreenComponent } from "@/components/screens/types";

const ORDER = ["q4", "q8", "q9", "q10", "q12", "q14", "q24", "q25", "q29", "q30", "q34", "q35", "q3", "q7", "q2"] as const;
const COMPS: Record<string, ScreenComponent> = {
  q4: NationalityScreen,
  q8: CountryScreen,
  q9: VisatypeScreen,
  q10: DateScreen,
  q12: PriorVisasScreen,
  q14: ChoiceScreen,
  q24: OccupationScreen,
  q25: SegmentedScreen,
  q29: ExpensesScreen,
  q30: SensitiveYesNoScreen,
  q34: SavingsScreen,
  q35: TiesScreen,
  q3: ContactScreen,
  q7: FoundScreen,
  q2: SummaryScreen,
};

export default function ScreensPreview() {
  const [which, setWhich] = useState<(typeof ORDER)[number]>("q4");
  const [lang, setLang] = useState<Lang>("th");
  const [answers, setAnswers] = useState<Record<string, string>>({
    q3: "สมชาย ใจดี", q5: "0812345678", q6: "somchai@email.com",
    q4: "thai", q8: "japan", q9: "tourist", q10: "2026-07-15", q11: "2026-07-25",
    q12: "uk, usa", q24: "employee", q25: "complete", q30: "never", q32: "never",
    q34: "50k_150k", q35: "job, property", q36: "line", q7: "facebook",
  });
  const [showLoader, setShowLoader] = useState(false);

  const Comp = COMPS[which];
  const { boxes, activeIndex } = computeBoxes(which);
  const set = (k: string, v: string) => setAnswers((a) => ({ ...a, [k]: v }));

  return (
    <>
      <button
        onClick={() => {
          setWhich((w) => ORDER[(ORDER.indexOf(w) + 1) % ORDER.length]);
          setAnswers({});
        }}
        className="fixed right-3 top-3 z-[60] rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-lg"
      >
        {which}
      </button>
      <button
        onClick={() => {
          setShowLoader(true);
          setTimeout(() => setShowLoader(false), 2000);
        }}
        className="fixed right-3 top-12 z-[60] rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-lg"
      >
        loader
      </button>
      <ElephantLoader show={showLoader} caption="กำลังบันทึกคำตอบของคุณ" sub="เตรียมคำถามเรื่องการเดินทาง…" />
      <Comp
        question={QUESTIONS_MAP[which]}
        value={answers[which] ?? ""}
        otherValue={answers[`${which}_other`] ?? ""}
        answers={answers}
        onAnswer={set}
        onOther={(v) => set(`${which}_other`, v)}
        onNext={() => {}}
        advanceTo={() => {}}
        onBack={() => {}}
        isFirst={false}
        lang={lang}
        onLangChange={setLang}
        boxes={boxes}
        activeIndex={activeIndex}
        submitting={false}
      />
    </>
  );
}
