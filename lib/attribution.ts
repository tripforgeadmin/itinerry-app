// Campaign-attribution params, shared by components/UtmCleanup.tsx (capture into localStorage +
// strip from the visible URL) and the /auth "open in LINE" hand-off (app/auth/page.tsx).
//
// Why the hand-off needs them: ads run on Facebook/Instagram/TikTok, whose in-app browsers are
// NOT the LINE app, so /auth sends the visitor on into LINE. localStorage does not cross apps, so
// the deep link re-carries utm_*/ref (plus the original referrer as src_referrer) and the LINE-side
// landing captures them again.
//
// PURE MODULE — no window/document access, so node --test can import it (lib/attribution.test.ts).

export const TRACKING_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"];
export const ATTRIBUTION_STORAGE_KEY = "itinerry-attribution";
// The pre-hop document.referrer (e.g. https://l.facebook.com/). Inside LINE the landing's own
// referrer is empty or liff.line.me, so without this the DB referrer would lose the ad source.
export const SRC_REFERRER_KEY = "src_referrer";

const CAPTURE_KEYS = [...TRACKING_KEYS, SRC_REFERRER_KEY];

function pick(from: URLSearchParams, into: Record<string, string>) {
  for (const key of CAPTURE_KEYS) {
    const v = from.get(key);
    if (v) into[key] = v;
  }
}

/** Tracking keys + src_referrer found in a location.search string. Also looks inside `liff.state`:
 * depending on the LIFF console's "additional information" setting, LINE delivers the deep-link
 * query either directly (/?utm_source=…) or wrapped (/?liff.state=%3Futm_source%3D…). A direct
 * param wins over the same key wrapped in liff.state. */
export function readAttributionParams(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const out: Record<string, string> = {};
  let state = params.get("liff.state") ?? ""; // already URL-decoded once by URLSearchParams
  if (state && !state.includes("?") && /%3f/i.test(state)) {
    try {
      state = decodeURIComponent(state); // tolerate a double-encoded hop
    } catch {
      /* malformed escape — treat as no wrapped query */
    }
  }
  const q = state.indexOf("?");
  if (q !== -1) pick(new URLSearchParams(state.slice(q + 1).split("#")[0]), out);
  pick(params, out);
  return out;
}

function hasTrackingKey(source: Record<string, unknown>): boolean {
  return TRACKING_KEYS.some((k) => typeof source[k] === "string" && source[k] !== "");
}

/** Query string for the "open in LINE" deep link. Source, first match wins:
 *  1. tracking keys in the current URL (`fromUrl` = readAttributionParams(location.search)); the
 *     referrer is its src_referrer (already hopped once) else the page's document.referrer;
 *  2. the attribution UtmCleanup stored in localStorage (`stored` = the parsed JSON, any shape),
 *     with its recorded referrer — for a later visit whose URL no longer carries the params.
 * Returns "" when neither carries a tracking key (a lone referrer is not attribution — the
 * LINE-side capture ignores it too). */
export function buildHandoffQuery(
  fromUrl: Record<string, string>,
  stored: unknown,
  documentReferrer: string,
): string {
  let source: Record<string, unknown> | null = null;
  let referrer = "";
  if (hasTrackingKey(fromUrl)) {
    source = fromUrl;
    referrer = fromUrl[SRC_REFERRER_KEY] || documentReferrer;
  } else if (stored && typeof stored === "object" && hasTrackingKey(stored as Record<string, unknown>)) {
    source = stored as Record<string, unknown>;
    referrer = typeof source.referrer === "string" ? source.referrer : "";
  }
  if (!source) return "";
  const qs = new URLSearchParams();
  for (const key of TRACKING_KEYS) {
    const v = source[key];
    if (typeof v === "string" && v) qs.set(key, v);
  }
  if (referrer) qs.set(SRC_REFERRER_KEY, referrer);
  return qs.toString();
}
