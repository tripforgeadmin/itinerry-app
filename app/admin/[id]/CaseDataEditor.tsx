"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "./ConfirmModal";
import DestinationVisaSection from "../manual-case/sections/DestinationVisaSection";
import TouristSection from "../manual-case/sections/TouristSection";
import VisitorSection from "../manual-case/sections/VisitorSection";
import BusinessSection from "../manual-case/sections/BusinessSection";
import StudentSection from "../manual-case/sections/StudentSection";
import PriorVisaSection from "../manual-case/sections/PriorVisaSection";
import OccupationSection from "../manual-case/sections/OccupationSection";
import EmployeeSection from "../manual-case/sections/EmployeeSection";
import FreelanceSection from "../manual-case/sections/FreelanceSection";
import BusinessOwnerSection from "../manual-case/sections/BusinessOwnerSection";
import DependentSection from "../manual-case/sections/DependentSection";
import CoreQualificationSection from "../manual-case/sections/CoreQualificationSection";
import { rowToAnswers, type EditableTrip } from "@/lib/manual-case-mapping";
import { label, tieLabel, pastVisaLabel, refusedText, overstayText, LABELS, LABELS_EN } from "@/lib/answer-labels";
import { t, type Lang } from "@/lib/i18n";

// Branch-driving radios clear their now-irrelevant dependent keys immediately, matching
// app/admin/manual-case/ManualCaseForm.tsx's behavior (no stale off-branch data on save).
const VISA_BRANCH_KEYS = ["q10", "q11", "q13", "q39", "q14", "q15", "q16", "q17", "q18", "q19", "q21", "q22", "q23"];
const OCCUPATION_BRANCH_KEYS = ["q25", "q26", "q27", "q28", "q29"];

