"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ItinerryLogo } from "@/components/ItinerryLogo";
import {
  ATTRIBUTION_STORAGE_KEY,
  buildHandoffQuery,
  readAttributionParams,
} from "@/lib/attribution";
import {
  LINE_APP_ONLY,
  androidIntentUrl,
  detectInAppBrowser,
  isAndroidDevice,
  isLineInAppUA,
  isMobileDevice,
  liffHttpsUrl,
  lineSchemeUrl,
  type InAppBrowser,
} from "@/lib/line-browser";
import { useTypewriter } from "@/lib/useTypewriter";
import { useFormStore } from "@/store/formStore";

const TAGLINES = [
  "ประเมินความเสี่ยงล่วงหน้าก่อนยื่นวีซ่า",
  "itinerry พร้อมแนะนำวิธีแก้ไขตรงจุด",
  "วางแผนเตรียมเอกสารแบบเฉพาะบุคคล",
];

const STEPS = [
  { icon: "📋", text: "ตอบคำถาม ~2 นาที" },
  { icon: "🔍", text: "ทีมผู้เชี่ยวชาญวิเคราะห์โอกาสวีซ่า" },
  { icon: "💬", text: "รับผล + คำแนะนำผ่าน LINE ใน 24 ชม." },
];

const PDPA_CONSENT = "โดยการเข้าสู่ระบบ คุณยินยอมให้ itinerry เก็บข้อมูลโปรไฟล์ LINE เพื่อประกอบการให้บริการ";

// Where this page is being viewed — device policy in lib/line-browser.ts:
//  "line"    — the LINE app: landing + login button. Also a phone/tablet outside LINE when the
//              rule is off (plain `next dev`, unless NEXT_PUBLIC_ENFORCE_LINE_APP=true).
//  "mobile"  — a phone/tablet outside LINE (incl. the Facebook/Instagram/TikTok in-app browsers
//              ads open in, iPadOS and Android "Desktop site"): deep-link hand-off into the LINE
//              app. proxy.ts + LineHandoffGuard enforce the same rule, so this is the UX, not the gate.
//  "desktop" — Windows/Mac/Linux (incl. LINE PC, which opens links in the system browser): a
//              choice between LINE Login on this computer and a QR to continue on the phone.
//              Shown whether or not the rule is enforced — it's the desktop UX, not a gate.
type Env = "line" | "mobile" | "desktop";

interface Handoff {
  env: Env;
  qs: string; // tracking params re-sent through the deep link / QR (see buildHandoffQuery)
  android: boolean;
  inApp: InAppBrowser | null;
}

const LANDING: Handoff = { env: "line", qs: "", android: false, inApp: null };

function detectHandoff(): Handoff {
  const ua = navigator.userAgent;
  const touchPoints = navigator.maxTouchPoints;
  if (isLineInAppUA(ua)) return LANDING;
  const mobile = isMobileDevice(ua, touchPoints);
  if (mobile && !LINE_APP_ONLY) return LANDING;
  // localStorage doesn't cross into the LINE app, so the campaign params ride the deep link / QR.
  // Current URL first; else what UtmCleanup stored earlier (e.g. a later visit to a bare /auth,
  // or a proxy.ts bounce, which drops the query).
  let stored: unknown = null;
  try {
    stored = JSON.parse(localStorage.getItem(ATTRIBUTION_STORAGE_KEY) || "null");
  } catch {
    /* storage disabled / malformed — hand off without attribution */
  }
  const qs = buildHandoffQuery(readAttributionParams(window.location.search), stored, document.referrer);
  return {
    env: mobile ? "mobile" : "desktop",
    qs,
    android: isAndroidDevice(ua, touchPoints),
    inApp: detectInAppBrowser(ua),
  };
}

// Mobile hand-off only: the in-app "open in browser" escape (and the host app's own copy-link)
// takes the webview's CURRENT URL into a browser with its own, empty localStorage. Mirror the
// hand-off params into that URL — they may have come from storage (bare /auth), and src_referrer
// is never in it — so the next /auth load there rebuilds the same deep link. Other params
// (fbclid, …) are kept. Desktop doesn't need it: its QR is built from this tab's state/storage.
function keepHandoffParamsInUrl(qs: string) {
  const url = new URL(window.location.href);
  new URLSearchParams(qs).forEach((value, key) => url.searchParams.set(key, value));
  if (url.href !== window.location.href) {
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }
}

