"use client";

import { ReactNode, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface RevealBlockProps {
  open: boolean;
  children: ReactNode;
}

/** Animated max-height reveal (design spec §5): visatype "other", refused/overstay details,
 * contact callback-time slots. Honors prefers-reduced-motion. Clips only WHILE animating — once
 * fully open, overflow is visible so a floating dropdown inside (e.g. YearSelect in the summary
 * editor) can escape the reveal bounds instead of being cut off. */
export function RevealBlock({ open, children }: RevealBlockProps) {
  const reduced = useReducedMotion();
  const [overflow, setOverflow] = useState<"hidden" | "visible">("hidden");
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          onAnimationStart={() => setOverflow("hidden")}
          onAnimationComplete={() => open && setOverflow("visible")}
          transition={reduced ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ overflow }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
