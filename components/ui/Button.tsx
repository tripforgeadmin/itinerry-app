"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "line" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-extrabold text-base " +
  "px-6 py-4 transition-all duration-200 active:scale-[0.98] select-none " +
  "disabled:cursor-not-allowed disabled:active:scale-100";

const variants: Record<ButtonVariant, string> = {
  // Primary yellow CTA (design spec §3) — glow shadow, muted when disabled.
  primary:
    "bg-yellow text-on-yellow shadow-[0_6px_20px_-4px_rgba(255,209,102,0.6)] " +
    "hover:bg-yellow-hover disabled:bg-surface-soft disabled:text-muted-soft disabled:shadow-none",
  // LINE green CTA.
  line:
    "bg-line text-white shadow-[0_6px_20px_-4px_rgba(6,199,85,0.5)] hover:brightness-95 " +
    "disabled:bg-surface-soft disabled:text-muted-soft disabled:shadow-none",
  ghost: "bg-transparent text-muted hover:text-primary hover:bg-surface-soft",
};

/** Primary action pill. Consumes Phase-1 color tokens (no raw hex). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", fullWidth = true, className = "", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    />
  );
});
