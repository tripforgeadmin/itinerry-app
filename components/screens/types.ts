import type { ReactElement } from "react";
import type { Question } from "@/lib/questions";
import type { Lang } from "@/components/ui/LangToggle";
import type { ProgressBox } from "@/components/ui/ProgressTopBar";

/** Presentational props every reskinned screen receives from the questionnaire shell (app/q/page.tsx). */
export interface ScreenProps {
  question: Question;
  value: string;
  otherValue: string;
  /** Full answers map — for screens that read a sibling question's value (combined screens). */
  answers: Record<string, string>;
  onAnswer: (key: string, value: string) => void;
  onOther: (value: string) => void;
  onNext: () => void;
  /** Jump straight to a question id (e.g. a combined Y/N+detail screen skipping the detail step). */
  advanceTo: (id: string) => void;
  onBack: () => void;
  isFirst: boolean;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  boxes: ProgressBox[];
  activeIndex: number;
  /** True while the final submit is in flight (summary screen). */
  submitting: boolean;
}

export type ScreenComponent = (props: ScreenProps) => ReactElement;
