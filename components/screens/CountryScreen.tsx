"use client";

import { useMemo, useRef, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { QuestionShell } from "@/components/screens/QuestionShell";
import { sortedCountries, flagEmoji, type Country } from "@/lib/countries";
import { useTypewriter } from "@/lib/useTypewriter";
import type { ScreenProps } from "@/components/screens/types";

const OTHER = "other";
const EXAMPLES_TH = ["ญี่ปุ่น", "อังกฤษ", "สหรัฐฯ", "ออสเตรเลีย", "เกาหลีใต้", "แคนาดา"];
const EXAMPLES_EN = ["Japan", "UK", "USA", "Australia", "Korea", "Canada"];

/** Screen 3 · country (q8) — searchable flag grid (ISO-coded cards). Tapping "อื่นๆ" reveals a
 * searchable list of every remaining country (Thai/English search). Auto-advance on pick. */
export function CountryScreen({
  question,
  value,
  onAnswer,
  onOther,
  onNext,
  onBack,
  isFirst,
  lang,
  onLangChange,
  boxes,
  activeIndex,
}: ScreenProps) {
  const [query, setQuery] = useState("");
  const [otherMode, setOtherMode] = useState(false);
  const advancing = useRef(false);
  const typedExample = useTypewriter(lang === "th" ? EXAMPLES_TH : EXAMPLES_EN);

  const opts = question.options ?? [];
  const cardCodes = useMemo(
    () => new Set(opts.filter((o) => o.value !== OTHER).map((o) => o.value.toUpperCase())),
    [opts]
  );
  const otherList = useMemo(() => sortedCountries(lang).filter((c) => !cardCodes.has(c.code)), [cardCodes, lang]);

  const q = query.trim().toLowerCase();
  const filteredCards = q
    ? opts.filter((o) => `${o.label} ${o.labelEn ?? ""} ${o.value}`.toLowerCase().includes(q))
    : opts;
  const filteredOther = q
    ? otherList.filter((c) => `${c.th} ${c.en} ${c.code}`.toLowerCase().includes(q))
    : otherList;

  function advance(v: string) {
    onAnswer(question.id, v);
    if (!advancing.current) {
      advancing.current = true;
      setTimeout(() => {
        advancing.current = false;
        onNext();
      }, 360);
    }
  }

  function onCardTap(v: string) {
    if (v === OTHER) {
      setOtherMode(true);
      setQuery("");
    } else {
      advance(v);
    }
  }

  function pickOther(c: Country) {
    onOther(lang === "th" ? c.th : c.en);
    advance(c.code.toLowerCase());
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
          placeholder={
            query
              ? ""
              : lang === "th"
                ? `ค้นหาประเทศ เช่น ${typedExample}`
                : `Search country, e.g. ${typedExample}`
          }
          className="w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-4 text-primary outline-none transition-colors placeholder:text-muted-soft focus:border-accent"
        />
      </div>

      {otherMode ? (
        <>
          <button
            type="button"
            onClick={() => {
              setOtherMode(false);
              setQuery("");
            }}
            className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-accent"
          >
            ← {lang === "th" ? "กลับไปประเทศแนะนำ" : "Back to suggested"}
          </button>
          {filteredOther.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-soft">{lang === "th" ? "ไม่พบประเทศที่ค้นหา" : "No country found"}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredOther.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => pickOther(c)}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-accent active:scale-[0.99]"
                >
                  <span className="text-2xl leading-none">{flagEmoji(c.code)}</span>
                  <span className="font-semibold text-primary">{lang === "th" ? c.th : c.en}</span>
                  <span className="truncate text-sm text-muted-soft">{lang === "th" ? c.en : c.th}</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : filteredCards.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-soft">{lang === "th" ? "ไม่พบประเทศที่ค้นหา" : "No country found"}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredCards.map((o) => (
            <GlassCard key={o.value} selected={value === o.value} onSelect={() => onCardTap(o.value)}>
              <div className="flex flex-col items-center gap-2 p-3 text-center">
                {o.value === OTHER ? (
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-bg text-3xl">🌍</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/flags/${o.value}.png`} alt="" className="h-14 w-14 rounded-full object-cover" />
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
