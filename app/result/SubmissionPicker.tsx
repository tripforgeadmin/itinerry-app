"use client";

import { useRouter } from "next/navigation";

export interface SubmissionOption {
  id: string;
  label: string;
}

export default function SubmissionPicker({
  options,
  activeId,
}: {
  options: SubmissionOption[];
  activeId: string;
}) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/result?id=${e.target.value}`);
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <label htmlFor="submission-picker" className="text-xs font-bold text-muted shrink-0">
        เลือกครั้งที่ส่ง
      </label>
      <select
        id="submission-picker"
        value={activeId}
        onChange={handleChange}
        className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm text-primary shadow-card"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
