"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * Passive "more below" chevron: appears when the page can scroll further and hides at the bottom.
 * Uses the window scroll model (the app scrolls document/body, not an inner container) and a
 * ResizeObserver so it re-measures when reveal blocks expand. Decorative (aria-hidden).
 */
export function ScrollMoreHint({ resetKey }: { resetKey?: string }) {
  const reduced = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const atBottom = window.scrollY >= scrollable - 24;
      setShow(scrollable > 24 && !atBottom);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    const ro = new ResizeObserver(check);
    ro.observe(document.body);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      ro.disconnect();
    };
  }, [resetKey]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-hidden
          className="pointer-events-none fixed inset-x-0 bottom-[84px] z-40 flex justify-center"
        >
          <motion.div
            animate={reduced ? undefined : { y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
            className="grid h-9 w-9 place-items-center rounded-full bg-card text-accent shadow-card ring-1 ring-border"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
