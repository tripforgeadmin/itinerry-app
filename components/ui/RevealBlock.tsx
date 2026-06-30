"use client";

import { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface RevealBlockProps {
  open: boolean;
  children: ReactNode;
}

/** Animated max-height reveal (design spec §5): visatype "other", refused/overstay details,
 * contact callback-time slots. Honors prefers-reduced-motion. */
export function RevealBlock({ open, children }: RevealBlockProps) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
