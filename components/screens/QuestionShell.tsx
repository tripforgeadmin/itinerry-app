"use client";

import { ReactNode, useEffect, useState } from "react";
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
  title: ReactNode;
  subtitle?: string;
  /** Centered hint (auto-advance screens). Ignored when `footer` is provided. */
  footerHint?: string;
  /** A CTA (e.g. <Button/>) for gated screens. */
  footer?: ReactNode;
  /** Drop the divider line under the sticky title. */
  hideTitleDivider?: boolean;
  /** Smaller title (one step down) + tighter gap to the content — for label-style titles. */
  compactTitle?: boolean;
  /** Optional action rendered on the title/subtitle row, right-aligned (e.g. the summary Edit toggle). */
  headerRight?: ReactNode;
  children: ReactNode;
}

/** True while a mobile soft keyboard is open — detected via the visual viewport shrinking well
 * below the layout viewport (never fires on desktop, where the two stay equal). */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setOpen(window.innerHeight - vv.height > 140);
    onResize();
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);
  return open;
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
  hideTitleDivider,
  compactTitle,
  headerRight,
  children,
}: QuestionShellProps) {
  const kbOpen = useKeyboardOpen();
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
          collapsed={kbOpen}
        />
        {/* Sticky headline — a sibling of (never inside) ScreenTransition, since sticky breaks
            inside a transformed/animated ancestor. Pins right below the measured top bar (or to the
            very top while the keyboard is open and the bar is hidden). */}
        <div
          className={`sticky z-20 bg-surface px-5 ${compactTitle ? "pb-2 pt-6" : "pb-3 pt-4"} ${hideTitleDivider ? "" : "border-b border-border"}`}
          style={{ top: kbOpen ? "0px" : "var(--topbar-h, 128px)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className={`leading-snug ${compactTitle ? "text-xl font-bold text-muted" : "text-2xl font-extrabold text-primary"}`}>{title}</h2>
              {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
            </div>
            {headerRight && <div className="shrink-0">{headerRight}</div>}
          </div>
        </div>
        <ScreenTransition screenKey={screenKey}>
          <div className={`px-5 pb-40 ${compactTitle ? "pt-2" : "pt-5"}`}>{children}</div>
        </ScreenTransition>
      </div>
      <ScrollMoreHint resetKey={screenKey} />
      <StickyFooter hint={footer ? undefined : footerHint}>{footer}</StickyFooter>
    </main>
  );
}
