import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { existsSync } from "node:fs";
import path from "node:path";
import { healthcheckFromDbRow, defaultLangFor } from "@/lib/healthcheck-data";
import HealthcheckView from "./HealthcheckView";

export const dynamic = "force-dynamic";

/**
 * Customer healthcheck card page — admin-gated by proxy.ts (/admin matcher). The card
 * renders as normal HTML so the browser does the Thai text shaping (server-side satori
 * drops tone marks over upper vowels) and the print dialog produces the PDF. Both
 * languages are built up front so the toolbar can toggle instantly.
 */
export default async function HealthcheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: row, error } = await supabase
    .from("user_assessment")
    .select("*, account:account_id(full_name, nationality), trip:trip_id(*), visa_evaluation(*)")
    .eq("id", id)
    .single();
  if (error || !row) notFound();

  const r = row as Record<string, unknown>;
  const dataTh = healthcheckFromDbRow(r, "th");
  const dataEn = healthcheckFromDbRow(r, "en");
  const ready = dataTh.strengths.length > 0 && dataTh.improvements.length > 0;
  const flagSrc = existsSync(path.join(process.cwd(), "public", "flags", `${dataTh.destCode}.png`))
    ? `/flags/${dataTh.destCode}.png`
    : null;

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      {/* Prompt webfont + print rules: hide chrome, scale the 1080px card onto one A4 page */}
      <style>{`
        @font-face { font-family: 'Prompt'; src: url('/fonts/Prompt-Regular.ttf'); font-weight: 400; font-display: swap; }
        @font-face { font-family: 'Prompt'; src: url('/fonts/Prompt-SemiBold.ttf'); font-weight: 600; font-display: swap; }
        @font-face { font-family: 'Prompt'; src: url('/fonts/Prompt-Bold.ttf'); font-weight: 700; font-display: swap; }
        @media print {
          .no-print { display: none !important; }
          main { background: #ffffff !important; padding: 0 !important; }
          #healthcheck-card { zoom: 0.55; margin: 0 auto; box-shadow: none !important; }
          @page { size: A4 portrait; margin: 8mm; }
        }
      `}</style>

      {!ready ? (
        <div className="mx-auto max-w-[1080px] rounded-2xl bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
          ยังสร้างรายงานไม่ได้ — ต้องบันทึกผลการประเมิน พร้อมกรอก “จุดแข็งของคุณ” และ “ที่เราจะช่วยเสริม” อย่างน้อยอย่างละ 1 ข้อก่อน
        </div>
      ) : (
        <HealthcheckView backHref={`/admin/${id}`} dataTh={dataTh} dataEn={dataEn} defaultLang={defaultLangFor(r)} flagSrc={flagSrc} />
      )}
    </main>
  );
}
