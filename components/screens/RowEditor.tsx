"use client";

import { ChoiceRow } from "@/components/ui/ChoiceRow";
import { TextField } from "@/components/ui/TextField";
import { DateCalendar } from "@/components/ui/DateCalendar";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { RevealBlock } from "@/components/ui/RevealBlock";
import { CountryHistoryEditor, type HistoryEntry } from "@/components/screens/CountryHistoryEditor";
import { QUESTIONS_MAP } from "@/lib/questions";
import { DIAL_CODES, DEFAULT_DIAL_CODE } from "@/lib/dialCodes";
import { flagEmoji } from "@/lib/countries";
import type { Lang } from "@/components/ui/LangToggle";

interface Props {
  qid: string;
  answers: Record<string, string>;
  onAnswer: (key: string, value: string) => void;
  lang: Lang;
}

const EXCLUSIVE = new Set(["never", "none"]);

function parseEntries(v: string | undefined): HistoryEntry[] {
  if (!v) return [];
  try {
    const a = JSON.parse(v);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

/**
 * Inline editor for one summary row, keyed on the question type — with composite overrides for the
 * fields whose stored data is split/structured (q3 name, q5 phone, q8 destination, q31/q33 history)
 * so editing keeps the same data shape the steps + submit route expect. Writes via onAnswer only
 * (never advances the flow).
 */
export function RowEditor({ qid, answers, onAnswer, lang }: Props) {
  const q = QUESTIONS_MAP[qid];
  const v = answers[qid] ?? "";
  const L = (o: { label: string; labelEn?: string }) => (lang === "th" ? o.label : o.labelEn ?? o.label);

  // ── composite overrides ───────────────────────────────
  if (qid === "q3") {
    const nickname = answers["q3"] ?? "";
    const setNickname = (val: string) => {
      onAnswer("q3", val);
      onAnswer("q3_first", val);
      onAnswer("q3_last", "");
    };
    return <TextField label={lang === "th" ? "ชื่อเล่น" : "Nickname"} value={nickname} onChange={(e) => setNickname(e.target.value)} />;
  }
  if (qid === "q5") {
    const cc = answers["q5_cc"] ?? DEFAULT_DIAL_CODE;
    return (
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <select
          value={cc}
          onChange={(e) => onAnswer("q5_cc", e.target.value)}
          aria-label="country code"
          className="rounded-2xl border border-border bg-card px-3 py-3.5 text-primary outline-none focus:border-accent"
        >
          {DIAL_CODES.map((d) => (
            <option key={d.code} value={d.code}>
              {flagEmoji(d.iso)} {d.code}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={v}
          onChange={(e) => onAnswer("q5", e.target.value)}
          placeholder="08x-xxx-xxxx"
          className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-primary outline-none focus:border-accent"
        />
      </div>
    );
  }
  if (qid === "q31" || qid === "q33") {
    const withDays = qid === "q33";
    return (
      <CountryHistoryEditor
        entries={parseEntries(answers[`${qid}_entries`])}
        withDays={withDays}
        lang={lang}
        onChange={(next) => {
          onAnswer(`${qid}_entries`, JSON.stringify(next));
          onAnswer(qid, next.map((e) => (withDays ? `${e.country} ${e.year} · ${e.days} วัน` : `${e.country} ${e.year}`)).join(", "));
        }}
      />
    );
  }
  if (qid === "q8") {
    return (
      <CountrySelect
        value={answers["q8_other"] || v}
        onChange={() => {}}
        onPickCountry={(c) => {
          onAnswer("q8", c.code.toLowerCase());
          onAnswer("q8_other", lang === "th" ? c.th : c.en);
        }}
        lang={lang}
      />
    );
  }

  // ── by question type ──────────────────────────────────
  if (q.type === "radio") {
    return (
      <div className="flex flex-col gap-2">
        {q.options?.map((o) => (
          <ChoiceRow
            key={o.value}
            selected={v === o.value}
            onSelect={() => onAnswer(qid, o.value)}
            icon={o.emoji ? <span className="text-2xl">{o.emoji}</span> : undefined}
            title={L(o)}
          />
        ))}
        {q.allowOtherText && (
          <RevealBlock open={v === "other"}>
            <div className="pt-2">
              <TextField
                value={answers[`${qid}_other`] ?? ""}
                onChange={(e) => onAnswer(`${qid}_other`, e.target.value)}
                placeholder={lang === "th" ? q.otherPlaceholder : q.otherPlaceholderEn}
              />
            </div>
          </RevealBlock>
        )}
      </div>
    );
  }
  if (q.type === "multiCheckbox") {
    const selected = v ? v.split(", ").filter(Boolean) : [];
    function toggle(val: string) {
      let next: string[];
      if (EXCLUSIVE.has(val)) {
        next = selected.includes(val) ? [] : [val];
      } else {
        const base = selected.filter((x) => !EXCLUSIVE.has(x));
        next = base.includes(val) ? base.filter((x) => x !== val) : [...base, val];
      }
      onAnswer(qid, next.join(", "));
    }
    return (
      <div className="flex flex-col gap-2">
        {q.options?.map((o) => (
          <ChoiceRow
            key={o.value}
            selected={selected.includes(o.value)}
            onSelect={() => toggle(o.value)}
            icon={o.emoji ? <span className="text-2xl">{o.emoji}</span> : undefined}
            title={L(o)}
          />
        ))}
      </div>
    );
  }
  if (q.type === "date") {
    return <DateCalendar value={v} onChange={(iso) => onAnswer(qid, iso)} />;
  }
  // text / email / tel
  return (
    <TextField
      type={q.type === "email" ? "email" : q.type === "tel" ? "tel" : "text"}
      value={v}
      onChange={(e) => onAnswer(qid, e.target.value)}
      placeholder={lang === "th" ? q.placeholder : q.placeholderEn}
    />
  );
}
