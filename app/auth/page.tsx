"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ItinerryLogo } from "@/components/ItinerryLogo";

const TAGLINES = [
  "ประเมินความเสี่ยงล่วงหน้าก่อนยื่นวีซ่า",
  "itinerry พร้อมแนะนำวิธีแก้ไขตรงจุด",
  "วางแผนเตรียมเอกสารแบบเฉพาะบุคคล",
];

const STEPS = [
  { icon: "📋", text: "ตอบคำถาม ~2 นาที" },
  { icon: "🔍", text: "ทีมวิเคราะห์โอกาสวีซ่า" },
  { icon: "💬", text: "รับผลผ่าน LINE ใน 24 ชม." },
];

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [taglineIndex, setTaglineIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setTaglineIndex((i) => (i + 1) % TAGLINES.length);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  function handleLineLogin() {
    setLoading(true);
    const state = crypto.randomUUID();
    sessionStorage.setItem("line_state", state);
    window.location.href = `/api/auth/login?state=${state}`;
  }

  return (
    <main className="min-h-screen flex flex-col bg-surface overflow-hidden relative">

      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "#00c3ff", filter: "blur(80px)" }} />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-10"
          style={{ background: "#44a8db", filter: "blur(80px)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-5"
          style={{ background: "#ffd166", filter: "blur(100px)" }} />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-start px-5 pt-6 pb-8 max-w-sm mx-auto w-full">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 flex flex-col items-center gap-2"
        >
          <img src="/itin.png" alt="" className="w-44 h-44 object-contain" />
          <ItinerryLogo size="lg" />
        </motion.div>

        {/* Hero text */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-4"
        >
          <h1 className="text-2xl font-bold text-primary leading-snug mb-2">
            เช็คโอกาสผ่านวีซ่าก่อนยื่น <span style={{ color: "#ffd166" }}>ฟรี!</span>
          </h1>
          <div className="h-8 overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.p
                key={taglineIndex}
                initial={{ rotateX: -90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                exit={{ rotateX: 90, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                style={{ transformOrigin: "center" }}
                className="text-base font-bold text-muted absolute inset-0 flex items-center justify-center"
              >
                {TAGLINES[taglineIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
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
          <button
            onClick={handleLineLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-white font-bold text-base transition-all active:scale-95 disabled:opacity-60 shadow-lg"
            style={{ backgroundColor: "#06c755", boxShadow: "0 4px 24px rgba(6,199,85,0.3)" }}
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                className="w-5 h-5 rounded-full border-2 border-white border-t-transparent"
              />
            ) : (
              <>
                <LineIcon />
                เริ่มประเมินฟรี
              </>
            )}
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-5 text-xs text-muted text-center leading-relaxed px-4"
        >
          โดยการเข้าสู่ระบบ คุณยินยอมให้ itinerry เก็บข้อมูลโปรไฟล์ LINE
          เพื่อประกอบการให้บริการ
        </motion.p>
      </div>
    </main>
  );
}

function LineIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}
