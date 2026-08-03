"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";
import type { CommentCategoryRow } from "@/lib/comment-categories";

export type CaseCommentEntry = {
  id: string;
  problem_category: string | null;
  problem_note: string | null;
  solution_category: string | null;
  solution_note: string | null;
  staff: string | null;
  created_at: string;
};

/** To-Be of the free-text comment flow: staff pick a Problem category + note and a Solution
 * category + note (whiteboard: "จนท เลือก category pain-point และ solution แล้วค่อยใส่ comment").
 * Categories feed the broadcast `pain_point` condition, so keep picks honest — "อื่นๆ" is
 * always available for the genuinely uncategorizable. */
export default function CaseCommentPanel({
  assessmentId,
  entries,
  categories,
  lang = "th",
}: {
  assessmentId: string;
  entries: CaseCommentEntry[];
  categories: CommentCategoryRow[];
  lang?: Lang;
}) {
  const router = useRouter();
  const [problemCategory, setProblemCategory] = useState("");
  const [problemNote, setProblemNote] = useState("");
  const [solutionCategory, setSolutionCategory] = useState("");
  const [solutionNote, setSolutionNote] = useState("");
  const [staff, setStaff] = useState("");
  const [saving, setSaving] = useState(false);

  const problems = categories.filter((c) => c.kind === "problem");
  const solutions = categories.filter((c) => c.kind === "solution");
  const catLabel = (key: string | null) => {
    if (!key) return null;
    const c = categories.find((x) => x.key === key);
    return c ? (lang === "en" ? c.label_en || c.label_th : c.label_th) : key;
  };
  const canSave = !!(problemCategory || solutionCategory || problemNote.trim() || solutionNote.trim());

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/case-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, problemCategory, problemNote, solutionCategory, solutionNote, staff }),
      });
      if (res.ok) {
        setProblemCategory("");
        setProblemNote("");
        setSolutionCategory("");
        setSolutionNote("");
        // keep staff — same person usually logs several cases in a row
        router.refresh();
      } else {
        alert(t(lang, "บันทึกไม่สำเร็จ กรุณาลองใหม่", "Save failed. Please try again."));
      }
    } finally {
      setSaving(false);
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(lang === "en" ? "en-GB" : "th-TH", {
      timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });

  const selectCls =
    "w-full sm:w-44 rounded-lg border border-gray-200 px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200";
  const inputCls =
    "flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200";

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
        {t(lang, "ปัญหา & แนวทางแก้", "Problem & solution")}
      </h2>
      <p className="text-xs text-gray-400 mb-3">
        {t(lang,
          "เลือกหมวดก่อนแล้วค่อยใส่รายละเอียด — หมวดปัญหาถูกใช้เป็นเงื่อนไขยิงข้อความอัตโนมัติ (Broadcast)",
          "Pick a category, then add detail — problem categories drive automatic broadcast targeting")}
      </p>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="w-16 shrink-0 text-xs font-bold text-red-500">{t(lang, "ปัญหา", "Problem")}</span>
          <select value={problemCategory} onChange={(e) => setProblemCategory(e.target.value)} className={selectCls}>
            <option value="">{t(lang, "— เลือกหมวด —", "— category —")}</option>
            {problems.map((c) => (
              <option key={c.key} value={c.key}>{lang === "en" ? c.label_en || c.label_th : c.label_th}</option>
            ))}
          </select>
          <input
            type="text"
            value={problemNote}
            onChange={(e) => setProblemNote(e.target.value)}
            placeholder={t(lang, "รายละเอียด (ไม่บังคับ)", "Detail (optional)")}
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="w-16 shrink-0 text-xs font-bold text-green-600">{t(lang, "แนวทาง", "Solution")}</span>
          <select value={solutionCategory} onChange={(e) => setSolutionCategory(e.target.value)} className={selectCls}>
            <option value="">{t(lang, "— เลือกหมวด —", "— category —")}</option>
            {solutions.map((c) => (
              <option key={c.key} value={c.key}>{lang === "en" ? c.label_en || c.label_th : c.label_th}</option>
            ))}
          </select>
          <input
            type="text"
            value={solutionNote}
            onChange={(e) => setSolutionNote(e.target.value)}
            placeholder={t(lang, "รายละเอียด (ไม่บังคับ)", "Detail (optional)")}
            className={inputCls}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <input
            type="text"
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
            placeholder={t(lang, "ผู้บันทึก", "Staff")}
            className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            onClick={save}
            disabled={!canSave || saving}
            className="rounded-lg px-4 py-2 text-xs font-bold bg-gray-800 text-white transition-opacity disabled:opacity-40"
          >
            {saving ? t(lang, "กำลังบันทึก…", "Saving…") : t(lang, "บันทึก", "Log")}
          </button>
        </div>
      </div>

      {entries.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-gray-50 pt-3">
          {entries.map((e) => (
            <li key={e.id} className="text-xs text-gray-700">
              <div className="flex flex-wrap items-center gap-1.5">
                {e.problem_category && (
                  <span className="rounded-full px-2 py-0.5 font-bold bg-red-50 text-red-600">
                    {catLabel(e.problem_category)}
                  </span>
                )}
                {e.problem_note && <span>{e.problem_note}</span>}
                {e.solution_category && (
                  <span className="rounded-full px-2 py-0.5 font-bold bg-green-50 text-green-700">
                    → {catLabel(e.solution_category)}
                  </span>
                )}
                {e.solution_note && <span>{e.solution_note}</span>}
                <span className="text-gray-400">
                  · {fmt(e.created_at)}{e.staff ? ` · ${e.staff}` : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
