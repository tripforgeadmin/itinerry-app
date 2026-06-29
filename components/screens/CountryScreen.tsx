"use client";

import { useRef, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { QuestionShell } from "@/components/screens/QuestionShell";
import type { ScreenProps } from "@/components/screens/types";

// q8 values that have a flag in /public/flags (everything except "other").
const HAS_FLAG = new Set([
  "schengen", "uk", "usa", "canada", "australia", "nz", "japan",
  "korea", "china", "taiwan", "india", "dubai", "saudi", "qatar",
]);

/** Screen 3 · country (q8) — searchable flag grid; auto-advance on pick (defaultNextId → visatype). */
export function CountryScreen({
  question,
  value,
  onAnswer,
  onNext,
  onBack,
  isFirst,
  lang,
  onLangChange,
  boxes,
  activeIndex,
}: ScreenProps) {
  const [query, setQuery] = useState("");
  const advancing = useRef(false);

  const opts = question.options ?? [];
  const q = query.trim().toLowerCase();
  const filtered = q
    ? opts.filter((o) => `${o.label} ${o.labelEn ?? ""} ${o.value}`.toLowerCase().includes(q))
    : opts;

  function select(v: string) {
    onAnswer(question.id, v);
    if (!advancing.current) {
      advancing.current = true;
      setTimeout(() => {
        advancing.current = false;
        onNext();
      }, 360);
    }
  }

  return (
    <QuestionShell
      boxes={boxes}
      activeIndex={activeIndex}
      isFirst={isFirst}
      onBack={onBack}
      lang={lang}
      onLangChange={onLangChange}
      screenKey={question.id}
      title={lang === "th" ? "จะยื่นวีซ่าประเทศไหน?" : "Which country?"}
      subtitle={lang === "th" ? "ค้นหาหรือเลือกประเทศปลายทาง" : "Search or pick your destination"}
      footerHint="แตะเพื่อเลือกและไปต่อ"
    >
      <div className="relative mb-4">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-soft">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={lang === "th" ? "ค้นหาประเทศ..." : "Search country..."}
          className="w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-4 text-primary outline-none transition-colors placeholder:text-muted-soft focus:border-accent"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-soft">
          {lang === "th" ? "ไม่พบประเทศที่ค้นหา" : "No country found"}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((o) => (
            <GlassCard key={o.value} selected={value === o.value} onSelect={() => select(o.value)}>
              <div className="flex flex-col items-center gap-2 p-3 text-center">
                {HAS_FLAG.has(o.value) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/flags/${o.value}.png`} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-bg text-3xl">🌍</span>
                )}
                <p className="line-clamp-2 text-sm font-bold leading-tight text-primary">
                  {lang === "th" ? o.label : o.labelEn ?? o.label}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </QuestionShell>
  );
}
