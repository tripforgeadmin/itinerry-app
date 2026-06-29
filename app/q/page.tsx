"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QuestionScreen } from "@/components/form/QuestionScreen";
import type { Lang } from "@/components/form/QuestionScreen";
import { useFormStore } from "@/store/formStore";
import { QUESTIONS_MAP } from "@/lib/questions";
import { NationalityScreen } from "@/components/screens/NationalityScreen";
import { CountryScreen } from "@/components/screens/CountryScreen";
import { VisatypeScreen } from "@/components/screens/VisatypeScreen";
import { DateScreen } from "@/components/screens/DateScreen";
import { ChoiceScreen } from "@/components/screens/ChoiceScreen";
import { MultiSelectScreen } from "@/components/screens/MultiSelectScreen";
import { PriorVisasScreen } from "@/components/screens/PriorVisasScreen";
import { OccupationScreen } from "@/components/screens/OccupationScreen";
import { SegmentedScreen } from "@/components/screens/SegmentedScreen";
import { ExpensesScreen } from "@/components/screens/ExpensesScreen";
import { RefusedScreen } from "@/components/screens/RefusedScreen";
import { OverstayScreen } from "@/components/screens/OverstayScreen";
import { SavingsScreen } from "@/components/screens/SavingsScreen";
import { TiesScreen } from "@/components/screens/TiesScreen";
import { ContactScreen } from "@/components/screens/ContactScreen";
import { FoundScreen } from "@/components/screens/FoundScreen";
import { SummaryScreen } from "@/components/screens/SummaryScreen";
import { ElephantLoader } from "@/components/ui/ElephantLoader";
import { computeBoxes, categoryIndexOf, firstVisitedIdOfCategory } from "@/lib/categories";
import { NavContext } from "@/lib/navContext";
import type { ScreenComponent } from "@/components/screens/types";

// Screens reskinned to the new design (Phase 3). Anything not listed falls back to the legacy
// QuestionScreen, so the flow stays end-to-end during the screen-by-screen migration.
const RESKINNED_SCREENS: Record<string, ScreenComponent> = {
  // Group A · พื้นฐาน (bespoke layouts)
  q4: NationalityScreen,
  q8: CountryScreen,
  q9: VisatypeScreen,
  // Group B · เดินทาง (visa-branch questions q10–q23, generic by field type)
  q10: DateScreen, q11: DateScreen, q13: DateScreen, q17: DateScreen, q18: DateScreen, q21: DateScreen,
  q14: ChoiceScreen, q15: ChoiceScreen, q19: ChoiceScreen, q22: ChoiceScreen, q23: ChoiceScreen,
  q12: PriorVisasScreen, q16: MultiSelectScreen, q20: PriorVisasScreen,
  // Group C · อาชีพ (occupation + employment-document branches q24–q29)
  q24: OccupationScreen,
  q25: SegmentedScreen, q26: SegmentedScreen, q27: SegmentedScreen, q28: SegmentedScreen,
  q29: ExpensesScreen,
  // Group C · คุณสมบัติ (q30 refused + q32 overstay combine their detail q31/q33 via advanceTo)
  q30: RefusedScreen, q32: OverstayScreen,
  q34: SavingsScreen,
  q35: TiesScreen,
  // Group C · ข้อมูลติดต่อ (contact merges q3/q5/q6/q36/q37 via advanceTo → q7 found → q2 summary)
  q3: ContactScreen,
  q7: FoundScreen,
  q2: SummaryScreen,
};

// Elephant loader (itin-hold-ipad) plays when advancing OUT of these screens — the 5-category
// boundaries: พื้นฐาน→เดินทาง (q9), อาชีพ→คุณสมบัติ (work-branch end), คุณสมบัติ→ข้อมูลติดต่อ (q35).
const WORK_END = { cap: "เกือบครบแล้ว!", sub: "เตรียมคำถามคัดกรอง…" };
const PHASE_END_LOADER: Record<string, { cap: string; sub?: string }> = {
  q9: { cap: "กำลังบันทึกคำตอบของคุณ", sub: "เตรียมคำถามเรื่องการเดินทาง…" },
  q25: WORK_END,
  q27: WORK_END,
  q28: WORK_END,
  q29: WORK_END,
  q35: { cap: "เกือบเสร็จแล้ว!", sub: "เตรียมส่วนข้อมูลติดต่อ…" },
};

export default function QuestionnairePage() {
  const router = useRouter();
  const { history, answers, setAnswer, pushQuestion, popQuestion, truncateTo } = useFormStore();
  const [submitting, setSubmitting] = useState(false);
  const [direction, setDirection] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Lang>("th");
  const [loaderState, setLoaderState] = useState<{ cap: string; sub?: string } | null>(null);
  const prevLenRef = useRef(history.length);
  const loaderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (!nextId) {
      handleSubmit();
      return;
    }
    const loader = PHASE_END_LOADER[currentId];
    if (loader) {
      setLoaderState(loader);
      loaderTimer.current = setTimeout(() => {
        setLoaderState(null);
        pushQuestion(nextId);
      }, 2000);
    } else {
      pushQuestion(nextId);
    }
  }

  function handleBack() {
    popQuestion();
  }

  // Clicking a past category box jumps back to its first visited question.
  function handleJump(categoryIndex: number) {
    if (categoryIndex >= categoryIndexOf(currentId)) return;
    const targetId = firstVisitedIdOfCategory(categoryIndex, history);
    if (!targetId || targetId === currentId) return;
    if (loaderTimer.current) clearTimeout(loaderTimer.current);
    setLoaderState(null);
    truncateTo(targetId);
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

  const loaderEl = (
    <ElephantLoader show={!!loaderState} caption={loaderState?.cap ?? ""} sub={loaderState?.sub} />
  );

  const Reskinned = RESKINNED_SCREENS[currentId];
  if (Reskinned) {
    const { boxes, activeIndex } = computeBoxes(currentId);
    return (
      <NavContext.Provider value={{ onJump: handleJump }}>
        <Reskinned
          question={question}
          value={answers[currentId] ?? ""}
          otherValue={answers[`${currentId}_other`] ?? ""}
          answers={answers}
          onAnswer={setAnswer}
          onOther={(v) => setAnswer(`${currentId}_other`, v)}
          onNext={handleNext}
          advanceTo={(id) => pushQuestion(id)}
          onBack={handleBack}
          isFirst={history.length === 1}
          lang={lang}
          onLangChange={setLang}
          boxes={boxes}
          activeIndex={activeIndex}
          submitting={submitting}
        />
        {loaderEl}
      </NavContext.Provider>
    );
  }

  return (
    <>
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
      {loaderEl}
    </>
  );
}
