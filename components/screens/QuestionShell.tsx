"use client";

import { ReactNode, useEffect, useLayoutEffect, useState } from "react";
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

/** True while a mobile soft keyboard is (about to be) open. Detected by focus landing on a text
 * entry field on a touch device — deterministic and identical across browsers (Safari, LINE's
 * in-app webview, etc.), unlike measuring visualViewport shrink, which varies per browser chrome.
 * On desktop (fine pointer) focusing a field raises no keyboard, so it never fires. */
function isTextEntry(el: Element | null): boolean {
  if (!el) return false;
  if (el.tagName === "TEXTAREA") return true;
  if (el.tagName === "INPUT") {
    const t = (el.getAttribute("type") || "text").toLowerCase();
    return !["button", "submit", "reset", "checkbox", "radio", "file", "range", "color", "hidden", "image"].includes(t);
  }
  return (el as HTMLElement).isContentEditable;
}

function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // Checked live at focus time so it also handles devices whose pointer type can change.
    const kbCapable = () => window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const onFocusIn = (e: FocusEvent) => {
      if (kbCapable() && isTextEntry(e.target as Element)) setOpen(true);
    };
    const onFocusOut = () => {
      // defer so document.activeElement settles; stay open if focus hopped to another field
      window.setTimeout(() => setOpen(kbCapable() && isTextEntry(document.activeElement)), 0);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
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
  // Every step change resets the page to the top (before paint → no flash of the old scroll).
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [screenKey]);
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
