"use client";

import { useContext, useEffect } from "react";
import type { ReactNode, RefObject } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { NavContext } from "@/lib/navContext";

interface ScreenTransitionProps {
  /** Change this (e.g. the active question id) to retrigger the enter animation + scroll reset. */
  screenKey: string;
  children: ReactNode;
  /** Optional scroll container reset to top on every screen change (design spec §0 chrome). */
  scrollRef?: RefObject<HTMLElement | null>;
}

/**
 * Directional enter-slide on EVERY screen change. A keyed motion.div (no AnimatePresence) replays
 * its `initial → animate` on each new key AND on a fresh mount, so the slide fires for same-screen
 * steps (q10→q11) AND across different screen components (q9→q10) — where a per-screen
 * AnimatePresence would not persist. Forward enters from the right, back from the left. Honors
 * prefers-reduced-motion. overflow-x hidden clips the off-screen slide without trapping vertical scroll.
 */
export function ScreenTransition({ screenKey, children, scrollRef }: ScreenTransitionProps) {
  const reduced = useReducedMotion();
  const { direction = 1 } = useContext(NavContext);

  useEffect(() => {
    scrollRef?.current?.scrollTo?.({ top: 0 });
  }, [screenKey, scrollRef]);

  if (reduced) {
    return <div key={screenKey}>{children}</div>;
  }

  return (
    <div style={{ overflowX: "hidden" }}>
      <motion.div
        key={screenKey}
        initial={{ x: direction >= 0 ? "30%" : "-30%", opacity: 0 }}
        animate={{ x: "0%", opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
