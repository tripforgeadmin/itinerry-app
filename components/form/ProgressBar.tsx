"use client";

interface ProgressBarProps {
  current: number;
  total: number;
  stepTitle: string;
}

export function ProgressBar({ current, total, stepTitle }: ProgressBarProps) {
  const pct = Math.round(((current + 1) / total) * 100);

  return (
    <div className="w-full px-4 pt-4 pb-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted">
          {current + 1} / {total}
        </span>
        <span className="text-xs font-semibold text-primary">{stepTitle}</span>
        <span className="text-xs text-muted">{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #44a8db, #00c3ff)",
          }}
        />
      </div>
    </div>
  );
}
