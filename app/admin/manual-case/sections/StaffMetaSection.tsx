"use client";

import { SectionCard } from "../FormField";
import { t, type Lang } from "@/lib/i18n";

export default function StaffMetaSection({
  staffName,
  setStaffName,
  lang,
}: {
  staffName: string;
  setStaffName: (v: string) => void;
  lang: Lang;
}) {
  return (
    <SectionCard title={t(lang, "ผู้กรอกเคสนี้", "Entered by")}>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          {t(lang, "ชื่อเจ้าหน้าที่", "Staff name")}
          <span className="text-red-500 ml-0.5">*</span>
        </label>
        <input
          type="text"
          value={staffName}
          onChange={(e) => setStaffName(e.target.value)}
          placeholder={t(lang, "พิมพ์ชื่อของคุณ", "Type your name")}
          className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>
    </SectionCard>
  );
}
