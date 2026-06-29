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
import { QUESTIONS_MAP } from "@/lib/questions";
import { computeBoxes } from "@/lib/categories";
import type { Lang } from "@/components/ui/LangToggle";
import type { ScreenComponent } from "@/components/screens/types";

const ORDER = ["q4", "q8", "q9", "q10", "q12", "q14", "q24", "q25", "q29", "q30", "q34", "q35"] as const;
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
};

export default function ScreensPreview() {
  const [which, setWhich] = useState<(typeof ORDER)[number]>("q35");
  const [lang, setLang] = useState<Lang>("th");
  const [answers, setAnswers] = useState<Record<string, string>>({});

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
      />
    </>
  );
}
