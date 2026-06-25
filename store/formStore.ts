"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LineProfile } from "@/lib/line";

export type Answers = Record<string, string | string[]>;

interface FormStore {
  step: number;
  answers: Answers;
  lineProfile: LineProfile | null;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setAnswer: (key: string, value: string | string[]) => void;
  setLineProfile: (profile: LineProfile) => void;
  reset: () => void;
}

export const useFormStore = create<FormStore>()(
  persist(
    (set) => ({
      step: 0,
      answers: {},
      lineProfile: null,
      setStep: (step) => set({ step }),
      nextStep: () => set((s) => ({ step: s.step + 1 })),
      prevStep: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
      setAnswer: (key, value) =>
        set((s) => ({ answers: { ...s.answers, [key]: value } })),
      setLineProfile: (profile) => set({ lineProfile: profile }),
      reset: () => set({ step: 0, answers: {}, lineProfile: null }),
    }),
    { name: "itinerry-visa-form" }
  )
);
