"use client";

import { ReactNode } from "react";

interface StickyFooterProps {
  /** Usually a <Button/>. Ignored when `hint` is provided. */
  children?: ReactNode;
  /** Centered hint text for auto-advance screens (no CTA), e.g. "แตะเพื่อเลือกและไปต่อ". */
  hint?: string;
}

/**
 * Floating bottom footer that fades in over the surface (design spec §3). Uses `fixed` so it
 * always sits above content — screens must reserve ~120px bottom padding so the last item is
 * never hidden behind it (spec §0 chrome: content bottom pad clears the floating footer).
 * The fade area is click-through; only the inner CTA/hint is interactive.
 */
export function StickyFooter({ children, hint }: StickyFooterProps) {
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-surface via-surface to-transparent px-5 pb-5 pt-10">
      <div className="pointer-events-auto mx-auto max-w-[480px]">
        {hint ? (
          <p className="text-center text-sm font-medium text-muted-soft">{hint}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
