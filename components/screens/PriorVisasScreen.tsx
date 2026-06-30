"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { QuestionShell } from "@/components/screens/QuestionShell";
import { COUNTRIES, flagEmoji, type Country } from "@/lib/countries";
import type { ScreenProps } from "@/components/screens/types";

const EXCLUSIVE = "never";
const MAX_ADDED = 100;

function parse(v: string): string[] {
  return v ? v.split(", ").filter(Boolean) : [];
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

/**
 * Prior-visa history (q12 / q20). Preset flag chips + a repeatable "เพิ่มประเทศอื่น" picker: any
 * extra country (ISO code, lowercase) is appended straight into the answer value (so it's saved on
 * submit), up to MAX_ADDED. The picker flips above the button when it would overflow the viewport.
 */
export function PriorVisasScreen({
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
  const options = question.options ?? [];
  const knownValues = useMemo(() => new Set(options.map((o) => o.value)), [options]);
  const selected = parse(value);
  const addedCodes = selected.filter((c) => !knownValues.has(c));

  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [query, setQuery] = useState("");
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const setSel = (next: string[]) => onAnswer(question.id, next.join(", "));

  function toggleKnown(v: string) {
    if (v === EXCLUSIVE) {
      setSel(selected.includes(v) ? [] : [v]);
      return;
    }
    const base = selected.filter((x) => x !== EXCLUSIVE);
    setSel(base.includes(v) ? base.filter((x) => x !== v) : [...base, v]);
  }

  function openDropdown() {
    const rect = addRef.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      setOpenUp(below < 340 && rect.top > below); // flip up when little room below
    }
    setQuery("");
    setOpen(true);
  }

  function addCountry(c: Country) {
    const code = c.code.toLowerCase();
    setOpen(false);
    if (selected.includes(code) || addedCodes.length >= MAX_ADDED) return;
    setSel([...selected.filter((x) => x !== EXCLUSIVE), code]);
  }

  const filtered = useMemo(() => {
    const picked = new Set(selected);
    const q = query.trim().toLowerCase();
    const list = COUNTRIES.filter((c) => !picked.has(c.code.toLowerCase()));
    return (q ? list.filter((c) => `${c.th} ${c.en} ${c.code}`.toLowerCase().includes(q)) : list).slice(0, 60);
  }, [query, selected]);

  const atMax = addedCodes.length >= MAX_ADDED;
  const gateOk = selected.length > 0;

  return (
    <QuestionShell
      boxes={boxes}
      activeIndex={activeIndex}
      isFirst={isFirst}
      onBack={onBack}
      lang={lang}
      onLangChange={onLangChange}
      screenKey={question.id}
      title={lang === "th" ? question.question : question.questionEn ?? question.question}
      subtitle="UK · Schengen · USA · Canada · Australia · NZ"
      footer={
        <Button disabled={!gateOk} onClick={onNext}>
          {lang === "th" ? "ถัดไป" : "Next"}
        </Button>
      }
    >
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-success-bg px-4 py-2.5 text-sm font-semibold text-success-deep">
        <span aria-hidden>✓</span>
        <span>
          {lang === "th"
            ? "เลือกที่เคยได้ — ยิ่งมีประวัติยิ่งดีต่อเคส"
            : "Pick all you've had — more history helps your case"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggleKnown(o.value)}
              className={
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors active:scale-[0.97] " +
                (on ? "border-accent bg-accent-subtle text-accent-hover" : "border-border-mid bg-card text-primary hover:border-accent")
              }
            >
              {on && <Check />}
              {o.emoji && <span className="text-base leading-none">{o.emoji}</span>}
              {lang === "th" ? o.label : o.labelEn ?? o.label}
            </button>
          );
        })}
      </div>

      {/* extra countries the user added (removable) */}
      {addedCodes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2.5">
          {addedCodes.map((code) => {
            const c = COUNTRIES.find((x) => x.code.toLowerCase() === code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => setSel(selected.filter((x) => x !== code))}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent bg-accent-subtle px-3.5 py-2 text-sm font-semibold text-accent-hover active:scale-[0.97]"
              >
                <span className="text-base leading-none">{c ? flagEmoji(c.code) : "🏳️"}</span>
                {c ? (lang === "th" ? c.th : c.en) : code.toUpperCase()}
                <span className="ml-0.5 text-base leading-none">×</span>
              </button>
            );
          })}
        </div>
      )}

      {/* add-another-country picker (flips up near the bottom of the screen) */}
      <div ref={addRef} className="relative mt-3">
        <button
          type="button"
          disabled={atMax}
          onClick={() => (open ? setOpen(false) : openDropdown())}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border-mid px-3.5 py-2 text-sm font-semibold text-primary-mid transition-colors hover:border-accent disabled:opacity-50"
        >
          <span className="text-base leading-none">＋</span>
          {lang === "th" ? "เพิ่มประเทศอื่น" : "Add another country"}
        </button>
        {atMax && (
          <p className="mt-1.5 text-xs text-muted-soft">
            {lang === "th" ? `เพิ่มได้สูงสุด ${MAX_ADDED} ประเทศ` : `Max ${MAX_ADDED} countries`}
          </p>
        )}
        {open && (
          <div
            className={
              "absolute left-0 z-50 w-72 max-w-[88vw] rounded-2xl border border-border bg-card shadow-card " +
              (openUp ? "bottom-full mb-2" : "top-full mt-2")
            }
          >
            <div className="p-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={lang === "th" ? "ค้นหาประเทศ..." : "Search country..."}
                className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-primary outline-none placeholder:text-muted-soft focus:border-accent"
              />
            </div>
            <ul className="max-h-[40vh] overflow-y-auto pb-1">
              {filtered.length === 0 ? (
                <li className="px-4 py-3 text-sm text-muted-soft">{lang === "th" ? "ไม่พบประเทศ" : "No country found"}</li>
              ) : (
                filtered.map((c) => (
                  <li key={c.code}>
                    <button
                      type="button"
                      onClick={() => addCountry(c)}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-accent-bg"
                    >
                      <span className="text-base leading-none">{flagEmoji(c.code)}</span>
                      <span className="font-medium text-primary">{lang === "th" ? c.th : c.en}</span>
                      <span className="truncate text-xs text-muted-soft">{lang === "th" ? c.en : c.th}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot/itin_main.png" alt="" className="h-36 w-36 object-contain" />
      </div>
    </QuestionShell>
  );
}
