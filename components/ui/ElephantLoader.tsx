"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface ElephantLoaderProps {
  show: boolean;
  caption: string;
  sub?: string;
}

/**
 * Full-screen phase-transition loader (design spec §3). Fires on leaving visatype / occupation
 * / summary. Overlay tint + blur per prototype; honors prefers-reduced-motion.
 * TODO(Phase 2 assets): swap the 🐘 placeholder for the real mascot (itin-hold-ipad.png)
 * once design assets are wired into /public.
 */
export function ElephantLoader({ show, caption, sub }: ElephantLoaderProps) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center backdrop-blur-[2px]"
          style={{ background: "rgba(248, 250, 252, 0.97)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-4 px-8 text-center">
            <motion.div
              className="text-6xl"
              aria-hidden
              animate={reduced ? {} : { y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              🐘
            </motion.div>
            <p className="text-lg font-extrabold text-primary">{caption}</p>
            {sub && <p className="text-sm text-muted">{sub}</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
