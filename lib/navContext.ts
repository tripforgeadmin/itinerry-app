"use client";

import { createContext } from "react";

export interface NavContextValue {
  /** Jump the cursor to the first visited question of a progress category (forward or back). */
  onJump?: (categoryIndex: number) => void;
  /** Highest category index the user has reached — boxes ≤ this are clickable. */
  reachedMax?: number;
  /** Travel direction of the last navigation: +1 forward, -1 back. Drives the screen slide. */
  direction?: number;
}

/** Lets the (deeply nested) ProgressTopBar trigger category navigation without threading a callback
 * through every screen. Provided by app/q/page.tsx. */
export const NavContext = createContext<NavContextValue>({});
