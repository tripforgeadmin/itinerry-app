"use client";

import { motion, AnimatePresence } from "framer-motion";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { ItinerryLogo } from "@/components/ItinerryLogo";
import type { Question } from "@/lib/questions";
import type { Answers } from "@/store/formStore";

export type Lang = "th" | "en";

function CircularProgress({ current }: { current: number }) {
  const size = 36;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const MAX_VISIBLE = 20;
  const progress = circumference - (Math.min(current, MAX_VISIBLE) / MAX_VISIBLE) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--color-border)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="#44a8db" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: progress }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-accent">
        {current}
      </span>
    </div>
  );
}

interface QuestionScreenProps {
  question: Question;
  sectionTitle: string;
  sectionTitleEn?: string;
  sectionEmoji: string;
  qIndex: number;
  answers: Answers;
  lang: Lang;
  onLangChange: (l: Lang) => void;
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

function getValidationError(question: Question, value: string | undefined): string | null {
  if (!value || value === "") return null;

  if (question.id === "q3") {
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (words.length < 2) return "กรุณากรอกชื่อและนามสกุล";
  }

  if (question.type === "tel") {
    const digits = value.replace(/[\s\-\(\)]/g, "");
    if (!/^(0[6-9]\d{8}|0[2-8]\d{7,8}|\+?66[6-9]\d{8})$/.test(digits))
      return "รูปแบบเบอร์โทรไม่ถูกต้อง เช่น 0812345678";
  }

  if (question.type === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
      return "รูปแบบอีเมลไม่ถูกต้อง เช่น name@email.com";
  }

  return null;
}

function formatDateDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${parseInt(y) + 543}`;
}

export function QuestionScreen({
  question,
  sectionTitle,
  sectionTitleEn,
  sectionEmoji,
  qIndex,
  answers,
  lang,
  onLangChange,
  onAnswer,
  onNext,
  onBack,
  isFirst,
  isLast,
  direction,
  submitting,
}: QuestionScreenProps) {
  const value = answers[question.id];
  const otherText = answers[question.id + "_other"];
  const validationError = getValidationError(question, value);

  const selectedMulti = question.type === "multiCheckbox"
    ? (value ? value.split(", ").filter(Boolean) : [])
    : [];

  const isAnswered = (() => {
    if (question.type === "consent") return value === "true";
    if (question.type === "multiCheckbox") return selectedMulti.length > 0;
    if (question.type === "date") return Boolean(value);
    if (question.allowOtherText && value === "other") return Boolean(otherText?.trim());
    return value !== undefined && value !== "" && validationError === null;
  })();

  function handleSelect(v: string) {
    onAnswer(question.id, v);
    const skipAutoAdvance = question.allowOtherText && v === "other";
    if ((question.type === "radio" || question.type === "dropdown") && !skipAutoAdvance) {
      setTimeout(() => onNext(), 300);
    }
  }

  function toggleMulti(optVal: string) {
    const current = value ? value.split(", ").filter(Boolean) : [];
    const next = current.includes(optVal)
      ? current.filter((v) => v !== optVal)
      : [...current, optVal];
    onAnswer(question.id, next.join(", "));
  }

  const selectedDate = (() => {
    if (!value) return undefined;
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  })();

  const nextBtnLabel = submitting
    ? (lang === "en" ? "Submitting..." : "กำลังส่ง...")
    : isLast
      ? (lang === "en" ? "Submit ✓" : "ส่งข้อมูล ✓")
      : (lang === "en" ? "Next →" : "ถัดไป →");

  return (
    <div className="min-h-screen flex flex-col bg-surface">

      {/* Header */}
      <div className="px-5 pt-5 pb-4 bg-card border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <ItinerryLogo size="sm" />
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-border overflow-hidden text-xs font-bold">
              <button
                onClick={() => onLangChange("th")}
                className={`px-2.5 py-1 transition-colors ${lang === "th" ? "bg-accent text-white" : "text-muted hover:text-primary"}`}
              >
                TH
              </button>
              <button
                onClick={() => onLangChange("en")}
                className={`px-2.5 py-1 transition-colors ${lang === "en" ? "bg-accent text-white" : "text-muted hover:text-primary"}`}
              >
                EN
              </button>
            </div>
            {question.type === "consent" ? (
              <span className="text-xl">📋</span>
            ) : (
              <CircularProgress current={qIndex} />
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2.5">
          <span className="text-sm">{sectionEmoji}</span>
          <span className="text-xs font-semibold text-accent">
            {lang === "en" && sectionTitleEn ? sectionTitleEn : sectionTitle}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
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
            {/* Question text */}
            <div>
              <h2 className="text-xl font-bold text-primary leading-snug">
                {lang === "en" && question.questionEn ? question.questionEn : question.question}
                {question.required && <span className="text-red-alert ml-1 text-base">*</span>}
              </h2>
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
                    placeholder={lang === "en" && question.placeholderEn ? question.placeholderEn : question.placeholder}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter" && isAnswered) onNext(); }}
                    className={[
                      "w-full px-4 py-4 rounded-2xl border-2 bg-card text-primary placeholder:text-muted-soft text-base focus:outline-none transition-colors",
                      validationError && value ? "border-red-alert focus:border-red-alert" : "border-border focus:border-accent",
                    ].join(" ")}
                  />
                  {validationError && value && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-alert font-medium px-1"
                    >
                      {validationError}
                    </motion.p>
                  )}
                  {isAnswered && (
                    <motion.button
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={onNext}
                      className="self-start px-6 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95"
                      style={{ background: "#ffd166", color: "#1b3d5c" }}
                    >
                      {nextBtnLabel}
                    </motion.button>
                  )}
                </>
              )}

              {/* Radio / Dropdown */}
              {(question.type === "radio" || question.type === "dropdown") && (
                <div className="grid grid-cols-2 gap-2">
                  {question.options?.map((opt, i) => (
                    <motion.button
                      key={opt.value}
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04, duration: 0.2 }}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={[
                        "flex flex-col items-center justify-center gap-1.5 px-3 py-4 rounded-2xl border-2 text-center transition-all active:scale-[0.97] font-medium text-sm",
                        value === opt.value
                          ? "border-accent bg-accent-bg text-primary shadow-card"
                          : "border-border bg-card text-primary-mid hover:border-accent-tint",
                      ].join(" ")}
                    >
                      {opt.emoji && <span className="text-2xl">{opt.emoji}</span>}
                      <span className="leading-tight text-xs">
                        {lang === "en" && opt.labelEn ? opt.labelEn : opt.label}
                      </span>
                      {value === opt.value && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 rounded-full bg-accent mt-0.5"
                        />
                      )}
                    </motion.button>
                  ))}

                  {/* Other text input */}
                  {question.allowOtherText && value === "other" && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="col-span-2 mt-1"
                    >
                      <input
                        type="text"
                        value={otherText ?? ""}
                        onChange={(e) => onAnswer(question.id + "_other", e.target.value)}
                        placeholder={
                          lang === "en" && question.otherPlaceholderEn
                            ? question.otherPlaceholderEn
                            : question.otherPlaceholder ?? "ระบุข้อมูล"
                        }
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter" && isAnswered) onNext(); }}
                        className="w-full px-4 py-4 rounded-2xl border-2 border-accent bg-card text-primary placeholder:text-muted-soft text-base focus:outline-none focus:border-accent transition-colors"
                      />
                    </motion.div>
                  )}

                  {question.allowOtherText && value === "other" && isAnswered && (
                    <motion.button
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={onNext}
                      className="col-span-2 self-start px-6 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95"
                      style={{ background: "#ffd166", color: "#1b3d5c" }}
                    >
                      {nextBtnLabel}
                    </motion.button>
                  )}
                </div>
              )}

              {/* Multi Checkbox */}
              {question.type === "multiCheckbox" && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    {question.options?.map((opt, i) => {
                      const checked = selectedMulti.includes(opt.value);
                      return (
                        <motion.button
                          key={opt.value}
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03, duration: 0.2 }}
                          type="button"
                          onClick={() => toggleMulti(opt.value)}
                          className={[
                            "flex flex-col items-center justify-center gap-1.5 px-3 py-3 rounded-2xl border-2 text-center transition-all active:scale-[0.97] font-medium",
                            checked
                              ? "border-accent bg-accent-bg text-primary shadow-card"
                              : "border-border bg-card text-primary-mid hover:border-accent-tint",
                          ].join(" ")}
                        >
                          {opt.emoji && <span className="text-xl">{opt.emoji}</span>}
                          <span className="leading-tight text-xs">
                            {lang === "en" && opt.labelEn ? opt.labelEn : opt.label}
                          </span>
                          {checked && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 rounded-full bg-accent"
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                  <motion.button
                    animate={{ opacity: isAnswered ? 1 : 0.4 }}
                    onClick={() => { if (isAnswered) onNext(); }}
                    disabled={!isAnswered || submitting}
                    className="self-start px-6 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:cursor-not-allowed"
                    style={{ background: "#ffd166", color: "#1b3d5c" }}
                  >
                    {nextBtnLabel}
                  </motion.button>
                </div>
              )}

              {/* Date Picker */}
              {question.type === "date" && (
                <div className="flex flex-col gap-3">
                  {value && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-bg border border-accent"
                    >
                      <span className="text-base">📅</span>
                      <span className="text-sm font-semibold text-accent">{formatDateDisplay(value)}</span>
                    </motion.div>
                  )}
                  <div className="rounded-2xl overflow-hidden border border-border bg-card">
                    <style>{`
                      .rdp-root {
                        --rdp-accent-color: #44a8db;
                        --rdp-accent-background-color: rgba(68,168,219,0.12);
                        --rdp-font-family: inherit;
                        width: 100%;
                      }
                      .rdp-month_caption { color: var(--color-primary); font-weight: 700; }
                      .rdp-weekday { color: var(--color-muted); font-size: 0.7rem; }
                      .rdp-day_button { color: var(--color-primary-mid); }
                      .rdp-day_button:hover { background: var(--rdp-accent-background-color); }
                      .rdp-nav button { color: var(--color-muted); }
                      .rdp-day[data-outside] .rdp-day_button { color: var(--color-muted-soft); }
                      .rdp-dropdown select { background: var(--color-card); color: var(--color-primary); border: 1px solid var(--color-border); border-radius: 8px; padding: 2px 6px; }
                    `}</style>
                    <DayPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                          onAnswer(question.id, iso);
                        }
                      }}
                      captionLayout="dropdown"
                      startMonth={new Date(2025, 0)}
                      endMonth={new Date(2029, 11)}
                    />
                  </div>
                  <motion.button
                    animate={{ opacity: isAnswered ? 1 : 0.4 }}
                    onClick={() => { if (isAnswered) onNext(); }}
                    disabled={!isAnswered || submitting}
                    className="self-start px-6 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:cursor-not-allowed"
                    style={{ background: "#ffd166", color: "#1b3d5c" }}
                  >
                    {nextBtnLabel}
                  </motion.button>
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
                    <span className="text-sm text-primary-mid leading-relaxed">
                      {lang === "en" && question.questionEn ? question.questionEn : question.question}
                    </span>
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
                      {nextBtnLabel}
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
            {lang === "en" ? "← Back" : "← ย้อนกลับ"}
          </button>
        </div>
      )}
    </div>
  );
}
