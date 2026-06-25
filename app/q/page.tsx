"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QuestionScreen } from "@/components/form/QuestionScreen";
import type { Lang } from "@/components/form/QuestionScreen";
import { useFormStore } from "@/store/formStore";
import { getActiveSteps } from "@/lib/questions";
import type { Question, Step } from "@/lib/questions";

interface FlatQuestion {
  question: Question;
  step: Step;
  stepIndex: number;
}

function flattenQuestions(answers: Record<string, string | string[]>): FlatQuestion[] {
  const steps = getActiveSteps(answers);
  return steps.flatMap((step, stepIndex) =>
    step.questions.map((question) => ({ question, step, stepIndex }))
  );
}

export default function QuestionnairePage() {
  const router = useRouter();
  const { step, answers, setAnswer, nextStep, prevStep, setStep } = useFormStore();
  const [submitting, setSubmitting] = useState(false);
  const [direction, setDirection] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Lang>("th");
  const prevStepRef = useRef(step);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setDirection(step > prevStepRef.current ? 1 : -1);
    prevStepRef.current = step;
  }, [step]);

  const flat = flattenQuestions(answers);
  const current = flat[step];

  useEffect(() => {
    if (mounted && step >= flat.length && flat.length > 0) {
      setStep(flat.length - 1);
    }
  }, [mounted, flat.length, step, setStep]);

  if (!mounted) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  );

  if (!current) return null;

  // Get unique steps to count sections
  const uniqueSteps = [...new Map(flat.map((f) => [f.step.id, f.step])).values()];
  const totalSections = uniqueSteps.length;

  async function handleNext() {
    if (step < flat.length - 1) {
      nextStep();
    } else {
      await handleSubmit();
    }
  }

  function handleBack() {
    prevStep();
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error("Submit failed");
      router.push("/done");
    } catch {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  }

  return (
    <QuestionScreen
      question={current.question}
      sectionTitle={current.step.title}
      sectionTitleEn={current.step.titleEn}
      qIndex={step}
      totalQ={flat.length}
      answers={answers}
      lang={lang}
      onLangChange={setLang}
      sectionEmoji={current.step.emoji}
      onAnswer={(key, value) => setAnswer(key, value)}
      onNext={handleNext}
      onBack={handleBack}
      isFirst={step === 0}
      isLast={step === flat.length - 1}
      direction={direction}
      submitting={submitting}
    />
  );
}
