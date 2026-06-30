"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useFormStore } from "@/store/formStore";
import { LINE_OA_URL, LINE_OA_QR } from "@/lib/constants";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie.split("; ").find((r) => r.startsWith(name + "="))?.split("=")[1];
}

export default function DonePage() {
  const { reset } = useFormStore();
  const [isFriend, setIsFriend] = useState<boolean | null>(null);

  useEffect(() => {
    reset();
    setIsFriend(getCookie("isFriend") === "1");
  }, [reset]);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{
        background: "linear-gradient(135deg, #1b3d5c 0%, #2e5573 50%, #1a4a3a 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm flex flex-col items-center gap-6"
      >
        {/* Top icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/approve.png" alt="approved" className="w-40 h-40 object-contain" />
        </motion.div>

        {/* Headline */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white leading-tight">
            ได้รับข้อมูลของคุณแล้ว!
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            ทีม itinerry กำลังวิเคราะห์ข้อมูลของคุณ<br />
            เพื่อเตรียมผลประเมินวีซ่าเฉพาะสำหรับคุณ
          </p>
        </div>

        {/* LINE CTA Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full rounded-3xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          {isFriend ? (
            <div className="px-6 py-6 text-center space-y-4">
              <span className="text-3xl">💬</span>
              <div className="space-y-2">
                <p className="text-white font-bold text-base">พร้อมติดต่อคุณแล้ว!</p>
                <p className="text-white/50 text-sm leading-relaxed">
                  ทีม itinerry จะติดต่อคุณผ่าน LINE<br />
                  และเบอร์โทรที่ให้ไว้ภายใน 24 ชม.
                </p>
              </div>
              <a
                href={LINE_OA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-white font-bold text-sm transition-all active:scale-[0.98]"
                style={{ backgroundColor: "#06c755" }}
              >
                <LineIcon />
                กลับไปที่แชท LINE
              </a>
            </div>
          ) : (
            <>
              <div className="px-6 pt-6 pb-4 text-center space-y-1">
                <p className="text-white font-bold text-base">รับผลประเมินของคุณ</p>
                <p className="text-white/50 text-xs leading-relaxed">
                  เพิ่มเพื่อน LINE เพื่อรับผลประเมินและ<br />
                  คำแนะนำจากผู้เชี่ยวชาญภายใน 24 ชม.
                </p>
              </div>

              {/* QR */}
              <div className="flex justify-center pb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={LINE_OA_QR}
                  alt="LINE QR @448yxrvh"
                  width={140}
                  height={140}
                  className="rounded-2xl"
                />
              </div>
              <p className="text-center text-white/30 text-xs pb-3">@448yxrvh</p>

              {/* Add Friend Button */}
              <div className="px-4 pb-5">
                <a
                  href={LINE_OA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98]"
                  style={{ backgroundColor: "#06c755" }}
                >
                  <LineIcon />
                  เพิ่มเพื่อนรับผลประเมิน
                </a>
              </div>
            </>
          )}
        </motion.div>

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full rounded-2xl px-5 py-4"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <p className="text-white/50 text-xs font-semibold mb-3 uppercase tracking-wider">ขั้นตอนถัดไป</p>
          <div className="flex flex-col gap-2.5">
            {[
              { icon: "🔍", text: "ทีมวิเคราะห์ข้อมูลและประเมินโอกาสผ่านวีซ่า" },
              { icon: "💬", text: "ผู้เชี่ยวชาญส่งผลผ่าน LINE ภายใน 24 ชม." },
              { icon: "🗺️", text: "วางแผนและดำเนินการยื่นวีซ่าร่วมกัน" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-base mt-0.5">{item.icon}</span>
                <span className="text-white/60 text-xs leading-relaxed">{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="text-white/20 text-xs">© 2025 itinerry · app.itinerry.com</p>
      </motion.div>
    </main>
  );
}

function LineIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}
