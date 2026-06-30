"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LineProfile } from "@/lib/line";
import { FIRST_QUESTION_ID } from "@/lib/questions";

export type Answers = Record<string, string>;

interface FormStore {
  /** Full trail of visited question ids (kept even when navigating back, so forward jumps work). */
  history: string[];
  /** Cursor — index into `history` of the current question. */
  pos: number;
  answers: Answers;
  lineProfile: LineProfile | null;
  pushQuestion: (id: string) => void;
  popQuestion: () => void;
  /** Move the cursor to a visited history index (bidirectional category jumps). */
  goToIndex: (i: number) => void;
  setAnswer: (key: string, value: string) => void;
  setLineProfile: (profile: LineProfile) => void;
  reset: () => void;
}

export const useFormStore = create<FormStore>()(
  persist(
    (set) => ({
      history: [FIRST_QUESTION_ID],
      pos: 0,
      answers: {},
      lineProfile: null,
      pushQuestion: (id) =>
        set((s) => {
          // Re-walking the existing trail with the same next → just advance the cursor.
          if (s.pos < s.history.length - 1 && s.history[s.pos + 1] === id) {
            return { pos: s.pos + 1 };
          }
          // New branch (answer changed) or at the tip → truncate forward and append.
          const base = s.history.slice(0, s.pos + 1);
          return { history: [...base, id], pos: s.pos + 1 };
        }),
      popQuestion: () => set((s) => ({ pos: Math.max(0, s.pos - 1) })),
      goToIndex: (i) => set((s) => (i >= 0 && i < s.history.length ? { pos: i } : s)),
      setAnswer: (key, value) =>
        set((s) => ({ answers: { ...s.answers, [key]: value } })),
      setLineProfile: (profile) => set({ lineProfile: profile }),
      reset: () => set({ history: [FIRST_QUESTION_ID], pos: 0, answers: {}, lineProfile: null }),
    }),
    {
      name: "itinerry-visa-form-v3",
      version: 1,
      // v0 had no cursor — land the returning user at the tip of their trail.
      migrate: (persisted, version) => {
        const p = persisted as { history?: string[]; pos?: number } | undefined;
        if (version < 1 && p) {
          return { ...p, pos: Array.isArray(p.history) ? Math.max(0, p.history.length - 1) : 0 };
        }
        return p as FormStore;
      },
    }
  )
);
