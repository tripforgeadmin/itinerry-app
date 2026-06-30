"use client";

import { ReactNode } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

interface ChoiceRowProps {
  selected: boolean;
  onSelect: () => void;
  /** Leading emoji/icon/image. */
  icon?: ReactNode;
  title: string;
  sub?: string;
}

/** Full-width glass option row with a trailing tick (single- or multi-select choice screens). */
export function ChoiceRow({ selected, onSelect, icon, title, sub }: ChoiceRowProps) {
  return (
    <GlassCard selected={selected} onSelect={onSelect}>
      <div className="flex items-center gap-3 p-4">
        {icon && <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent-bg text-2xl">{icon}</span>}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-primary">{title}</p>
          {sub && <p className="truncate text-xs text-muted">{sub}</p>}
        </div>
        <span
          className={
            "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors " +
            (selected ? "border-accent bg-accent text-white" : "border-border-mid text-transparent")
          }
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 13 4 4L19 7" />
          </svg>
        </span>
      </div>
    </GlassCard>
  );
}
