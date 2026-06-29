import type { ReactElement } from "react";
import type { Question } from "@/lib/questions";
import type { Lang } from "@/components/ui/LangToggle";
import type { ProgressBox } from "@/components/ui/ProgressTopBar";

/** Presentational props every reskinned screen receives from the questionnaire shell (app/q/page.tsx). */
export interface ScreenProps {
  question: Question;
  value: string;
  otherValue: string;
  onAnswer: (key: string, value: string) => void;
  onOther: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
  isFirst: boolean;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  boxes: ProgressBox[];
  activeIndex: number;
}

export type ScreenComponent = (props: ScreenProps) => ReactElement;
