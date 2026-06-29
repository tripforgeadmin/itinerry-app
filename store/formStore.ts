"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LineProfile } from "@/lib/line";
import { FIRST_QUESTION_ID } from "@/lib/questions";

export type Answers = Record<string, string>;

interface FormStore {
  history: string[];
  answers: Answers;
  lineProfile: LineProfile | null;
  pushQuestion: (id: string) => void;
  popQuestion: () => void;
  /** Jump back to an earlier question by truncating history to it (no-op if not present). */
  truncateTo: (id: string) => void;
  setAnswer: (key: string, value: string) => void;
  setLineProfile: (profile: LineProfile) => void;
  reset: () => void;
}

export const useFormStore = create<FormStore>()(
  persist(
    (set) => ({
      history: [FIRST_QUESTION_ID],
      answers: {},
      lineProfile: null,
      pushQuestion: (id) =>
        set((s) => ({ history: [...s.history, id] })),
      truncateTo: (id) =>
        set((s) => {
          const i = s.history.indexOf(id);
          return i >= 0 ? { history: s.history.slice(0, i + 1) } : s;
        }),
      popQuestion: () =>
        set((s) => ({ history: s.history.length > 1 ? s.history.slice(0, -1) : s.history })),
      setAnswer: (key, value) =>
        set((s) => ({ answers: { ...s.answers, [key]: value } })),
      setLineProfile: (profile) => set({ lineProfile: profile }),
      reset: () => set({ history: [FIRST_QUESTION_ID], answers: {}, lineProfile: null }),
    }),
    { name: "itinerry-visa-form-v3" }
  )
);
