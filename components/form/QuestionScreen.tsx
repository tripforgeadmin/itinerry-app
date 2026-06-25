"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ItinerryLogo } from "@/components/ItinerryLogo";
import type { Question } from "@/lib/questions";
import type { Answers } from "@/store/formStore";

interface QuestionScreenProps {
  question: Question;
  sectionTitle: string;
  sectionEmoji: string;
  qIndex: number;
  totalQ: number;
  answers: Answers;
  onAnswer: (key: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  direction: number;
  submitting?: boolean;
}

const variants = {
  enter: (d: number) => ({ x: d > 0 ? "50%" : "-50%", opacity: 0, scale: 0.96 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (d: number) => ({ x: d > 0 ? "-30%" : "30%", opacity: 0, scale: 0.96 }),
};

export function QuestionScreen({
  question,
  sectionTitle,
  sectionEmoji,
  qIndex,
  totalQ,
  answers,
  onAnswer,
  onNext,
  onBack,
  isFirst,
  isLast,
  direction,
  submitting,
}: QuestionScreenProps) {
  const value = answers[question.id] as string | undefined;
  const isAnswered =
    question.type === "consent" ? value === "true" : value !== undefined && value !== "";
  const pct = Math.round(((qIndex + 1) / totalQ) * 100);

  function handleSelect(v: string) {
    onAnswer(question.id, v);
    if (question.type === "radio" || question.type === "dropdown") {
      setTimeout(() => onNext(), 300);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">

      {/* Header */}
      <div className="px-5 pt-5 pb-4 bg-card border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <ItinerryLogo size="sm" />
          <span className="text-xs text-muted font-medium bg-surface px-2.5 py-1 rounded-full">
            {qIndex + 1} / {totalQ}
          </span>
        </div>
        {/* Progress */}
        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #44a8db, #00c3ff)" }}
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        {/* Section tag */}
        <div className="flex items-center gap-1.5 mt-2.5">
          <span className="text-sm">{sectionEmoji}</span>
          <span className="text-xs font-semibold text-accent">{sectionTitle}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={question.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col px-5 pt-6 pb-4 gap-5"
          >
            {/* Question */}
            <div>
              <h2 className="text-xl font-bold text-primary leading-snug">
                {question.question}
                {question.required && <span className="text-red-alert ml-1 text-base">*</span>}
              </h2>
              {question.questionEn && (
                <p className="text-xs text-muted mt-1">{question.questionEn}</p>
              )}
            </div>

            {/* Inputs */}
            <div className="flex flex-col gap-2.5">

              {/* Text / Email / Tel */}
              {(question.type === "text" || question.type === "email" || question.type === "tel") && (
                <>
                  <input
                    type={question.type}
                    value={value ?? ""}
                    onChange={(e) => onAnswer(question.id, e.target.value)}
                    placeholder={question.placeholder}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter" && isAnswered) onNext(); }}
                    className="w-full px-4 py-4 rounded-2xl border-2 border-border bg-card text-primary placeholder:text-muted-soft text-base focus:outline-none focus:border-accent transition-colors"
                  />
                  {isAnswered && (
                    <motion.button
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={onNext}
                      className="self-start px-6 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95"
                      style={{ background: "#ffd166", color: "#1b3d5c" }}
                    >
                      ถัดไป →
                    </motion.button>
                  )}
                </>
              )}

              {/* Radio / Dropdown as cards */}
              {(question.type === "radio" || question.type === "dropdown") && (
                <div className="flex flex-col gap-2">
                  {question.options?.map((opt, i) => (
                    <motion.button
                      key={opt.value}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.2 }}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={[
                        "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98] font-medium text-sm",
                        value === opt.value
                          ? "border-accent bg-accent-bg text-primary shadow-card"
                          : "border-border bg-card text-primary-mid hover:border-accent-tint",
                      ].join(" ")}
                    >
                      <span className={[
                        "w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all",
                        value === opt.value ? "border-accent" : "border-border",
                      ].join(" ")}>
                        {value === opt.value && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2.5 h-2.5 rounded-full bg-accent"
                          />
                        )}
                      </span>
                      {opt.emoji && <span className="text-lg">{opt.emoji}</span>}
                      <span>{opt.label}</span>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Consent */}
              {question.type === "consent" && (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => onAnswer(question.id, value === "true" ? "false" : "true")}
                    className={[
                      "w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all",
                      value === "true" ? "border-accent bg-accent-bg" : "border-border bg-card",
                    ].join(" ")}
                  >
                    <span className={[
                      "mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all",
                      value === "true" ? "bg-accent border-accent" : "border-border",
                    ].join(" ")}>
                      {value === "true" && (
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <path d="M1.5 5.5l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm text-primary-mid leading-relaxed">{question.question}</span>
                  </button>
                  {isAnswered && (
                    <motion.button
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={onNext}
                      disabled={submitting}
                      className="self-start px-6 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60"
                      style={{ background: "#ffd166", color: "#1b3d5c" }}
                    >
                      {submitting ? "กำลังส่ง..." : isLast ? "ส่งข้อมูล ✓" : "ถัดไป →"}
                    </motion.button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Back button */}
      {!isFirst && (
        <div className="px-5 py-4 border-t border-border bg-card">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-muted text-sm hover:text-primary transition-colors"
          >
            ← ย้อนกลับ
          </button>
        </div>
      )}
    </div>
  );
}
