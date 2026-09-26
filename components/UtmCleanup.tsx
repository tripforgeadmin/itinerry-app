"use client";

import { useEffect } from "react";
import {
  ATTRIBUTION_STORAGE_KEY,
  SRC_REFERRER_KEY,
  TRACKING_KEYS,
  readAttributionParams,
} from "@/lib/attribution";
import { LINE_APP_ONLY, isLineInAppUA } from "@/lib/line-browser";

// Two jobs, in order, on every page mount:
//  1. CAPTURE utm_*/ref into localStorage synchronously — this is how campaign attribution
//     survives the LINE OAuth round trip (auth -> LINE login -> callback -> /q -> submit). The
//     whole flow stays in one browser, so a same-origin localStorage key bridges it (same trick
//     the app already uses with sessionStorage["line_state"]). Persisted under a dedicated key so
//     it is NOT wiped by the form store's reset()/"start over" (those only touch the form key).
//     Read at submit time and written to user_assessment.utm_* server-side.
//     The one hop localStorage can't bridge is INTO the LINE app (e.g. from the Facebook in-app
//     browser): /auth re-sends the params through the LIFF deep link, and LINE may deliver them
//     wrapped in liff.state — readAttributionParams unwraps that (lib/attribution.ts).
//  2. STRIP those params from the visible URL a moment later, so a customer who clicked an
//     ad/campaign link doesn't see a long, scary querystring — but only after GA4/GTM (Script
//     tags in the root layout, strategy="afterInteractive") have had a chance to fire their
//     automatic page_view with the params still in location.href. The delay is a pragmatic
//     safety margin; the params are gone from what's visible, not from what analytics/localStorage
//     already captured. liff.state is left alone — the /share page's LIFF SDK may need it.
//     NOT stripped outside LINE under the LINE-app-only policy: that visitor only ever sees the
//     /auth hand-off, whose in-app "open in browser" escape reopens the CURRENT URL in a browser
//     with its own, empty localStorage — the params must still be in it for that hop.
const STRIP_KEYS = [...TRACKING_KEYS, SRC_REFERRER_KEY];
const CLEANUP_DELAY_MS = 1200;

// Capture is last-touch: a URL carrying utm params overwrites any stored attribution; a visit
// with no params leaves the existing attribution untouched (so a returning/deep-linked page view
// never nulls out the original campaign). The referrer is recorded as a coarse fallback — the
// pre-hop one carried as src_referrer when present, else document.referrer.
function captureAttribution() {
  try {
    const found = readAttributionParams(window.location.search);
    const captured: Record<string, string> = {};
    for (const key of TRACKING_KEYS) {
      if (found[key]) captured[key] = found[key];
    }
    if (Object.keys(captured).length === 0) return; // nothing campaign-related this visit
    const referrer = found[SRC_REFERRER_KEY] || document.referrer;
    if (referrer) captured.referrer = referrer;
    localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(captured));
  } catch {
    /* private-mode / storage-disabled: attribution is best-effort, never block the page */
  }
}

export default function UtmCleanup() {
  useEffect(() => {
    captureAttribution(); // run first, synchronously, before the strip below
    if (LINE_APP_ONLY && !isLineInAppUA(navigator.userAgent)) return; // keep them for the hand-off
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      let changed = false;
      for (const key of STRIP_KEYS) {
        if (url.searchParams.has(key)) {
          url.searchParams.delete(key);
          changed = true;
        }
      }
      if (changed) {
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      }
    }, CLEANUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
