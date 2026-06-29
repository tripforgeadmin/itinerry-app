"use client";

import { createContext } from "react";

export interface NavContextValue {
  /** Jump back to the first visited question of a progress category. */
  onJump?: (categoryIndex: number) => void;
}

/** Lets the (deeply nested) ProgressTopBar trigger category navigation without threading a callback
 * through every screen. Provided by app/q/page.tsx. */
export const NavContext = createContext<NavContextValue>({});
