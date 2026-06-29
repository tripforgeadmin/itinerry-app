"use client";

import { InputHTMLAttributes } from "react";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  type?: "text" | "email" | "tel";
  /** Validation message (from getValidationError); shown in red under the field. */
  error?: string | null;
}

const INPUT_MODE = { text: "text", email: "email", tel: "tel" } as const;

/** Labeled input for text/email/tel fields (contact, "other" specify, reveal details). */
export function TextField({ label, type = "text", error, className = "", ...props }: TextFieldProps) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-semibold text-primary">{label}</span>}
      <input
        type={type}
        inputMode={INPUT_MODE[type]}
        className={
          "w-full rounded-2xl border bg-card px-4 py-3.5 text-primary outline-none transition-colors placeholder:text-muted-soft " +
          (error ? "border-red-alert focus:border-red-alert" : "border-border focus:border-accent") +
          " " + className
        }
        {...props}
      />
      {error && <span className="mt-1 block text-xs font-medium text-red-alert">{error}</span>}
    </label>
  );
}
