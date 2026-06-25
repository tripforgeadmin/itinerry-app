"use client";

interface OptionButtonProps {
  label: string;
  emoji?: string;
  selected: boolean;
  onClick: () => void;
  multiSelect?: boolean;
}

export function OptionButton({
  label,
  emoji,
  selected,
  onClick,
  multiSelect,
}: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all duration-150",
        "font-medium text-sm active:scale-[0.98]",
        selected
          ? "border-accent bg-accent-bg text-primary shadow-card"
          : "border-border bg-card text-primary-mid hover:border-accent-tint hover:bg-accent-bg/50",
      ].join(" ")}
    >
      {multiSelect ? (
        <span
          className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 ${
            selected ? "border-accent bg-accent" : "border-border"
          }`}
        >
          {selected && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          )}
        </span>
      ) : (
        <span
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            selected ? "border-accent" : "border-border"
          }`}
        >
          {selected && <span className="w-2.5 h-2.5 rounded-full bg-accent" />}
        </span>
      )}
      {emoji && <span className="text-base">{emoji}</span>}
      <span>{label}</span>
    </button>
  );
}
