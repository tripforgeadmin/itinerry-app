"use client";

import { useContext, useEffect } from "react";
import type { ReactNode, RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { NavContext } from "@/lib/navContext";

interface ScreenTransitionProps {
  /** Change this (e.g. the active question id) to retrigger the enter animation + scroll reset. */
  screenKey: string;
  children: ReactNode;
  /** Optional scroll container reset to top on every screen change (design spec §0 chrome). */
  scrollRef?: RefObject<HTMLElement | null>;
}

// Directional slide: forward → new screen enters from the right; back → from the left. Paired with
// AnimatePresence mode="wait" so the old screen slides out first. Honors prefers-reduced-motion.
const variants = {
  enter: (d: number) => ({ x: d >= 0 ? "32%" : "-32%", opacity: 0, scale: 0.97 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (d: number) => ({ x: d >= 0 ? "-24%" : "24%", opacity: 0, scale: 0.97 }),
};

export function ScreenTransition({ screenKey, children, scrollRef }: ScreenTransitionProps) {
  const reduced = useReducedMotion();
  const { direction = 1 } = useContext(NavContext);

  useEffect(() => {
    scrollRef?.current?.scrollTo?.({ top: 0 });
  }, [screenKey, scrollRef]);

  if (reduced) {
    // No transform/slide — just swap (avoids motion sickness).
    return <div key={screenKey}>{children}</div>;
  }

  return (
    // overflow-x hidden clips the horizontal slide; height stays auto so the page still scrolls.
    <div style={{ overflowX: "hidden" }}>
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={screenKey}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
