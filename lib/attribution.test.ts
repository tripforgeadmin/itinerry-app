/**
 * Campaign attribution across the hop into the LINE app — readAttributionParams (direct params
 * and ones LINE wraps in liff.state) and buildHandoffQuery (URL first, else stored attribution).
 *
 * Run:  node --test lib/attribution.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readAttributionParams, buildHandoffQuery } from "./attribution.ts";

test("readAttributionParams: direct params; ignores unrelated + empty keys", () => {
  assert.deepEqual(readAttributionParams("?utm_source=fb&utm_medium=paid&lang=en&utm_term="), {
    utm_source: "fb",
    utm_medium: "paid",
  });
  assert.deepEqual(readAttributionParams(""), {});
});

test("readAttributionParams: unwraps liff.state (LIFF 'Replace' mode)", () => {
  const wrapped = "?liff.state=" + encodeURIComponent("?utm_source=fb&utm_campaign=visa jp&src_referrer=https://l.facebook.com/");
  assert.deepEqual(readAttributionParams(wrapped), {
    utm_source: "fb",
    utm_campaign: "visa jp",
    src_referrer: "https://l.facebook.com/",
  });
});

test("readAttributionParams: liff.state with a path, a hash, or double-encoded", () => {
  assert.deepEqual(readAttributionParams("?liff.state=" + encodeURIComponent("/auth?ref=ad1#x")), { ref: "ad1" });
  assert.deepEqual(readAttributionParams("?liff.state=" + encodeURIComponent("/share")), {});
  const twice = encodeURIComponent(encodeURIComponent("?utm_source=tiktok"));
  assert.deepEqual(readAttributionParams("?liff.state=" + twice), { utm_source: "tiktok" });
  assert.deepEqual(readAttributionParams("?liff.state=%25E0%3F"), {}); // malformed — no throw
});

test("readAttributionParams: a direct param wins over the same key in liff.state", () => {
  const search = "?utm_source=direct&liff.state=" + encodeURIComponent("?utm_source=wrapped&utm_medium=paid");
  assert.deepEqual(readAttributionParams(search), { utm_source: "direct", utm_medium: "paid" });
});

test("buildHandoffQuery: from the URL, with the page's document.referrer", () => {
  const qs = buildHandoffQuery({ utm_source: "fb", ref: "ad1" }, null, "https://l.facebook.com/");
  assert.equal(qs, "utm_source=fb&ref=ad1&src_referrer=https%3A%2F%2Fl.facebook.com%2F");
});

test("buildHandoffQuery: a URL src_referrer (already hopped) beats document.referrer", () => {
  const qs = buildHandoffQuery({ utm_source: "fb", src_referrer: "https://m.facebook.com/" }, null, "https://liff.line.me/");
  assert.equal(new URLSearchParams(qs).get("src_referrer"), "https://m.facebook.com/");
});

test("buildHandoffQuery: falls back to stored attribution (URL already stripped)", () => {
  const stored = { utm_source: "ig", utm_campaign: "summer", referrer: "https://instagram.com/", junk: 1 };
  assert.equal(
    buildHandoffQuery({}, stored, "ignored"),
    "utm_source=ig&utm_campaign=summer&src_referrer=https%3A%2F%2Finstagram.com%2F",
  );
  assert.equal(buildHandoffQuery({}, { utm_source: "ig" }, "ignored"), "utm_source=ig");
});

test("buildHandoffQuery: URL wins over stored", () => {
  assert.equal(buildHandoffQuery({ utm_source: "tiktok" }, { utm_source: "ig" }, ""), "utm_source=tiktok");
});

test("buildHandoffQuery: nothing campaign-related → empty (a lone referrer is not attribution)", () => {
  assert.equal(buildHandoffQuery({}, null, "https://google.com/"), "");
  assert.equal(buildHandoffQuery({ src_referrer: "https://x.com/" }, null, ""), "");
  assert.equal(buildHandoffQuery({}, "not an object", ""), "");
  assert.equal(buildHandoffQuery({}, { referrer: "https://x.com/" }, ""), "");
  assert.equal(buildHandoffQuery({}, { utm_source: 42 }, ""), "");
});

test("round trip: hand-off query survives LINE wrapping it in liff.state", () => {
  const qs = buildHandoffQuery({ utm_source: "fb", utm_content: "a&b=c" }, null, "https://l.facebook.com/");
  const landing = "?liff.state=" + encodeURIComponent("?" + qs);
  assert.deepEqual(readAttributionParams(landing), {
    utm_source: "fb",
    utm_content: "a&b=c",
    src_referrer: "https://l.facebook.com/",
  });
  // …and when LINE concatenates it directly instead
  assert.deepEqual(readAttributionParams("?" + qs), readAttributionParams(landing));
});
