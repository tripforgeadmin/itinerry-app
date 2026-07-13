"use client";

import type { Question } from "@/lib/questions";
import type { Lang } from "@/lib/i18n";

// Shared field primitives for the manual-entry form — each renders its label/options
// straight from a lib/questions.ts Question, so admin copy never drifts from the real
// customer-facing catalog. Plain controlled inputs, no wizard/ScreenProps coupling.

function qLabel(q: Question, lang: Lang): string {
  return lang === "en" && q.questionEn ? q.questionEn : q.question;
}
function optLabel(o: { label: string; labelEn?: string }, lang: Lang): string {
  return lang === "en" && o.labelEn ? o.labelEn : o.label;
}

export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

export function RadioGroup({
  question,
  value,
  onChange,
  lang,
  otherValue,
  onOtherChange,
}: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
  lang: Lang;
  otherValue?: string;
  onOtherChange?: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {qLabel(question, lang)}
        {question.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {question.options?.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              value === opt.value
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
            }`}
          >
            {opt.emoji ? `${opt.emoji} ` : ""}
            {optLabel(opt, lang)}
          </button>
        ))}
      </div>
      {question.allowOtherText && value === "other" && onOtherChange && (
        <input
          type="text"
          value={otherValue ?? ""}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder={lang === "en" ? question.otherPlaceholderEn ?? question.otherPlaceholder : question.otherPlaceholder}
          className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      )}
    </div>
  );
}

export function MultiCheckboxGroup({
  question,
  value,
  onChange,
  lang,
  exclusiveValue,
}: {
  question: Question;
  value: string; // comma-joined
  onChange: (v: string) => void;
  lang: Lang;
  /** e.g. "none"/"never" — selecting it clears everything else and vice versa. */
  exclusiveValue?: string;
}) {
  const selected = value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
  function toggle(v: string) {
    let next: string[];
    if (exclusiveValue && v === exclusiveValue) {
      next = selected.includes(v) ? [] : [v];
    } else {
      const withoutExclusive = selected.filter((s) => s !== exclusiveValue);
      next = withoutExclusive.includes(v) ? withoutExclusive.filter((s) => s !== v) : [...withoutExclusive, v];
    }
    onChange(next.join(", "));
  }
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {qLabel(question, lang)}
        {question.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {question.options?.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              selected.includes(opt.value)
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
            }`}
          >
            {opt.emoji ? `${opt.emoji} ` : ""}
            {optLabel(opt, lang)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DateInput({
  question,
  value,
  onChange,
  lang,
  min,
}: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
  lang: Lang;
  min?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {qLabel(question, lang)}
        {question.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

export function TextInput({
  question,
  value,
  onChange,
  lang,
  type = "text",
}: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
  lang: Lang;
  type?: "text" | "email" | "tel";
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {qLabel(question, lang)}
        {question.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={lang === "en" ? question.placeholderEn ?? question.placeholder : question.placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}
