"use client";

import { motion, AnimatePresence } from "framer-motion";
import { OptionButton } from "./OptionButton";
import type { Step } from "@/lib/questions";
import type { Answers } from "@/store/formStore";

interface StepCardProps {
  step: Step;
  stepIndex: number;
  answers: Answers;
  onAnswer: (key: string, value: string | string[]) => void;
  onNext: () => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  direction: number;
  submitting?: boolean;
}

const variants = {
  enter: (d: number) => ({ x: d > 0 ? "60%" : "-60%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? "-60%" : "60%", opacity: 0 }),
};

export function StepCard({
  step,
  stepIndex,
  answers,
  onAnswer,
  onNext,
  onBack,
  isFirst,
  isLast,
  direction,
  submitting,
}: StepCardProps) {
  const isStepValid = step.questions
    .filter((q) => q.required)
    .every((q) => {
      const val = answers[q.id];
      if (q.type === "consent") return val === "true";
      return val !== undefined && val !== "";
    });

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={step.id + stepIndex}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="w-full"
      >
        <div className="bg-card rounded-container shadow-card px-6 py-8 flex flex-col gap-6">
          {/* Step title */}
          <div>
            <h2 className="text-lg font-bold text-primary leading-snug">{step.title}</h2>
            {step.titleEn && (
              <p className="text-xs text-muted mt-0.5">{step.titleEn}</p>
            )}
          </div>

          {/* Questions */}
          <div className="flex flex-col gap-6">
            {step.questions.map((q) => (
              <div key={q.id} className="flex flex-col gap-3">
                <label className="font-semibold text-sm text-primary leading-snug">
                  {q.question}
                  {q.required && <span className="text-red-alert ml-1">*</span>}
                </label>
                {q.questionEn && (
                  <p className="text-xs text-muted -mt-2">{q.questionEn}</p>
                )}

                {/* Text / Email / Tel */}
                {(q.type === "text" || q.type === "email" || q.type === "tel") && (
                  <input
                    type={q.type}
                    value={(answers[q.id] as string) ?? ""}
                    onChange={(e) => onAnswer(q.id, e.target.value)}
                    placeholder={q.placeholder}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-surface text-primary placeholder:text-muted-soft text-sm focus:outline-none focus:border-accent transition-colors"
                  />
                )}

                {/* Dropdown */}
                {q.type === "dropdown" && (
                  <select
                    value={(answers[q.id] as string) ?? ""}
                    onChange={(e) => onAnswer(q.id, e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-surface text-primary text-sm focus:outline-none focus:border-accent transition-colors appearance-none"
                  >
                    <option value="">เลือก...</option>
                    {q.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {/* Radio */}
                {q.type === "radio" && (
                  <div className="flex flex-col gap-2">
                    {q.options?.map((opt) => (
                      <OptionButton
                        key={opt.value}
                        label={opt.label}
                        emoji={opt.emoji}
                        selected={answers[q.id] === opt.value}
                        onClick={() => onAnswer(q.id, opt.value)}
                      />
                    ))}
                  </div>
                )}

                {/* Consent checkbox */}
                {q.type === "consent" && (
                  <button
                    type="button"
                    onClick={() =>
                      onAnswer(q.id, answers[q.id] === "true" ? "false" : "true")
                    }
                    className="flex items-start gap-3 text-left"
                  >
                    <span
                      className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                        answers[q.id] === "true"
                          ? "bg-accent border-accent"
                          : "border-border"
                      }`}
                    >
                      {answers[q.id] === "true" && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm text-primary-mid leading-relaxed">{q.question}</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            {!isFirst && (
              <button
                type="button"
                onClick={onBack}
                className="flex-1 py-3.5 rounded-2xl border-2 border-border text-primary-mid font-semibold text-sm hover:border-accent-tint transition-colors"
              >
                ← ย้อนกลับ
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              disabled={!isStepValid || submitting}
              className={[
                "flex-1 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98]",
                isStepValid && !submitting
                  ? "bg-yellow text-on-yellow hover:bg-yellow-hover shadow-card"
                  : "bg-border text-muted cursor-not-allowed",
              ].join(" ")}
            >
              {submitting ? "กำลังส่ง..." : isLast ? "ส่งข้อมูล ✓" : "ถัดไป →"}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
