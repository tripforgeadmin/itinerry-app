"use client";

import { useEffect } from "react";

// Strips utm_*/ref tracking params from the visible URL shortly after mount, so a customer
// who clicked an ad/campaign link doesn't see a long, scary querystring in the address bar —
// but only after GA4/GTM (Script tags in the root layout, strategy="afterInteractive") have
// had a chance to fire their automatic page_view with the params still in location.href. The
// delay is a pragmatic safety margin, not tied to a specific GTM lifecycle hook; the params
// are gone from what's visible/from browser history, not from what analytics already captured.
const TRACKING_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"];
const CLEANUP_DELAY_MS = 1200;

export default function UtmCleanup() {
  useEffect(() => {
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
