"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/components/ui/LangToggle";
import { useFormStore } from "@/store/formStore";
import { QUESTIONS_MAP } from "@/lib/questions";
import type { Question } from "@/lib/questions";
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
import { IntentFoundScreen } from "@/components/screens/IntentFoundScreen";
import { SummaryScreen } from "@/components/screens/SummaryScreen";
import { ElephantLoader } from "@/components/ui/ElephantLoader";
import { computeBoxes, categoryIndexOf } from "@/lib/categories";
import { NavContext } from "@/lib/navContext";
import type { ScreenComponent } from "@/components/screens/types";

interface DbQuestion {
  legacy_id: string;
  question_text_th: string | null;
  question_text_en: string | null;
  options: { value: string; label_th: string | null; label_en: string | null }[] | null;
}

// Screens reskinned to the new design (Phase 3). Anything not listed falls back to the legacy
// QuestionScreen, so the flow stays end-to-end during the screen-by-screen migration.
const RESKINNED_SCREENS: Record<string, ScreenComponent> = {
  // Group A · พื้นฐาน (bespoke layouts)
  q4: NationalityScreen,
  q8: CountryScreen,
  q9: VisatypeScreen,
  // Group B · เดินทาง (visa-branch questions q10–q23, generic by field type)
  q10: DateScreen, q11: DateScreen, q13: DateScreen, q17: DateScreen, q18: DateScreen, q21: DateScreen, q39: DateScreen,
  q14: ChoiceScreen, q15: ChoiceScreen, q19: ChoiceScreen, q22: ChoiceScreen, q23: ChoiceScreen,
  q12: PriorVisasScreen, q16: MultiSelectScreen, q20: PriorVisasScreen,
  // Group C · อาชีพ (occupation + employment-document branches q24–q29)
  q24: OccupationScreen,
  q25: SegmentedScreen, q26: MultiSelectScreen, q27: SegmentedScreen, q28: SegmentedScreen,
  q29: ExpensesScreen,
  // Group C · คุณสมบัติ (q30 refused + q32 overstay combine their detail q31/q33 via advanceTo)
  q30: RefusedScreen, q32: OverstayScreen,
  q34: SavingsScreen,
  q35: TiesScreen,
  // Group C · ข้อมูลติดต่อ (contact merges q3/q5/q6/q36/q37 via advanceTo → q7 found → q2 summary)
  q3: ContactScreen,
  q7: IntentFoundScreen,
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

// Steps skipped based on the visa type: "อื่นๆ" has an arrival date but no return (q11), and
// students skip the savings step (q34). getNextId() walks past any skipped id to the next real one.
const SKIP_IF: Record<string, (a: Record<string, string>) => boolean> = {
  q11: (a) => a.q9 === "other",
  q34: (a) => a.q9 === "student",
};

export default function QuestionnairePage() {
  const router = useRouter();
  const { history, pos, answers, setAnswer, pushQuestion, popQuestion, goToIndex } = useFormStore();
  const [submitting, setSubmitting] = useState(false);
  const [direction, setDirection] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Lang>("th");
  const [loaderState, setLoaderState] = useState<{ cap: string; sub?: string } | null>(null);
  const [questionsMap, setQuestionsMap] = useState<Record<string, Question>>(QUESTIONS_MAP);
  const prevPosRef = useRef(pos);
  const loaderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/questions")
      .then((r) => r.json())
      .then((rows: DbQuestion[]) => {
        const merged: Record<string, Question> = { ...QUESTIONS_MAP };
        for (const row of rows) {
          const q = merged[row.legacy_id];
          if (!q) continue;
          merged[row.legacy_id] = {
            ...q,
            question: row.question_text_th ?? q.question,
            questionEn: row.question_text_en ?? q.questionEn,
            options: q.options?.map((opt) => {
              const dbOpt = row.options?.find((o) => o.value === opt.value);
              if (!dbOpt) return opt;
              return { ...opt, label: dbOpt.label_th ?? opt.label, labelEn: dbOpt.label_en ?? opt.labelEn };
            }),
          };
        }
        setQuestionsMap(merged);
      })
      .catch(() => {}); // silently fall back to local questions on error
  }, []);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setDirection(pos >= prevPosRef.current ? 1 : -1);
    prevPosRef.current = pos;
  }, [pos]);

  if (!mounted) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  );

  const currentId = history[pos];
  const question = questionsMap[currentId];

  if (!question) return null;

  function rawNextId(id: string, a: Record<string, string>): string | undefined {
    const q = questionsMap[id];
    if (!q) return undefined;
    const selectedOption = q.options?.find((o) => o.value === a[id]);
    if (selectedOption && Object.prototype.hasOwnProperty.call(selectedOption, "nextId")) {
      return selectedOption.nextId;
    }
    return q.defaultNextId;
  }

  function getNextId(): string | undefined {
    const a = useFormStore.getState().answers;
    let nextId = rawNextId(currentId, a);
    const seen = new Set<string>();
    while (nextId && SKIP_IF[nextId]?.(a) && !seen.has(nextId)) {
      seen.add(nextId);
      nextId = rawNextId(nextId, a);
    }
    return nextId;
  }

  function handleNext() {
    const nextId = getNextId();
    if (!nextId) {
      handleSubmit();
      return;
    }
    const loader = PHASE_END_LOADER[currentId];
    const reWalking = pos < history.length - 1 && history[pos + 1] === nextId;
    if (loader && !reWalking) {
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

  // Clicking a category box moves the cursor to that category's first visited question (both ways).
  function handleJump(categoryIndex: number) {
    const idx = history.findIndex((id) => categoryIndexOf(id) === categoryIndex);
    if (idx < 0 || idx === pos) return;
    if (loaderTimer.current) clearTimeout(loaderTimer.current);
    setLoaderState(null);
    goToIndex(idx);
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
  if (!Reskinned) return null; // every rendered question maps to a reskinned screen

  const { boxes, activeIndex } = computeBoxes(currentId);
  const reachedMax = Math.max(0, ...history.map((id) => categoryIndexOf(id)));
  return (
    <NavContext.Provider value={{ onJump: handleJump, reachedMax, direction }}>
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
        isFirst={pos === 0}
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
