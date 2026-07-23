"use client";

import { useEffect } from "react";

// Two jobs, in order, on every page mount:
//  1. CAPTURE utm_*/ref into localStorage synchronously — this is how campaign attribution
//     survives the LINE OAuth round trip (auth -> LINE login -> callback -> /q -> submit). The
//     whole flow stays in one browser, so a same-origin localStorage key bridges it (same trick
//     the app already uses with sessionStorage["line_state"]). Persisted under a dedicated key so
//     it is NOT wiped by the form store's reset()/"start over" (those only touch the form key).
//     Read at submit time and written to user_assessment.utm_* server-side.
//  2. STRIP those params from the visible URL a moment later, so a customer who clicked an
//     ad/campaign link doesn't see a long, scary querystring — but only after GA4/GTM (Script
//     tags in the root layout, strategy="afterInteractive") have had a chance to fire their
//     automatic page_view with the params still in location.href. The delay is a pragmatic
//     safety margin; the params are gone from what's visible, not from what analytics/localStorage
//     already captured.
const TRACKING_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"];
const ATTRIBUTION_STORAGE_KEY = "itinerry-attribution";
const CLEANUP_DELAY_MS = 1200;

// Capture is last-touch: a URL carrying utm params overwrites any stored attribution; a visit
// with no params leaves the existing attribution untouched (so a returning/deep-linked page view
// never nulls out the original campaign). document.referrer is recorded as a coarse fallback.
function captureAttribution() {
  try {
    const params = new URL(window.location.href).searchParams;
    const captured: Record<string, string> = {};
    for (const key of TRACKING_KEYS) {
      const v = params.get(key);
      if (v) captured[key] = v;
    }
    if (Object.keys(captured).length === 0) return; // nothing campaign-related this visit
    if (document.referrer) captured.referrer = document.referrer;
    localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(captured));
  } catch {
    /* private-mode / storage-disabled: attribution is best-effort, never block the page */
  }
}

export default function UtmCleanup() {
  useEffect(() => {
    captureAttribution(); // run first, synchronously, before the strip below
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      let changed = false;
      for (const key of TRACKING_KEYS) {
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
