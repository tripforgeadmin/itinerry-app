"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import ConsentSection from "./sections/ConsentSection";
import PersonalSection from "./sections/PersonalSection";
import DestinationVisaSection from "./sections/DestinationVisaSection";
import TouristSection from "./sections/TouristSection";
import VisitorSection from "./sections/VisitorSection";
import BusinessSection from "./sections/BusinessSection";
import StudentSection from "./sections/StudentSection";
import PriorVisaSection from "./sections/PriorVisaSection";
import OccupationSection from "./sections/OccupationSection";
import EmployeeSection from "./sections/EmployeeSection";
import FreelanceSection from "./sections/FreelanceSection";
import BusinessOwnerSection from "./sections/BusinessOwnerSection";
import DependentSection from "./sections/DependentSection";
import CoreQualificationSection from "./sections/CoreQualificationSection";
import ContactPreferenceSection from "./sections/ContactPreferenceSection";
import IntentSection from "./sections/IntentSection";
import StaffMetaSection from "./sections/StaffMetaSection";

const VISA_BRANCH_KEYS = [
  "q10", "q11", // tourist
  "q13", "q39", "q14", "q15", "q16", // visitor
  "q17", "q18", "q19", // business
  "q21", "q22", "q23", // student
];
const OCCUPATION_BRANCH_KEYS = ["q25", "q26", "q27", "q28", "q29"];

export default function ManualCaseForm({ lang = "th" }: { lang?: Lang }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [staffName, setStaffName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  // Branch-driving radios clear their now-irrelevant dependent keys immediately, so stale
  // off-branch data never accumulates in state (no post-hoc filtering needed later).
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

  function missingSections(): string[] {
    const missing: string[] = [];
    if (answers.q2 !== "true") missing.push(t(lang, "ความยินยอม", "Consent"));
    if (!answers.q3 || !answers.q4 || !answers.q5 || !answers.q6 || !answers.q7) missing.push(t(lang, "ข้อมูลส่วนตัว", "Personal Information"));
    if (!answers.q8 || !answers.q9) missing.push(t(lang, "ปลายทาง + วีซ่า", "Destination + Visa"));
    if (answers.q9 === "tourist" && (!answers.q10 || !answers.q11)) missing.push(t(lang, "วีซ่าท่องเที่ยว", "Tourist Visa"));
    if (answers.q9 === "visitor" && (!answers.q13 || !answers.q39 || !answers.q14 || !answers.q15 || !answers.q16)) missing.push(t(lang, "วีซ่าเยี่ยมเยียน", "Visitor Visa"));
    if (answers.q9 === "business" && (!answers.q17 || !answers.q18 || !answers.q19)) missing.push(t(lang, "วีซ่าธุรกิจ", "Business Visa"));
    if (answers.q9 === "student" && (!answers.q21 || !answers.q22 || !answers.q23)) missing.push(t(lang, "วีซ่านักเรียน", "Student Visa"));
    if (!answers.q12) missing.push(t(lang, "ประวัติวีซ่า", "Prior Visa History"));
    if (!answers.q24) missing.push(t(lang, "อาชีพ", "Occupation"));
    if ((answers.q24 === "employee" || answers.q24 === "government") && !answers.q25) missing.push(t(lang, "S4A", "S4A"));
    if (answers.q24 === "freelance" && (!answers.q26 || !answers.q27)) missing.push(t(lang, "S4B", "S4B"));
    if (answers.q24 === "business_owner" && !answers.q28) missing.push(t(lang, "S4C", "S4C"));
    if (["retired", "homemaker", "student_occ"].includes(answers.q24) && !answers.q29) missing.push(t(lang, "S4D", "S4D"));
    if (!answers.q30 || !answers.q32) missing.push(t(lang, "คัดกรองหลัก", "Core Qualification"));
    if (answers.q30 === "yes" && !answers.q31_entries) missing.push(t(lang, "รายละเอียดการถูกปฏิเสธวีซ่า", "Visa refusal details"));
    if (answers.q32 === "yes" && !answers.q33_entries) missing.push(t(lang, "รายละเอียด Overstay", "Overstay details"));
    if (answers.q9 !== "student" && !answers.q34) missing.push(t(lang, "ยอดเงินในบัญชี", "Savings balance"));
    if (!answers.q35) missing.push(t(lang, "ความผูกพันกับไทย", "Ties to Thailand"));
    if (!answers.q36) missing.push(t(lang, "ช่องทางติดต่อ", "Contact preference"));
    if (answers.q36 === "call" && (!answers.q37_date || !answers.q37)) missing.push(t(lang, "เวลานัดโทรกลับ", "Callback time"));
    if (!answers.q38) missing.push(t(lang, "ความต้องการ", "Intent"));
    if (!staffName.trim()) missing.push(t(lang, "ชื่อเจ้าหน้าที่", "Staff name"));
    return missing;
  }

  async function handleSubmit() {
    const missing = missingSections();
    if (missing.length > 0) {
      setError(t(lang, "กรอกไม่ครบ: ", "Incomplete: ") + missing.join(", "));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/manual-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffName: staffName.trim(), answers }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "failed");
      router.push(`/admin/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "บันทึกไม่สำเร็จ กรุณาลองใหม่", "Save failed, please try again"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <ConsentSection answers={answers} setAnswer={setAnswer} lang={lang} />
      <PersonalSection answers={answers} setAnswer={setAnswer} lang={lang} />
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
      <ContactPreferenceSection answers={answers} setAnswer={setAnswer} lang={lang} />
      <IntentSection answers={answers} setAnswer={setAnswer} lang={lang} />
      <StaffMetaSection staffName={staffName} setStaffName={setStaffName} lang={lang} />

      {error && (
        <div className="bg-red-50 text-red-700 rounded-2xl p-4 mb-4 text-sm whitespace-pre-line">{error}</div>
      )}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full rounded-2xl bg-blue-600 text-white font-bold py-3 disabled:opacity-40"
      >
        {saving ? t(lang, "กำลังบันทึก…", "Saving…") : t(lang, "บันทึกเคส", "Save case")}
      </button>
    </div>
  );
}
