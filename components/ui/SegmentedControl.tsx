"use client";

interface Segment {
  value: string;
  label: string;
  sub?: string;
}

interface SegmentedControlProps {
  segments: Segment[];
  value: string | null;
  onChange: (v: string) => void;
  /** Defaults to one column per segment. */
  columns?: number;
  /** Selected color: "accent" (default) or "warning" for sensitive "เคย"-style answers. */
  tone?: "accent" | "warning";
}

/** Equal-cell selector: Y/N (refused/overstay), 3-cell (empdoc), time slots (contact). */
export function SegmentedControl({ segments, value, onChange, columns, tone = "accent" }: SegmentedControlProps) {
  const cols = columns ?? segments.length;
  const selectedCls =
    tone === "warning"
      ? "border-warning bg-yellow-pale text-warning-deep"
      : "border-accent bg-accent-subtle text-primary";

  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {segments.map((s) => {
        const active = value === s.value;
        return (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(s.value)}
            className={
              "flex flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-3 py-4 text-center transition-colors " +
              (active ? selectedCls : "border-border bg-card text-muted hover:border-border-mid")
            }
          >
            <span className="text-sm font-bold">{s.label}</span>
            {s.sub && <span className="text-[11px] font-medium opacity-80">{s.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}
