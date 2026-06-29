"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ItinerryLogo } from "@/components/ItinerryLogo";
import { LangToggle, type Lang } from "@/components/ui/LangToggle";

export type BoxIconName = "passport" | "plane" | "briefcase" | "shield" | "chat";

export interface ProgressBox {
  label: string; // พื้นฐาน / เดินทาง / …
  fill: number; // 0..1
  icon?: BoxIconName; // defaults by position when omitted
}

interface ProgressTopBarProps {
  /** "questions" = back + liquid boxes + TH/EN toggle; "bare" = centered wordmark. */
  variant?: "questions" | "bare";
  /** 3 or 5 category boxes (gradients --gradient-progress-1..5). */
  boxes?: ProgressBox[];
  /** Index of the currently active category, or -1 for none. */
  activeIndex?: number;
  /** Also show the wordmark on question screens (two-row top bar). Default false = design. */
  logo?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  lang: Lang;
  onLangChange: (l: Lang) => void;
}

const SVG = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function BoxIcon({ name }: { name: BoxIconName }) {
  switch (name) {
    case "plane":
      return (
        <svg {...SVG}>
          <path d="M10.5 13.5 3 12l1-2 6 .5 4-5.5a1.5 1.5 0 0 1 2.5 1.6L13.5 12l.5 6-2 1-1.5-5.5Z" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...SVG}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
        </svg>
      );
    case "shield":
      return (
        <svg {...SVG}>
          <path d="M12 3 5 6v5c0 4 3 7 7 8 4-1 7-4 7-8V6l-7-3Z" />
          <path d="m9 11 2 2 4-4" />
        </svg>
      );
    case "chat":
      return (
        <svg {...SVG}>
          <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l.8-5.5A8 8 0 1 1 21 12Z" />
        </svg>
      );
    case "passport":
    default:
      return (
        <svg {...SVG}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <circle cx="12" cy="10" r="2.5" />
          <path d="M9 16h6" />
        </svg>
      );
  }
}

const DEFAULT_ICON: BoxIconName[] = ["passport", "plane", "shield", "shield", "chat"];

function BackButton({ onBack }: { onBack?: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      aria-label="Back"
      className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full border border-border bg-card text-primary transition active:scale-95"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 18-6-6 6-6" />
      </svg>
    </button>
  );
}

function WaterBox({ box, active, index, reduced }: { box: ProgressBox; active: boolean; index: number; reduced: boolean | null }) {
  const fill = Math.min(Math.max(box.fill, 0), 1);
  const full = fill >= 1;
  const iconName = box.icon ?? DEFAULT_ICON[index] ?? "shield";
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <div className={`relative h-11 w-11 overflow-hidden rounded-xl bg-surface-soft transition-shadow ${active ? "ring-2 ring-accent" : "ring-1 ring-border"}`}>
        <motion.div
          className="absolute inset-x-0 bottom-0"
          style={{ background: `var(--gradient-progress-${index + 1})` }}
          initial={false}
          animate={{ height: `${fill * 100}%` }}
          transition={reduced ? { duration: 0 } : { duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute inset-x-0 top-0 h-[3px] bg-white/35" />
        </motion.div>
        <div className={`absolute inset-0 grid place-items-center transition-colors ${fill > 0.5 ? "text-white" : "text-muted-soft"}`}>
          <BoxIcon name={iconName} />
        </div>
        {full && (
          <span className="absolute right-0.5 top-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-success text-white">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 13 4 4L19 7" />
            </svg>
          </span>
        )}
      </div>
      <span className={`max-w-full truncate text-[10px] font-semibold leading-none ${active ? "text-accent" : "text-muted-soft"}`}>
        {box.label}
      </span>
    </div>
  );
}

const DEFAULT_BOXES: ProgressBox[] = [
  { label: "พื้นฐาน", fill: 0 },
  { label: "เดินทาง", fill: 0 },
  { label: "คัดกรอง", fill: 0 },
];

/**
 * Top bar (design spec §3/§4). On question screens: back + liquid progress boxes + the locked
 * TH/EN toggle (and the wordmark when `logo`). On bare screens: the locked ItinerryLogo wordmark.
 * Logo + toggle are reused as-is (DESIGN_RECONCILIATION §2); only the progress visual is new.
 */
export function ProgressTopBar({
  variant = "questions",
  boxes = DEFAULT_BOXES,
  activeIndex = -1,
  logo = false,
  showBack = true,
  onBack,
  lang,
  onLangChange,
}: ProgressTopBarProps) {
  const reduced = useReducedMotion();

  const back = showBack ? <BackButton onBack={onBack} /> : <span className="w-[34px] shrink-0" />;
  const boxesEls = boxes.map((b, i) => (
    <WaterBox key={i} box={b} index={i} active={i === activeIndex} reduced={reduced} />
  ));

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card px-4 py-3">
      <div className="mx-auto max-w-[480px]">
        {variant === "bare" ? (
          <div className="flex min-h-[44px] items-center gap-3">
            {back}
            <div className="grid flex-1 place-items-center">
              <ItinerryLogo size="md" />
            </div>
            <span className="w-[34px] shrink-0" />
          </div>
        ) : logo ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              {back}
              <div className="flex-1">
                <ItinerryLogo size="sm" />
              </div>
              <LangToggle lang={lang} onLangChange={onLangChange} />
            </div>
            <div className="flex items-start gap-2">{boxesEls}</div>
          </div>
        ) : (
          <div className="flex min-h-[44px] items-center gap-3">
            {back}
            <div className="flex min-w-0 flex-1 items-start gap-2">{boxesEls}</div>
            <LangToggle lang={lang} onLangChange={onLangChange} />
          </div>
        )}
      </div>
    </header>
  );
}
