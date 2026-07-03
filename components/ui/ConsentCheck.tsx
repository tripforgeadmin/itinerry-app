"use client";

import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface ConsentCheckProps {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * Whole-row-tappable certify checkbox (summary screen). A thin accent-blue line travels slowly
 * around the card to draw the eye. States: unchecked = the light-blue "selected glass" look
 * (invites the tap); checked = solid navy (--color-primary) with white text.
 */
export function ConsentCheck({ checked, onToggle, children }: ConsentCheckProps) {
  const reduced = useReducedMotion();
  return (
    <div className="relative">
      {/* thin blue line orbiting the card border (pathLength-normalized dash) */}
      {!reduced && (
        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" fill="none" aria-hidden>
          <motion.rect
            x="1"
            y="1"
            rx="15"
            style={{ width: "calc(100% - 2px)", height: "calc(100% - 2px)" }}
            pathLength={100}
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="16 84"
            animate={{ strokeDashoffset: [0, -100] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
          />
        </svg>
      )}

      <button
        type="button"
        aria-pressed={checked}
        onClick={onToggle}
        className={
          "w-full cursor-pointer rounded-card border text-left backdrop-blur-glass backdrop-saturate-[1.4] transition-all duration-200 active:scale-[0.99] " +
          (checked
            ? "border-primary bg-primary shadow-glass-selected"
            : "border-accent bg-glass-selected-bg shadow-glass-selected")
        }
      >
        <div className="flex items-start gap-3 p-4">
          <span
            className={
              "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors " +
              (checked ? "border-accent bg-accent text-white" : "border-accent bg-card text-transparent")
            }
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 13 4 4L19 7" />
            </svg>
          </span>
          <span className={"text-sm leading-relaxed transition-colors " + (checked ? "text-white" : "text-primary")}>
            {children}
          </span>
        </div>
      </button>
    </div>
  );
}