export default function AuthPage() {
  const [loading, setLoading] = useState<Loading>(null);
  // null until decided after mount — never flash the login button to a phone/tablet that gets
  // the LINE hand-off.
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  // True when localStorage holds an unsubmitted assessment worth resuming (any recorded answer).
  const [resume, setResume] = useState(false);
  const typed = useTypewriter(TAGLINES);

  useEffect(() => {
    const detected = detectHandoff();
    setHandoff(detected);
    if (detected.env === "mobile" && detected.qs) keepHandoffParamsInUrl(detected.qs);
    try {
      const s = JSON.parse(localStorage.getItem("itinerry-visa-form-v3") || "null")?.state;
      setResume(!!s && (Object.keys(s.answers || {}).length > 0 || (s.history?.length ?? 0) > 1));
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  // After tapping "เริ่มประเมิน" (desktop: "เข้าสู่ระบบด้วย LINE") we navigate to LINE login with
  // loading=true. If the user then taps the browser's back button, the page is restored from the
  // back/forward cache with that loading=true frozen → the button is stuck spinning. Reset it
  // whenever the page is shown again (bfcache restore via pageshow, or foregrounding via
  // visibilitychange) so it's clickable again.
  useEffect(() => {
    const reset = () => setLoading(null);
    const onVisible = () => {
      if (document.visibilityState === "visible") reset();
    };
    window.addEventListener("pageshow", reset);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", reset);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // `fresh` = start over (wipe saved progress); otherwise resume the persisted assessment at /q.
  function goToLogin(fresh: boolean) {
    setLoading(fresh ? "new" : "continue");
    if (fresh) {
      useFormStore.getState().reset();
      localStorage.removeItem("itinerry-visa-form-v3");
    }
    const state = crypto.randomUUID();
    sessionStorage.setItem("line_state", state);
    window.location.href = `/api/auth/login?state=${state}`;
  }

  if (!handoff) return <main className="min-h-screen bg-surface" />;
  if (handoff.env === "mobile") return <OpenInLineScreen handoff={handoff} />;
  if (handoff.env === "desktop") {
    return (
      <DesktopChoiceScreen
        qs={handoff.qs}
        typed={typed}
        resume={resume}
        loading={loading}
        onLogin={goToLogin}
      />
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-surface overflow-hidden relative">

      <BackgroundBlobs />

      <div className="relative flex-1 flex flex-col items-center justify-start px-5 pt-6 pb-8 max-w-sm mx-auto w-full">

        {/* Logo + floating mascot */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 flex flex-col items-center gap-2"
        >
          <motion.img
            src="/itin.png"
            alt=""
            className="w-44 h-44 object-contain"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <ItinerryLogo size="lg" />
        </motion.div>

        {/* Hero text */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-4"
        >
          <HeroHeadline typed={typed} />
        </motion.div>

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full bg-card rounded-2xl p-4 mb-4 shadow-card"
        >
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: "#f0f8fd" }}>
                {s.icon}
              </span>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-bold text-accent">{i + 1}</span>
                <span className="text-sm text-primary-mid">{s.text}</span>
              </div>
              {i < STEPS.length - 1 && (
                <span className="text-muted-soft text-xs">→</span>
              )}
            </div>
          ))}
        </motion.div>

        {/* LINE Login Button */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full"
        >
          <LoginButtons resume={resume} loading={loading} onLogin={goToLogin} startLabel="เริ่มประเมินฟรี" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-5 text-xs text-muted text-center leading-relaxed px-4"
        >
          {PDPA_CONSENT}
        </motion.p>
      </div>
    </main>
  );
}

type Loading = null | "continue" | "new";

function BackgroundBlobs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
        style={{ background: "#00c3ff", filter: "blur(80px)" }} />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-10"
        style={{ background: "#44a8db", filter: "blur(80px)" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-5"
        style={{ background: "#ffd166", filter: "blur(100px)" }} />
    </div>
  );
}

function HeroHeadline({ typed }: { typed: string }) {
  return (
    <>
      <h1 className="text-2xl font-bold text-primary leading-snug mb-2">
        เช็คโอกาสผ่านวีซ่าก่อนยื่น{" "}
        {/* "ฟรี!" circled for emphasis */}
        <span className="relative inline-block text-logo-primary">
          ฟรี!
          <svg
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: "150%", height: "180%" }}
            viewBox="0 0 100 60"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden
          >
            <motion.ellipse
              cx="50" cy="30" rx="44" ry="24"
              stroke="currentColor" strokeWidth="3" strokeLinecap="round"
              transform="rotate(-4 50 30)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.5, ease: "easeInOut" }}
            />
          </svg>
        </span>
      </h1>
      {/* typewriter tagline */}
      <div className="min-h-[3rem] flex items-start justify-center">
        <p className="text-base font-bold text-muted leading-snug">
          {typed}
          <motion.span
            aria-hidden
            className="inline-block w-[2px] h-[1.1em] translate-y-[2px] bg-logo-primary ml-0.5 align-middle"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          />
        </p>
      </div>
    </>
  );
}

// The LINE Login entry, shared by the LINE-app landing and the desktop "this computer" option.
// With unsubmitted progress in localStorage: continue (primary) + start over (secondary);
// otherwise one start button. `testId` marks the primary button.
function LoginButtons({
  resume,
  loading,
  onLogin,
  startLabel,
  testId,
}: {
  resume: boolean;
  loading: Loading;
  onLogin: (fresh: boolean) => void;
  startLabel: string;
  testId?: string;
}) {
  if (resume) {
    return (
      <div className="flex flex-col gap-3">
        {/* continue where they left off — primary */}
        <button
          onClick={() => onLogin(false)}
          disabled={!!loading}
          data-testid={testId}
          className="w-full flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-white font-bold text-base transition-all active:scale-95 disabled:opacity-60 shadow-lg"
          style={{ backgroundColor: "#06c755", boxShadow: "0 4px 24px rgba(6,199,85,0.3)" }}
        >
          {loading === "continue" ? <Spinner /> : (<><LineIcon />ทำประเมินต่อเลย</>)}
        </button>
        {/* discard progress + start over — de-emphasized */}
        <button
          onClick={() => onLogin(true)}
          disabled={!!loading}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border bg-transparent px-6 py-3.5 text-sm font-bold text-muted transition-all active:scale-95 disabled:opacity-60"
        >
          {loading === "new" ? <Spinner /> : "เริ่มทำประเมินใหม่"}
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => onLogin(true)}
      disabled={!!loading}
      data-testid={testId}
      className="w-full flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-white font-bold text-base transition-all active:scale-95 disabled:opacity-60 shadow-lg"
      style={{ backgroundColor: "#06c755", boxShadow: "0 4px 24px rgba(6,199,85,0.3)" }}
    >
      {loading ? <Spinner /> : (<><LineIcon />{startLabel}</>)}
    </button>
  );
}

const IN_APP_NAME: Record<InAppBrowser, string> = {
  facebook: "Facebook",
  messenger: "Messenger",
  instagram: "Instagram",
  tiktok: "TikTok",
};

// Mobile, outside LINE (Safari/Chrome, or an ad's in-app browser) → deep link into the LINE app.
// Android gets an intent:// URL (Chrome and most Android in-app browsers won't follow a bare
// line:// link); iOS gets line://. In-app browsers sometimes swallow both, hence the escape
// hatches: the "open in browser" tip and copying the https LIFF link to paste into a LINE chat.
function OpenInLineScreen({ handoff }: { handoff: Handoff }) {
  const liffUrl = liffHttpsUrl(handoff.qs);
  const deepLink = handoff.android ? androidIntentUrl(handoff.qs) : lineSchemeUrl(handoff.qs);
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false);

  async function copyLink() {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(liffUrl);
        ok = true;
      }
    } catch {
      /* permission denied / insecure context — fall through */
    }
    if (!ok) ok = legacyCopy(liffUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setShowLink(true); // last resort: reveal it for long-press → copy
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-surface">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center" data-liff-url={liffUrl}>
        <img src="/itin.png" alt="" className="w-24 h-24 object-contain" />
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-primary">เปิดในแอป LINE</h1>
          <p className="text-sm text-muted leading-relaxed">
            แบบประเมินนี้ใช้งานได้ในแอป LINE เท่านั้น<br />
            กดปุ่มด้านล่างเพื่อเปิดในแอป LINE แล้วเข้าสู่ระบบได้เลย
          </p>
        </div>
        <div className="w-full flex flex-col gap-3">
          <a
            href={deepLink}
            data-testid="line-deeplink"
            className="w-full flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-white font-bold text-base shadow-lg"
            style={{ backgroundColor: "#06c755", boxShadow: "0 4px 24px rgba(6,199,85,0.3)" }}
          >
            <LineIcon />
            เปิดใน LINE
          </a>
          {handoff.inApp && (
            <p className="text-xs text-muted leading-relaxed px-2">
              ถ้ากดแล้วไม่เปิด: แตะ ⋯ มุมขวาบนของ {IN_APP_NAME[handoff.inApp]} แล้วเลือก
              “เปิดในเบราว์เซอร์” จากนั้นกดปุ่มนี้อีกครั้ง
            </p>
          )}
        </div>
        <div className="w-full flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={copyLink}
            data-testid="copy-liff-link"
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border bg-transparent px-6 py-3.5 text-sm font-bold text-muted transition-all active:scale-95"
          >
            {copied ? "คัดลอกแล้ว ✓" : "คัดลอกลิงก์"}
          </button>
          <p className="text-xs text-muted">แล้ววางลิงก์ในแชท LINE เพื่อเปิด</p>
          {showLink && (
            <p className="w-full rounded-xl bg-card border border-border px-3 py-2 text-xs text-primary-mid break-all select-all">
              {liffUrl}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

// Desktop (incl. LINE PC, which opens links in the system browser) → two separate paths:
//  (A) this computer — LINE Login's standard OAuth web page (QR scan or email). A QR scanned there
//      only authenticates; the session and the questionnaire stay in this tab. Same resume
//      semantics as the LINE-app landing; attribution rides localStorage across the round trip.
//  (B) the phone — a QR of the https LIFF link (carrying the campaign params) that opens the
//      questionnaire in the LINE app on the phone.
// LINE Login shows a QR of its own, so the copy spells out which QR logs in here and which one
// moves to the phone. qrcode is loaded on demand so the LINE-app landing doesn't ship it.
function DesktopChoiceScreen({
  qs,
  typed,
  resume,
  loading,
  onLogin,
}: {
  qs: string;
  typed: string;
  resume: boolean;
  loading: Loading;
  onLogin: (fresh: boolean) => void;
}) {
  const liffUrl = liffHttpsUrl(qs);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then(({ toDataURL }) => toDataURL(liffUrl, { width: 416, margin: 1, errorCorrectionLevel: "M" }))
      .then((dataUrl) => {
        if (!cancelled) setQr(dataUrl);
      })
      .catch(() => {
        /* QR render failed — the link text below still works */
      });
    return () => {
      cancelled = true;
    };
  }, [liffUrl]);

  return (
    <main className="min-h-screen flex flex-col bg-surface overflow-hidden relative">

      <BackgroundBlobs />

      <div className="relative flex-1 flex flex-col items-center px-6 pt-8 pb-12 max-w-4xl mx-auto w-full">

        {/* Logo + floating mascot */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 flex flex-col items-center gap-2"
        >
          <motion.img
            src="/itin.png"
            alt=""
            className="w-32 h-32 object-contain"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <ItinerryLogo size="lg" />
        </motion.div>

        {/* Hero text */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-4"
        >
          <HeroHeadline typed={typed} />
        </motion.div>

        {/* Steps — one row on a wide window */}
        <motion.ol
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mb-8"
        >
          {STEPS.map((s, i) => (
            <li key={i} className="flex items-center gap-3 bg-card rounded-2xl px-4 py-3 shadow-card">
              <span className="w-9 h-9 rounded-xl bg-accent-bg flex items-center justify-center text-lg flex-shrink-0">
                {s.icon}
              </span>
              <span className="text-xs font-bold text-accent">{i + 1}</span>
              <span className="text-sm text-primary-mid leading-snug">{s.text}</span>
            </li>
          ))}
        </motion.ol>

        {/* The two paths — side by side on a wide window, stacked on a narrow one */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full"
        >
          <h2 className="text-center text-base font-bold text-primary mb-4">เลือกวิธีทำแบบประเมิน</h2>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-5">

            {/* (A) this computer — LINE Login */}
            <section className="bg-card rounded-2xl p-6 shadow-card flex flex-col gap-4">
              <OptionHeader icon="💻" eyebrow="ตัวเลือกที่ 1" title="ทำบนคอมเครื่องนี้" />
              <p className="text-sm text-muted leading-relaxed">
                {resume
                  ? "มีแบบประเมินที่ทำค้างไว้บนคอมเครื่องนี้ เข้าสู่ระบบด้วย LINE แล้วทำต่อได้เลย"
                  : "เข้าสู่ระบบด้วยบัญชี LINE แล้วทำแบบประเมินบนหน้าจอนี้ได้เลย"}
              </p>
              <LoginButtons
                resume={resume}
                loading={loading}
                onLogin={onLogin}
                startLabel="เข้าสู่ระบบด้วย LINE"
                testId="desktop-login"
              />
              <p className="rounded-xl bg-accent-bg px-3.5 py-3 text-xs text-primary-mid leading-relaxed">
                หน้าเข้าสู่ระบบของ LINE จะให้สแกน QR ด้วยแอป LINE บนมือถือ หรือใช้อีเมลก็ได้ —{" "}
                <span className="font-bold">เป็นแค่การยืนยันตัวตน</span> แบบประเมินยังทำบนคอมเครื่องนี้
              </p>
              <p className="mt-auto text-xs text-muted leading-relaxed">{PDPA_CONSENT}</p>
            </section>

            {/* "or" — a vertical rule between the cards, a horizontal one when stacked */}
            <div className="flex md:flex-col items-center gap-3" aria-hidden>
              <span className="flex-1 h-px md:h-auto md:w-px bg-border" />
              <span className="text-xs font-bold text-muted-soft">หรือ</span>
              <span className="flex-1 h-px md:h-auto md:w-px bg-border" />
            </div>

            {/* (B) continue on the phone — QR of the LIFF link */}
            <section
              className="bg-card rounded-2xl p-6 shadow-card flex flex-col gap-4"
              data-liff-url={liffUrl}
            >
              <OptionHeader icon="📱" eyebrow="ตัวเลือกที่ 2" title="ทำบนมือถือในแอป LINE" />
              <p className="text-sm text-muted leading-relaxed">
                สแกน QR นี้ แบบประเมินจะเปิดในแอป LINE บนมือถือ แล้วทำบนมือถือได้เลย
                ไม่ต้องเข้าสู่ระบบบนคอม
              </p>
              {/* Saved progress lives in this browser's localStorage only — the QR carries just the
                  campaign params, so the phone starts from the first question. */}
              {resume && (
                <p className="rounded-xl bg-accent-bg px-3.5 py-3 text-xs text-primary-mid leading-relaxed">
                  คำตอบที่ทำค้างไว้บนคอมจะไม่ย้ายไปมือถือ — ถ้าจะทำต่อจากเดิม ให้เลือก
                  <span className="font-bold">ตัวเลือกที่ 1</span>
                </p>
              )}
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-44 h-44 p-2 rounded-2xl bg-white border border-border flex items-center justify-center">
                  {qr ? (
                    <img
                      src={qr}
                      alt="QR code เปิดแบบประเมินในแอป LINE บนมือถือ"
                      data-testid="desktop-qr"
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-surface-soft animate-pulse" />
                  )}
                </div>
                <p className="text-sm font-bold text-primary-mid">สแกนด้วยกล้องมือถือหรือแอป LINE</p>
                <p className="text-[11px] text-muted-soft break-all select-all">{liffUrl}</p>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

function OptionHeader({ icon, eyebrow, title }: { icon: string; eyebrow: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-11 h-11 rounded-xl bg-accent-bg flex items-center justify-center text-xl flex-shrink-0"
        aria-hidden
      >
        {icon}
      </span>
      <div>
        <p className="text-xs font-bold text-accent">{eyebrow}</p>
        <h3 className="text-lg font-bold text-primary leading-snug">{title}</h3>
      </div>
    </div>
  );
}

// Clipboard fallback for in-app browsers without navigator.clipboard (or that deny it).
function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length); // iOS ignores select() alone
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      className="w-5 h-5 rounded-full border-2 border-current border-t-transparent"
    />
  );
}

function LineIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}
