"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
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
 * always available for the genuinely uncategorizable.
 *
 * The two halves render as separate cards so the left column can interleave them with the
 * customer-facing assessment lists (จุดแข็ง → ปัญหา → ที่เราจะช่วยเสริม → แนวทาง), but they
 * stay ONE form: a problem and the solution for it are saved as a single paired row. Shared
 * state lives in this provider; the cards below are just its two faces. */

type Ctx = {
  lang: Lang;
  categories: CommentCategoryRow[];
  entries: CaseCommentEntry[];
  problemCategory: string; setProblemCategory: (v: string) => void;
  problemNote: string; setProblemNote: (v: string) => void;
  solutionCategory: string; setSolutionCategory: (v: string) => void;
  solutionNote: string; setSolutionNote: (v: string) => void;
  staff: string; setStaff: (v: string) => void;
  saving: boolean;
  canSave: boolean;
  save: () => void;
};

const CaseCommentCtx = createContext<Ctx | null>(null);

function useCaseComment(): Ctx {
  const ctx = useContext(CaseCommentCtx);
  if (!ctx) throw new Error("CaseComment cards must be rendered inside <CaseCommentProvider>");
  return ctx;
}

export function CaseCommentProvider({
  assessmentId, entries, categories, lang = "th", children,
}: {
  assessmentId: string;
  entries: CaseCommentEntry[];
  categories: CommentCategoryRow[];
  lang?: Lang;
  children: ReactNode;
}) {
  const router = useRouter();
  const [problemCategory, setProblemCategory] = useState("");
  const [problemNote, setProblemNote] = useState("");
  const [solutionCategory, setSolutionCategory] = useState("");
  const [solutionNote, setSolutionNote] = useState("");
  const [staff, setStaff] = useState("");
  const [saving, setSaving] = useState(false);

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

  return (
    <CaseCommentCtx.Provider
      value={{
        lang, categories, entries,
        problemCategory, setProblemCategory, problemNote, setProblemNote,
        solutionCategory, setSolutionCategory, solutionNote, setSolutionNote,
        staff, setStaff, saving, canSave, save,
      }}
    >
      {children}
    </CaseCommentCtx.Provider>
  );
}

const cardCls = "bg-white rounded-2xl shadow-sm p-5 mb-4";
const headCls = "text-xs font-bold text-gray-400 uppercase tracking-wider mb-1";
const selectCls =
  "w-full sm:w-44 rounded-lg border border-gray-200 px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200";
const inputCls =
  "flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200";

/** ปัญหา — what's blocking this case. Sits under จุดแข็ง in the left column. */
export function ProblemCard() {
  const c = useCaseComment();
  const problems = c.categories.filter((x) => x.kind === "problem");
  return (
    <div className={cardCls}>
      <h2 className={headCls}>{t(c.lang, "ปัญหา (ภายใน)", "Problem (internal)")}</h2>
      <p className="text-xs text-gray-400 mb-3">
        {t(c.lang,
          "เลือกหมวดก่อนแล้วค่อยใส่รายละเอียด — หมวดปัญหาถูกใช้เป็นเงื่อนไขยิงข้อความอัตโนมัติ (Broadcast)",
          "Pick a category, then add detail — problem categories drive automatic broadcast targeting")}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select value={c.problemCategory} onChange={(e) => c.setProblemCategory(e.target.value)} className={selectCls}>
          <option value="">{t(c.lang, "— เลือกหมวด —", "— category —")}</option>
          {problems.map((p) => (
            <option key={p.key} value={p.key}>{c.lang === "en" ? p.label_en || p.label_th : p.label_th}</option>
          ))}
        </select>
        <input
          type="text"
          value={c.problemNote}
          onChange={(e) => c.setProblemNote(e.target.value)}
          placeholder={t(c.lang, "รายละเอียด (ไม่บังคับ)", "Detail (optional)")}
          className={inputCls}
        />
      </div>
    </div>
  );
}

/** แนวทาง — how we solve it, plus the save button and the paired history. Sits under
 * "ที่เราจะช่วยเสริม", so the column reads diagnosis → plan on both the customer-facing
 * side and the internal side. */
export function SolutionCard() {
  const c = useCaseComment();
  const solutions = c.categories.filter((x) => x.kind === "solution");
  const catLabel = (key: string | null) => {
    if (!key) return null;
    const found = c.categories.find((x) => x.key === key);
    return found ? (c.lang === "en" ? found.label_en || found.label_th : found.label_th) : key;
  };
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(c.lang === "en" ? "en-GB" : "th-TH", {
      timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className={cardCls}>
      <h2 className={headCls}>{t(c.lang, "แนวทางแก้ (ภายใน)", "Solution (internal)")}</h2>
      <p className="text-xs text-gray-400 mb-3">
        {t(c.lang,
          "บันทึกครั้งเดียวจะเก็บปัญหาด้านบนกับแนวทางนี้เป็นคู่เดียวกัน",
          "Saving records the problem above and this solution as one paired entry")}
      </p>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select value={c.solutionCategory} onChange={(e) => c.setSolutionCategory(e.target.value)} className={selectCls}>
            <option value="">{t(c.lang, "— เลือกหมวด —", "— category —")}</option>
            {solutions.map((s) => (
              <option key={s.key} value={s.key}>{c.lang === "en" ? s.label_en || s.label_th : s.label_th}</option>
            ))}
          </select>
          <input
            type="text"
            value={c.solutionNote}
            onChange={(e) => c.setSolutionNote(e.target.value)}
            placeholder={t(c.lang, "รายละเอียด (ไม่บังคับ)", "Detail (optional)")}
            className={inputCls}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <input
            type="text"
            value={c.staff}
            onChange={(e) => c.setStaff(e.target.value)}
            placeholder={t(c.lang, "ผู้บันทึก", "Staff")}
            className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            onClick={c.save}
            disabled={!c.canSave || c.saving}
            className="rounded-lg px-4 py-2 text-xs font-bold bg-gray-800 text-white transition-opacity disabled:opacity-40"
          >
            {c.saving ? t(c.lang, "กำลังบันทึก…", "Saving…") : t(c.lang, "บันทึกปัญหา + แนวทาง", "Log problem + solution")}
          </button>
        </div>
      </div>

      {c.entries.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-gray-50 pt-3">
          {c.entries.map((e) => (
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
