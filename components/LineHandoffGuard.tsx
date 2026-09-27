"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { LINE_APP_ONLY, isLineInAppUA, isMobileDevice } from "@/lib/line-browser";

// Client half of the phone/tablet → LINE app rule (lib/line-browser.ts). proxy.ts bounces
// phones/tablets by UA, but iPadOS Safari/Chrome send a desktop Mac UA and Android "Desktop site"
// an X11 Linux one, so the server lets them through as desktops. Only the client can tell them
// apart (navigator.maxTouchPoints) — send those back to /auth, which hands them off into LINE.
// Never guards /auth itself, so it can't loop; the LINE app and real desktops pass untouched.
const GUARDED_PATHS = ["/q", "/done", "/result"];

export default function LineHandoffGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (!LINE_APP_ONLY) return;
    if (!GUARDED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    const ua = navigator.userAgent;
    if (!isLineInAppUA(ua) && isMobileDevice(ua, navigator.maxTouchPoints)) {
      window.location.replace("/auth");
    }
  }, [pathname]);

  return null;
}
