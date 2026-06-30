"use client";

import { useEffect } from "react";
import type { ReactNode, RefObject } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface ScreenTransitionProps {
  /** Change this (e.g. the active question id) to retrigger the enter animation + scroll reset. */
  screenKey: string;
  children: ReactNode;
  /** Optional scroll container reset to top on every screen change (design spec §0 chrome). */
  scrollRef?: RefObject<HTMLElement | null>;
}

/**
 * Screen enter transition (design spec §0/§10): opacity 0→1 + translateY 8→0 over 0.28s,
 * scroll reset on change. Honors prefers-reduced-motion.
 */
export function ScreenTransition({ screenKey, children, scrollRef }: ScreenTransitionProps) {
  const reduced = useReducedMotion();

  useEffect(() => {
    scrollRef?.current?.scrollTo?.({ top: 0 });
  }, [screenKey, scrollRef]);

  return (
    <motion.div
      key={screenKey}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
