/**
 * LINE-app-only policy tests — UA detection (LINE vs. the in-app browsers ads open in vs. plain
 * mobile/desktop browsers) and the three "open in LINE" URL builders.
 *
 * Run:  node --test lib/line-browser.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isLineInAppUA,
  detectInAppBrowser,
  isMobileUA,
  isAndroidUA,
  liffHttpsUrl,
  lineSchemeUrl,
  androidIntentUrl,
} from "./line-browser.ts";
import { LIFF_MAIN_ID, LIFF_URL, LIFF_DEEPLINK } from "./constants.ts";

const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)";
const ANDROID_WV =
  "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.6422.165 Mobile Safari/537.36";

const UA = {
  lineIos: `${IOS} Mobile/15E148 Safari Line/14.9.0`,
  lineIosLiff: `${IOS} Mobile/15E148 Safari Line/14.9.0 LIFF`,
  lineAndroid: `${ANDROID_WV} Line/14.9.1/IAB`,
  fbIos: `${IOS} Mobile/15E148 [FBAN/FBIOS;FBAV/468.0.0.37.106;FBBV/617473419;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/th_TH;FBOP/5]`,
  fbAndroid: `${ANDROID_WV} [FB_IAB/FB4A;FBAV/468.0.0.44.109;]`,
  messengerIos: `${IOS} Mobile/15E148 [FBAN/MessengerForiOS;FBAV/465.0.0.35.108;FBBV/613445151;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/th_TH;FBOP/5]`,
  messengerAndroid: `${ANDROID_WV} [FB_IAB/MESSENGER;FBAV/463.0.0.43.109;]`,
  messengerAndroidOld: `${ANDROID_WV} [FB_IAB/Orca-Android;FBAV/400.0.0.12.108;]`,
  instagramIos: `${IOS} Mobile/15E148 Instagram 335.0.2.26.86 (iPhone15,3; iOS 17_5; th_TH; th; scale=3.00; 1290x2796; 612306366)`,
  instagramAndroid: `${ANDROID_WV} Instagram 335.0.0.39.93 Android (34/14; 480dpi; 1080x2340; samsung; SM-S918B; dm3q; qcom; th_TH; 613298302)`,
  tiktokIos: `${IOS} Mobile/15E148 musical_ly_35.1.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/th Region/TH isDarkMode/0 WKWebView/1 BytedanceWebview/d8a21c6`,
  tiktokAndroid: `${ANDROID_WV} trill_350104 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/trill app_version/35.1.4 ByteLocale/th Region/TH BytedanceWebview/d8a21c6`,
  desktopChromeMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  desktopChromeWin:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  // iPadOS Safari requests the desktop site by default — the client adds a maxTouchPoints check.
  ipadosSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  mobileSafari: `${IOS} Version/17.5 Mobile/15E148 Safari/604.1`,
  androidChrome:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
};

test("isLineInAppUA: LINE iOS / LIFF / Android → true", () => {
  assert.equal(isLineInAppUA(UA.lineIos), true);
  assert.equal(isLineInAppUA(UA.lineIosLiff), true);
  assert.equal(isLineInAppUA(UA.lineAndroid), true);
});

test("isLineInAppUA: every other browser → false", () => {
  for (const key of [
    "fbIos", "fbAndroid", "messengerIos", "messengerAndroid", "instagramIos", "instagramAndroid",
    "tiktokIos", "tiktokAndroid", "desktopChromeMac", "desktopChromeWin", "mobileSafari", "androidChrome",
  ] as const) {
    assert.equal(isLineInAppUA(UA[key]), false, key);
  }
  assert.equal(isLineInAppUA(""), false);
  assert.equal(isLineInAppUA("SomePipeline/1.0"), false); // \b — not a bare substring match
});

test("detectInAppBrowser: Facebook iOS + Android", () => {
  assert.equal(detectInAppBrowser(UA.fbIos), "facebook");
  assert.equal(detectInAppBrowser(UA.fbAndroid), "facebook");
});

test("detectInAppBrowser: Messenger wins over its FBAN / FB_IAB tokens", () => {
  assert.equal(detectInAppBrowser(UA.messengerIos), "messenger");
  assert.equal(detectInAppBrowser(UA.messengerAndroid), "messenger");
  assert.equal(detectInAppBrowser(UA.messengerAndroidOld), "messenger");
});

test("detectInAppBrowser: Instagram + TikTok iOS + Android", () => {
  assert.equal(detectInAppBrowser(UA.instagramIos), "instagram");
  assert.equal(detectInAppBrowser(UA.instagramAndroid), "instagram");
  assert.equal(detectInAppBrowser(UA.tiktokIos), "tiktok");
  assert.equal(detectInAppBrowser(UA.tiktokAndroid), "tiktok");
});

test("detectInAppBrowser: LINE and plain browsers → null", () => {
  for (const key of ["lineIos", "lineAndroid", "desktopChromeMac", "desktopChromeWin", "mobileSafari", "androidChrome"] as const) {
    assert.equal(detectInAppBrowser(UA[key]), null, key);
  }
});

test("isMobileUA: phones + in-app browsers → true; desktop (and iPadOS's Mac UA) → false", () => {
  for (const key of ["lineIos", "lineAndroid", "fbIos", "fbAndroid", "instagramIos", "tiktokAndroid", "mobileSafari", "androidChrome"] as const) {
    assert.equal(isMobileUA(UA[key]), true, key);
  }
  assert.equal(isMobileUA(UA.desktopChromeMac), false);
  assert.equal(isMobileUA(UA.desktopChromeWin), false);
  assert.equal(isMobileUA(UA.ipadosSafari), false);
});

test("isAndroidUA", () => {
  assert.equal(isAndroidUA(UA.androidChrome), true);
  assert.equal(isAndroidUA(UA.fbAndroid), true);
  assert.equal(isAndroidUA(UA.mobileSafari), false);
  assert.equal(isAndroidUA(UA.fbIos), false);
});

test("liffHttpsUrl: with and without qs", () => {
  assert.equal(liffHttpsUrl(), `https://liff.line.me/${LIFF_MAIN_ID}`);
  assert.equal(liffHttpsUrl(""), `https://liff.line.me/${LIFF_MAIN_ID}`);
  assert.equal(liffHttpsUrl("utm_source=fb&ref=ad1"), `https://liff.line.me/${LIFF_MAIN_ID}?utm_source=fb&ref=ad1`);
});

test("lineSchemeUrl: with and without qs", () => {
  assert.equal(lineSchemeUrl(), `line://app/${LIFF_MAIN_ID}`);
  assert.equal(lineSchemeUrl("utm_source=fb"), `line://app/${LIFF_MAIN_ID}?utm_source=fb`);
});

test("androidIntentUrl: with and without qs — query before the #Intent fragment", () => {
  const tail = "#Intent;scheme=line;package=jp.naver.line.android;end";
  assert.equal(androidIntentUrl(), `intent://app/${LIFF_MAIN_ID}${tail}`);
  assert.equal(androidIntentUrl("utm_source=fb&utm_medium=paid"), `intent://app/${LIFF_MAIN_ID}?utm_source=fb&utm_medium=paid${tail}`);
});

test("constants: LIFF_URL / LIFF_DEEPLINK derive from the same LIFF_MAIN_ID", () => {
  assert.equal(LIFF_URL, liffHttpsUrl());
  assert.equal(LIFF_DEEPLINK, lineSchemeUrl());
});
