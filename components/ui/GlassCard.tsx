"use client";

import { HTMLAttributes, ReactNode } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  /** When set, renders a tappable choice card (button + keyboard/a11y). */
  onSelect?: () => void;
  children: ReactNode;
}

// Frosted-glass recipe from design spec §2 — all values come from Phase-1 tokens.
const base =
  "rounded-card border text-left backdrop-blur-glass backdrop-saturate-[1.4] transition-all duration-200";
const resting = "bg-glass-bg border-glass-border shadow-glass";
const active = "bg-glass-selected-bg border-accent shadow-glass-selected";

/** Shared frosted card. Pass `onSelect` for tappable choice cards, else a plain container. */
export function GlassCard({ selected = false, onSelect, className = "", children, ...props }: GlassCardProps) {
  const cls = `${base} ${selected ? active : resting} ${className}`;

  if (onSelect) {
    return (
      <button type="button" aria-pressed={selected} onClick={onSelect} className={`${cls} w-full cursor-pointer active:scale-[0.99]`}>
        {children}
      </button>
    );
  }

  return (
    <div className={cls} {...props}>
      {children}
    </div>
  );
}
