"use client";

import { ReactNode } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

interface ConsentCheckProps {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** Whole-row-tappable consent/certify checkbox on a glass card (consent + summary screens). */
export function ConsentCheck({ checked, onToggle, children }: ConsentCheckProps) {
  return (
    <GlassCard selected={checked} onSelect={onToggle}>
      <div className="flex items-start gap-3 p-4">
        <span
          className={
            "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors " +
            (checked ? "border-accent bg-accent text-white" : "border-border-mid bg-card text-transparent")
          }
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 13 4 4L19 7" />
          </svg>
        </span>
        <span className="text-sm leading-relaxed text-primary">{children}</span>
      </div>
    </GlassCard>
  );
}
