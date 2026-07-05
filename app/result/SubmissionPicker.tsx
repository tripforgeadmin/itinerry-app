"use client";

import { useRouter } from "next/navigation";

export interface SubmissionOption {
  id: string;
  isLatest: boolean;
  dateLabel: string;
  destination: string;
  visaType: string;
  statusLabel: string;
  statusColor: string;
}

export default function SubmissionPicker({
  options,
  activeId,
}: {
  options: SubmissionOption[];
  activeId: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2 mb-4">
      {options.map((o) => {
        const isActive = o.id === activeId;
        return (
          <button
            key={o.id}
            onClick={() => router.push(`/result?id=${o.id}`)}
            className={`text-left bg-card rounded-2xl shadow-card p-4 transition-opacity ${
              isActive ? "ring-2 ring-accent" : "opacity-80 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-soft">
                {o.dateLabel}
                {o.isLatest && <span className="ml-1.5 text-accent font-bold">· ล่าสุด</span>}
              </span>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${o.statusColor}`}>{o.statusLabel}</span>
            </div>
            <p className="text-sm font-medium text-primary">
              {o.destination} · {o.visaType}
            </p>
          </button>
        );
      })}
    </div>
  );
}
