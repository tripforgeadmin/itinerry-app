"use client";

export type Lang = "th" | "en";

interface LangToggleProps {
  lang: Lang;
  onLangChange: (l: Lang) => void;
}

/**
 * LOCKED surface (DESIGN_RECONCILIATION §2): the TH/EN toggle follows the source code.
 * Faithful extraction of the control currently inline in components/form/QuestionScreen.tsx
 * — identical markup/behavior, lifted here for reuse. Do not restyle.
 */
export function LangToggle({ lang, onLangChange }: LangToggleProps) {
  return (
    <div className="flex rounded-full border border-border overflow-hidden text-xs font-bold shrink-0">
      {(["th", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onLangChange(l)}
          className={
            "px-2.5 py-1 transition-colors " +
            (lang === l ? "bg-accent text-white" : "text-muted hover:text-primary")
          }
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
