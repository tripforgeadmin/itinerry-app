"use client";

// TEMPORARY dev-only harness rendering the real reskinned screens with mock engine props. Delete before merge.

import { useState } from "react";
import { NationalityScreen } from "@/components/screens/NationalityScreen";
import { VisatypeScreen } from "@/components/screens/VisatypeScreen";
import { QUESTIONS_MAP } from "@/lib/questions";
import { computeBoxes } from "@/lib/categories";
import type { Lang } from "@/components/ui/LangToggle";

export default function ScreensPreview() {
  const [which, setWhich] = useState<"q4" | "q9">("q4");
  const [lang, setLang] = useState<Lang>("th");
  const [value, setValue] = useState("");
  const [other, setOther] = useState("");

  const Comp = which === "q4" ? NationalityScreen : VisatypeScreen;
  const { boxes, activeIndex } = computeBoxes(which);

  return (
    <>
      <button
        onClick={() => {
          setWhich((w) => (w === "q4" ? "q9" : "q4"));
          setValue("");
          setOther("");
        }}
        className="fixed right-3 top-3 z-[60] rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-lg"
      >
        {which}
      </button>
      <Comp
        question={QUESTIONS_MAP[which]}
        value={value}
        otherValue={other}
        onAnswer={(_k, v) => setValue(v)}
        onOther={setOther}
        onNext={() => {}}
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
