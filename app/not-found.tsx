"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ItinerryLogo } from "@/components/ItinerryLogo";
import { LINE_OA_URL } from "@/lib/constants";

// Root not-found — served for every unmatched URL (Next 16 app-router convention).
// Renders inside app/layout.tsx, so it inherits globals.css + the Thai/Latin font
// stack automatically. Light theme, mirroring app/auth/page.tsx.
export default function NotFound() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-surface px-5 py-12">
      {/* soft brand blobs — same recipe as the auth landing */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full opacity-10" style={{ background: "#00c3ff", filter: "blur(80px)" }} />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full opacity-10" style={{ background: "#44a8db", filter: "blur(80px)" }} />
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full opacity-10" style={{ background: "#ffd166", filter: "blur(100px)" }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex w-full max-w-sm flex-col items-center text-center"
      >
        <ItinerryLogo size="md" />

        <motion.img
          src="/itin.png"
          alt=""
          className="mt-8 h-40 w-40 object-contain"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="mt-4 text-6xl font-extrabold tracking-tight text-accent md:text-7xl">404</div>

        <h1 className="mt-4 text-xl font-bold text-primary">ไม่พบหน้าที่คุณค้นหา</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          ลิงก์อาจหมดอายุหรือพิมพ์ผิด — หากต้องการความช่วยเหลือ ทักแอดมินได้เลย
        </p>

        <Link
          href="/"
          className="mt-8 w-full rounded-full bg-yellow px-6 py-4 text-base font-extrabold text-on-yellow shadow-[0_6px_20px_-4px_rgba(255,209,102,0.6)] transition-transform active:scale-[0.98]"
        >
          กลับหน้าแรก
        </Link>

        <a
          href={LINE_OA_URL}
          target="_blank"
          rel="noopener"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-line" />
          ติดต่อแอดมินผ่าน LINE
        </a>

        <p className="mt-10 text-xs text-muted-soft">© itinerry</p>
      </motion.div>
    </main>
  );
}
