"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QuestionScreen } from "@/components/form/QuestionScreen";
import type { Lang } from "@/components/form/QuestionScreen";
import { useFormStore } from "@/store/formStore";
import { QUESTIONS_MAP } from "@/lib/questions";
import { NationalityScreen } from "@/components/screens/NationalityScreen";
import { VisatypeScreen } from "@/components/screens/VisatypeScreen";
import { computeBoxes } from "@/lib/categories";
import type { ScreenComponent } from "@/components/screens/types";

// Screens reskinned to the new design (Phase 3). Anything not listed falls back to the legacy
// QuestionScreen, so the flow stays end-to-end during the screen-by-screen migration.
const RESKINNED_SCREENS: Record<string, ScreenComponent> = {
  q4: NationalityScreen,
  q9: VisatypeScreen,
};

export default function QuestionnairePage() {
  const router = useRouter();
  const { history, answers, setAnswer, pushQuestion, popQuestion } = useFormStore();
  const [submitting, setSubmitting] = useState(false);
  const [direction, setDirection] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Lang>("th");
  const prevLenRef = useRef(history.length);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const dir = history.length >= prevLenRef.current ? 1 : -1;
    setDirection(dir);
    prevLenRef.current = history.length;
  }, [history.length]);

  if (!mounted) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  );

  const currentId = history[history.length - 1];
  const question = QUESTIONS_MAP[currentId];

  if (!question) return null;

  function getNextId(): string | undefined {
    const freshAnswers = useFormStore.getState().answers;
    const value = freshAnswers[currentId];
    const selectedOption = question.options?.find((o) => o.value === value);
    if (selectedOption && Object.prototype.hasOwnProperty.call(selectedOption, "nextId")) {
      return selectedOption.nextId;
    }
    return question.defaultNextId;
  }

  const isLast = getNextId() === undefined;

  function handleNext() {
    const nextId = getNextId();
    if (nextId) {
      pushQuestion(nextId);
    } else {
      handleSubmit();
    }
  }

  function handleBack() {
    popQuestion();
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const freshAnswers = useFormStore.getState().answers;
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: freshAnswers }),
      });
      if (!res.ok) throw new Error("Submit failed");
      router.push("/done");
    } catch {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  }

  const Reskinned = RESKINNED_SCREENS[currentId];
  if (Reskinned) {
    const { boxes, activeIndex } = computeBoxes(currentId);
    return (
      <Reskinned
        question={question}
        value={answers[currentId] ?? ""}
        otherValue={answers[`${currentId}_other`] ?? ""}
        onAnswer={setAnswer}
        onOther={(v) => setAnswer(`${currentId}_other`, v)}
        onNext={handleNext}
        onBack={handleBack}
        isFirst={history.length === 1}
        lang={lang}
        onLangChange={setLang}
        boxes={boxes}
        activeIndex={activeIndex}
      />
    );
  }

  return (
    <QuestionScreen
      question={question}
      sectionTitle={question.sectionTitle}
      sectionTitleEn={question.sectionTitleEn}
      sectionEmoji={question.sectionEmoji}
      qIndex={history.filter((id) => QUESTIONS_MAP[id]?.type !== "consent").length}
      answers={answers}
      lang={lang}
      onLangChange={setLang}
      onAnswer={setAnswer}
      onNext={handleNext}
      onBack={handleBack}
      isFirst={history.length === 1}
      isLast={isLast}
      direction={direction}
      submitting={submitting}
    />
  );
}