/** Matches the <Row> helper in page.tsx — see ContactEditor.tsx for the same precedent. */
function ReadRow({ title, value }: { title: string; value?: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  const display = Array.isArray(value) ? value.join(", ") : String(value);
  return (
    <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 text-sm w-48 shrink-0">{title}</span>
      <span className="text-gray-800 text-sm font-medium">{display}</span>
    </div>
  );
}

function ReadSection({ title, menu, children }: { title: string; menu?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</h2>
        {menu}
      </div>
      {children}
    </div>
  );
}

export interface CaseDataEditorProps {
  assessmentId: string;
  lang: Lang;
  trip: EditableTrip;
  s: Record<string, unknown>;
}

export default function CaseDataEditor({ assessmentId, lang, trip, s }: CaseDataEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visaType = (trip.visa_type as string) ?? "";
  const occ = (s.occupation as string) ?? "";
  const b = (s.branch_answers ?? {}) as Record<string, string | string[]>;

  function startEdit() {
    setAnswers(
      rowToAnswers(
        {
          occupation: (s.occupation as string) ?? null,
          visa_refused: (s.visa_refused as boolean) ?? null,
          visa_refused_details: (s.visa_refused_details as string) ?? null,
          visa_refused_entries: s.visa_refused_entries ?? null,
          overstayed: (s.overstayed as boolean) ?? null,
          overstay_details: (s.overstay_details as string) ?? null,
          overstay_entries: s.overstay_entries ?? null,
          savings_balance: (s.savings_balance as string) ?? null,
          ties_thailand: (s.ties_thailand as string[]) ?? null,
          branch_answers: b,
        },
        trip
      )
    );
    setError(null);
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }
  function setVisaType(next: string) {
    setAnswers((prev) => {
      const cleared = { ...prev };
      for (const k of VISA_BRANCH_KEYS) delete cleared[k];
      return { ...cleared, q9: next };
    });
  }
  function setOccupation(next: string) {
    setAnswers((prev) => {
      const cleared = { ...prev };
      for (const k of OCCUPATION_BRANCH_KEYS) delete cleared[k];
      return { ...cleared, q24: next };
    });
  }

  function missingFields(): string[] {
    const m: string[] = [];
    if (!answers.q8 || !answers.q9) m.push(t(lang, "ปลายทาง + วีซ่า", "Destination + Visa"));
    if (answers.q9 === "tourist" && (!answers.q10 || !answers.q11)) m.push(t(lang, "วีซ่าท่องเที่ยว", "Tourist Visa"));
    if (answers.q9 === "visitor" && (!answers.q13 || !answers.q39 || !answers.q14 || !answers.q15 || !answers.q16))
      m.push(t(lang, "วีซ่าเยี่ยมเยียน", "Visitor Visa"));
    if (answers.q9 === "business" && (!answers.q17 || !answers.q18 || !answers.q19)) m.push(t(lang, "วีซ่าธุรกิจ", "Business Visa"));
    if (answers.q9 === "student" && !answers.q21) m.push(t(lang, "วีซ่านักเรียน", "Student Visa"));
    if (!answers.q24) m.push(t(lang, "อาชีพ", "Occupation"));
    if ((answers.q24 === "employee" || answers.q24 === "government") && !answers.q25) m.push(t(lang, "เอกสารพนักงาน", "Employee docs"));
    if (answers.q24 === "freelance" && (!answers.q26 || !answers.q27)) m.push(t(lang, "เอกสาร Freelance", "Freelance docs"));
    if (answers.q24 === "business_owner" && !answers.q28) m.push(t(lang, "หนังสือรับรองบริษัท", "Business registration"));
    if (["retired", "homemaker", "student_occ"].includes(answers.q24) && !answers.q29)
      m.push(t(lang, "ผู้รับผิดชอบค่าใช้จ่าย", "Expense sponsor"));
    if (!answers.q30 || !answers.q32) m.push(t(lang, "คัดกรองหลัก", "Core Qualification"));
    if (answers.q30 === "yes" && !answers.q31_entries) m.push(t(lang, "รายละเอียดการถูกปฏิเสธวีซ่า", "Visa refusal details"));
    if (answers.q32 === "yes" && !answers.q33_entries) m.push(t(lang, "รายละเอียด Overstay", "Overstay details"));
    if (answers.q9 !== "student" && !answers.q34) m.push(t(lang, "ยอดเงินในบัญชี", "Savings balance"));
    if (!answers.q35) m.push(t(lang, "ความผูกพันกับไทย", "Ties to Thailand"));
    return m;
  }

  function requestSave() {
    const m = missingFields();
    if (m.length > 0) {
      setError(t(lang, "กรอกไม่ครบ: ", "Incomplete: ") + m.join(", "));
      return;
    }
    setError(null);
    setConfirming(true);
  }

  async function confirmSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/edit-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? "failed");
      setConfirming(false);
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง", "Save failed. Please try again."));
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="mb-4">
        <div className="bg-amber-50 rounded-2xl p-4 mb-3 text-sm text-amber-800">
          {t(
            lang,
            "⚠️ กำลังแก้ไขข้อมูลที่ลูกค้าส่งมา (S2-S5) — ระบบจะประเมินผลอัตโนมัติใหม่ทันทีหลังบันทึก",
            "⚠️ Editing customer-submitted data (S2-S5) — the auto evaluation will be re-run immediately after saving"
          )}
        </div>

        <DestinationVisaSection answers={answers} setVisaType={setVisaType} setAnswer={setAnswer} lang={lang} />
        {answers.q9 === "tourist" && <TouristSection answers={answers} setAnswer={setAnswer} lang={lang} />}
        {answers.q9 === "visitor" && <VisitorSection answers={answers} setAnswer={setAnswer} lang={lang} />}
        {answers.q9 === "business" && <BusinessSection answers={answers} setAnswer={setAnswer} lang={lang} />}
        {answers.q9 === "student" && <StudentSection answers={answers} setAnswer={setAnswer} lang={lang} />}
        <PriorVisaSection answers={answers} setAnswer={setAnswer} lang={lang} />
        <OccupationSection answers={answers} setOccupation={setOccupation} lang={lang} />
        {(answers.q24 === "employee" || answers.q24 === "government") && (
          <EmployeeSection answers={answers} setAnswer={setAnswer} lang={lang} />
        )}
        {answers.q24 === "freelance" && <FreelanceSection answers={answers} setAnswer={setAnswer} lang={lang} />}
        {answers.q24 === "business_owner" && <BusinessOwnerSection answers={answers} setAnswer={setAnswer} lang={lang} />}
        {["retired", "homemaker", "student_occ"].includes(answers.q24) && (
          <DependentSection answers={answers} setAnswer={setAnswer} lang={lang} />
        )}
        <CoreQualificationSection answers={answers} setAnswer={setAnswer} lang={lang} />

        {error && <div className="bg-red-50 text-red-700 rounded-2xl p-4 mb-4 text-sm whitespace-pre-line">{error}</div>}

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={requestSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
          >
            {t(lang, "บันทึก", "Save")}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            className="rounded-lg bg-gray-100 px-4 py-1.5 text-xs font-medium text-gray-600 disabled:opacity-40"
          >
            {t(lang, "ยกเลิก", "Cancel")}
          </button>
        </div>

        <ConfirmModal
          open={confirming}
          title={t(lang, "ยืนยันการแก้ไข", "Confirm edit")}
          message={t(
            lang,
            "คุณกำลังจะแก้ไขข้อมูลที่ลูกค้าส่งมา ระบบจะประเมินผลอัตโนมัติใหม่ทันทีหลังบันทึก ต้องการดำเนินการต่อหรือไม่?",
            "You're about to edit customer-submitted data. The auto evaluation will be re-run immediately after saving. Continue?"
          )}
          confirmLabel={saving ? t(lang, "กำลังบันทึก…", "Saving…") : t(lang, "ยืนยันบันทึก", "Confirm save")}
          cancelLabel={t(lang, "ยกเลิก", "Cancel")}
          loading={saving}
          onConfirm={confirmSave}
          onCancel={() => setConfirming(false)}
        />
      </div>
    );
  }

  const editButton = (
    <button
      type="button"
      onClick={startEdit}
      className="rounded-full border border-blue-500 px-3 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50"
    >
      ✎ {t(lang, "แก้ไขข้อมูล", "Edit data")}
    </button>
  );

  return (
    <>
      <ReadSection title={t(lang, "S2 · ปลายทาง + วีซ่า", "S2 · Destination + visa")} menu={editButton}>
        <ReadRow title={t(lang, "ประเทศปลายทาง", "Destination")} value={(trip.destination as string)?.toUpperCase()} />
        <ReadRow title={t(lang, "ประเภทวีซ่า", "Visa type")} value={label("visa_type", trip.visa_type, lang)} />
        {(visaType === "tourist" || visaType === "visitor" || visaType === "business") && (
          <ReadRow title={t(lang, "วันเดินทาง", "Travel date")} value={trip.travel_arrival} />
        )}
        {(visaType === "tourist" || visaType === "business") && (
          <ReadRow title={t(lang, "วันกลับ", "Return date")} value={trip.travel_return} />
        )}
        {visaType === "student" && <ReadRow title={t(lang, "วันเริ่มเรียน", "Study start")} value={trip.study_start} />}
        {(() => {
          const pv = b.previous_visas ?? b.tourist_previous_visas ?? b.business_previous_visas;
          return Array.isArray(pv) ? (
            <ReadRow
              title={t(lang, "วีซ่าที่เคยได้รับ (5 ปี)", "Past visas (5y)")}
              value={(pv as string[]).map((v) => pastVisaLabel(v, lang)).join(", ")}
            />
          ) : null;
        })()}
        {visaType === "visitor" && (
          <ReadRow title={t(lang, "สถานะผู้เชิญ", "Host status")} value={label("visitor_host_status", b.visitor_host_status as string, lang)} />
        )}
        {visaType === "visitor" && (
          <ReadRow title={t(lang, "ความสัมพันธ์", "Relationship")} value={label("visitor_relationship", b.visitor_relationship as string, lang)} />
        )}
        {visaType === "visitor" && Array.isArray(b.visitor_host_documents) && (
          <ReadRow
            title={t(lang, "เอกสารที่ผู้เชิญมี", "Host's documents")}
            value={(b.visitor_host_documents as string[])
              .map((v) => (lang === "en" ? LABELS_EN.visitor_host_documents?.[v] : undefined) ?? LABELS.visitor_host_documents[v] ?? v)
              .join(", ")}
          />
        )}
        {visaType === "business" && (
          <ReadRow title="Invitation Letter" value={label("business_invitation_letter", b.business_invitation_letter as string, lang)} />
        )}
        {visaType === "student" && (
          <ReadRow title="Acceptance Letter" value={label("student_acceptance_letter", b.student_acceptance_letter as string, lang)} />
        )}
        {visaType === "student" && (
          <ReadRow title={t(lang, "ผู้รับผิดชอบค่าเรียน", "Tuition sponsor")} value={label("student_expense_sponsor", b.student_expense_sponsor as string, lang)} />
        )}
      </ReadSection>

      <ReadSection title={t(lang, "S3–S4 · อาชีพ", "S3–S4 · Occupation")}>
        <ReadRow title={t(lang, "อาชีพ", "Occupation")} value={label("occupation", occ, lang)} />
        {(occ === "employee" || occ === "government") && (
          <ReadRow title={t(lang, "หนังสือรับรองงาน", "Work certificate")} value={label("employee_work_letter", b.employee_work_letter as string, lang)} />
        )}
        {occ === "freelance" && (
          <ReadRow title={t(lang, "เอกสารพิสูจน์รายได้", "Income proof")} value={label("freelance_income_proof", b.freelance_income_proof as string, lang)} />
        )}
        {occ === "freelance" && (
          <ReadRow title={t(lang, "เอกสารภาษี 3 ปี", "3-year tax docs")} value={label("freelance_tax_history", b.freelance_tax_history as string, lang)} />
        )}
        {occ === "business_owner" && (
          <ReadRow title={t(lang, "หนังสือรับรองบริษัท", "Business registration")} value={label("business_registration", b.business_registration as string, lang)} />
        )}
        {(occ === "retired" || occ === "homemaker" || occ === "student_occ") && (
          <ReadRow
            title={t(lang, "ผู้รับผิดชอบค่าเดินทาง", "Travel-cost sponsor")}
            value={label("dependent_expense_sponsor", b.dependent_expense_sponsor as string, lang)}
          />
        )}
      </ReadSection>

      <ReadSection title={t(lang, "S5 · คัดกรองหลัก", "S5 · Main screening")}>
        <ReadRow title={t(lang, "ถูกปฏิเสธวีซ่า", "Visa refusal")} value={refusedText(s, lang)} />
        <ReadRow title="Overstay" value={overstayText(s, lang)} />
        <ReadRow title={t(lang, "เงินในบัญชี", "Savings balance")} value={label("savings_balance", s.savings_balance, lang)} />
        <ReadRow
          title={t(lang, "ความผูกพันกับไทย", "Ties to Thailand")}
          value={(s.ties_thailand as string[])?.map((v) => tieLabel(v, lang)).join(", ")}
        />
      </ReadSection>
    </>
  );
}
