"use client";

import { useContext, useEffect, useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ItinerryLogo } from "@/components/ItinerryLogo";
import { LangToggle, type Lang } from "@/components/ui/LangToggle";
import { NavContext } from "@/lib/navContext";

export type BoxIconName = "passport" | "plane" | "briefcase" | "shield" | "chat" | "summary";

export interface ProgressBox {
  label: string; // พื้นฐาน / เดินทาง / …
  fill: number; // 0..1 — cached, monotonic progress in that category
  icon?: BoxIconName; // defaults by position when omitted
}

interface ProgressTopBarProps {
  /** "questions" = back + pipeline + TH/EN toggle; "bare" = centered wordmark. */
  variant?: "questions" | "bare";
  /** 3, 5, or 6 category nodes. */
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
  width: 18,
  height: 18,
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
    case "summary":
      return (
        <svg {...SVG}>
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
          <path d="m8.5 11 1.5 1.5 3-3" />
          <path d="M8.5 16h7" />
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

const DEFAULT_ICON: BoxIconName[] = ["passport", "plane", "briefcase", "shield", "chat", "summary"];

// ProgressTopBar re-mounts on every screen swap, which would replay water/rail from 0 each time.
// Persist the last-rendered levels at module scope so they animate from where they were — rising
// when progress grows, holding on step-back — instead of dropping to 0 and refilling.
const lastFill: Record<number, number> = {};
const lastRail = { v: 0 };

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

/** Hand-rolled liquid wave (react-wavify-style, no dependency): a 200-wide periodic crest path
 * scrolled left forever — period 50 over a 200 viewBox tiles seamlessly at x: -50%. Always animates
 * (independent of prefers-reduced-motion) so it stays visible on phones with Reduce Motion on. */
function Wave() {
  // motion.div (not motion.svg) so `x` is a real transform translate — on an <svg> framer would
  // treat `x` as the SVG position attribute and nothing would move.
  return (
    <motion.div
      className="pointer-events-none absolute left-0 w-[200%]"
      style={{ top: -4, height: 8 }}
      aria-hidden
      initial={false}
      animate={{ x: ["0%", "-50%"] }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
    >
      <svg className="h-full w-full" viewBox="0 0 200 10" preserveAspectRatio="none">
        <path
          d="M0 6 Q12.5 1 25 6 T50 6 T75 6 T100 6 T125 6 T150 6 T175 6 T200 6 V10 H0 Z"
          fill="var(--color-accent)"
        />
      </svg>
    </motion.div>
  );
}

function PipelineNode({
  box,
  index,
  fill,
  isActive,
  clickable,
  onClick,
}: {
  box: ProgressBox;
  index: number;
  fill: number; // 0..1 cached water level
  isActive: boolean; // the cursor's category → yellow CTA ring
  clickable: boolean;
  onClick: () => void;
}) {
  const icon = box.icon ?? DEFAULT_ICON[index] ?? "shield";
  const complete = fill >= 1 && !isActive;
  const ring = isActive ? "border-2 border-yellow" : fill > 0 ? "border border-accent" : "border border-border";
  const iconColor = fill > 0.5 ? "text-white" : isActive ? "text-primary" : "text-muted-soft";

  const prevFill = lastFill[index] ?? 0;
  useEffect(() => {
    lastFill[index] = fill;
  }, [index, fill]);

  const inner = (
    <span className={`relative z-0 grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-surface-soft ${ring}`}>
      {/* water rises from its previous cached level (never drops on step-back); waves only when active */}
      <motion.div
        className="absolute inset-x-0 bottom-0 bg-accent"
        initial={{ height: `${prevFill * 100}%` }}
        animate={{ height: `${fill * 100}%` }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {isActive && <Wave />}
      </motion.div>
      <span className={`relative z-10 ${iconColor}`}>
        <BoxIcon name={icon} />
      </span>
      {complete && (
        <span className="absolute right-0 top-0 grid h-3.5 w-3.5 place-items-center rounded-full border border-card bg-success text-white">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 13 4 4L19 7" />
          </svg>
        </span>
      )}
    </span>
  );

  return clickable ? (
    <button type="button" onClick={onClick} aria-label={`ไปยังหมวด ${box.label}`} className="transition active:scale-90">
      {inner}
    </button>
  ) : (
    <div>{inner}</div>
  );
}

/** Connected step pipeline: nodes joined by a rounded water pipe whose fill flows left→right to the
 * current node (with a continuous sheen). Each node's water = its cached progress; only the active
 * node ripples and wears the yellow CTA ring. */
function Pipeline({
  boxes,
  activeIndex,
  onJump,
  reachedMax,
  lang,
}: {
  boxes: ProgressBox[];
  activeIndex: number;
  onJump?: (i: number) => void;
  reachedMax: number;
  lang: Lang;
}) {
  const n = boxes.length;
  // Rail reaches the furthest category that has any water (monotonic) — not the cursor — so stepping
  // back doesn't retract the pipe; completing a category flows it forward to the next node.
  const maxReachedIdx = boxes.reduce((m, b, i) => (b.fill > 0 ? i : m), -1);
  const railFrac = n > 1 && maxReachedIdx >= 0 ? maxReachedIdx / (n - 1) : 0;
  const prevRail = lastRail.v;
  useEffect(() => {
    lastRail.v = railFrac;
  }, [railFrac]);
  const activeLabel = boxes[activeIndex]?.label;

  return (
    <div>
      <div className="relative">
        {/* rounded water pipe */}
        <div className="absolute left-[18px] right-[18px] top-[15px] h-[6px] overflow-hidden rounded-full bg-border">
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-white/30" />
          {/* filled water — flows left→right to the current node */}
          <motion.div
            className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-accent"
            initial={{ width: `${prevRail * 100}%` }}
            animate={{ width: `${railFrac * 100}%` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="absolute inset-y-0 w-1/3"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)" }}
              initial={false}
              animate={{ x: ["-60%", "360%"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        </div>
        {/* nodes */}
        <div className="relative flex justify-between">
          {boxes.map((b, i) => (
            <PipelineNode
              key={i}
              box={b}
              index={i}
              fill={Math.min(Math.max(b.fill, 0), 1)}
              isActive={i === activeIndex}
              clickable={!!onJump && i <= reachedMax && i !== activeIndex}
              onClick={() => onJump?.(i)}
            />
          ))}
        </div>
      </div>
      {activeLabel && (
        <p className="mt-1.5 text-center text-[11px] font-semibold text-accent">
          {lang === "th" ? `หมวด ${activeIndex + 1}/${n}` : `Step ${activeIndex + 1}/${n}`} · {activeLabel}
        </p>
      )}
    </div>
  );
}

const DEFAULT_BOXES: ProgressBox[] = [
  { label: "พื้นฐาน", fill: 0 },
  { label: "เดินทาง", fill: 0 },
  { label: "คัดกรอง", fill: 0 },
];

/**
 * Top bar (design spec §3/§4). On question screens: back + the step pipeline (clickable to jump back
 * to a past category via NavContext) + the locked TH/EN toggle (and the wordmark when `logo`).
 * Publishes its measured height as --topbar-h so the sticky headline can pin right below it.
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
  const { onJump, reachedMax = -1 } = useContext(NavContext);
  const headerRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--topbar-h", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const back = showBack ? <BackButton onBack={onBack} /> : <span className="w-[34px] shrink-0" />;
  const pipeline = <Pipeline boxes={boxes} activeIndex={activeIndex} onJump={onJump} reachedMax={reachedMax} lang={lang} />;

  return (
    <header ref={headerRef} className="sticky top-0 z-30 border-b border-border bg-card px-4 py-3">
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
                <ItinerryLogo height={26} />
              </div>
              <LangToggle lang={lang} onLangChange={onLangChange} />
            </div>
            {pipeline}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {back}
              <div className="min-w-0 flex-1">{pipeline}</div>
              <LangToggle lang={lang} onLangChange={onLangChange} />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
