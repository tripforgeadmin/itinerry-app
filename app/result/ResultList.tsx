"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ItinerryLogo } from "@/components/ItinerryLogo";
import { customerStatus } from "@/lib/status";
import { label } from "@/lib/answer-labels";
import { COUNTRIES } from "@/lib/countries";

type Dict = Record<string, unknown>;

export default function ResultList({ assessments }: { assessments: Dict[] }) {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-surface relative overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mascot/itin_main.png"
        alt=""
        aria-hidden
        className="pointer-events-none select-none absolute -bottom-10 -right-10 w-96 h-96 object-contain opacity-10 z-0"
      />

      <div className="relative z-10 max-w-sm mx-auto w-full px-5 pt-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-2 mb-6"
        >
          <ItinerryLogo size="md" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-bold text-primary mb-4 text-center"
        >
          ประวัติการทำแบบประเมิน
        </motion.h1>

        <div className="flex flex-col gap-2">
          {assessments.map((a, i) => {
            const trip = (a.trip ?? {}) as Dict;
            const statusDisplay = customerStatus((a.status as string) ?? "pending_review");
            const destination =
              COUNTRIES.find((c) => c.code === (trip.destination as string)?.toUpperCase())?.th ??
              (trip.destination as string)?.toUpperCase() ??
              "—";
            return (
              <motion.button
                key={a.id as string}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
                onClick={() => router.push(`/result/${a.id}`)}
                className="text-left bg-card rounded-2xl shadow-card p-4"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-soft">
                    {new Date(a.created_at as string).toLocaleDateString("th-TH", {
                      day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                    {i === 0 && <span className="ml-1.5 text-accent font-bold">· ล่าสุด</span>}
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${statusDisplay.color}`}>
                    {statusDisplay.label}
                  </span>
                </div>
                <p className="text-sm font-medium text-primary">
                  {destination} · {label("visa_type", trip.visa_type)}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
