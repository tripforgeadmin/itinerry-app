"use client";

import { ReactNode } from "react";
import { ProgressTopBar, type ProgressBox } from "@/components/ui/ProgressTopBar";
import { StickyFooter } from "@/components/ui/StickyFooter";
import { ScrollMoreHint } from "@/components/ui/ScrollMoreHint";
import { ScreenTransition } from "@/components/ui/ScreenTransition";
import type { Lang } from "@/components/ui/LangToggle";

interface QuestionShellProps {
  boxes: ProgressBox[];
  activeIndex: number;
  isFirst: boolean;
  onBack: () => void;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  screenKey: string;
  title: string;
  subtitle?: string;
  /** Centered hint (auto-advance screens). Ignored when `footer` is provided. */
  footerHint?: string;
  /** A CTA (e.g. <Button/>) for gated screens. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Shared chrome for every reskinned question screen: top bar (logo ON + 5 progress boxes),
 * screen transition, H2/subtitle, and the floating footer. No section eyebrow (the boxes show
 * the category) — per review decisions in DESIGN_RECONCILIATION / IMPLEMENTATION_PLAN.
 */
export function QuestionShell({
  boxes,
  activeIndex,
  isFirst,
  onBack,
  lang,
  onLangChange,
  screenKey,
  title,
  subtitle,
  footerHint,
  footer,
  children,
}: QuestionShellProps) {
  return (
    <main className="relative min-h-screen bg-surface">
      <div className="mx-auto max-w-[480px]">
        <ProgressTopBar
          variant="questions"
          logo
          activeIndex={activeIndex}
          boxes={boxes}
          showBack={!isFirst}
          onBack={onBack}
          lang={lang}
          onLangChange={onLangChange}
        />
        {/* Sticky headline — a sibling of (never inside) ScreenTransition, since sticky breaks
            inside a transformed/animated ancestor. Pins right below the measured top bar. */}
        <div
          className="sticky z-20 border-b border-border bg-surface px-5 pb-3 pt-4"
          style={{ top: "var(--topbar-h, 128px)" }}
        >
          <h2 className="text-2xl font-extrabold leading-snug text-primary">{title}</h2>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
        </div>
        <ScreenTransition screenKey={screenKey}>
          <div className="px-5 pb-40 pt-5">{children}</div>
        </ScreenTransition>
      </div>
      <ScrollMoreHint resetKey={screenKey} />
      <StickyFooter hint={footer ? undefined : footerHint}>{footer}</StickyFooter>
    </main>
  );
}
