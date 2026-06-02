"use client";

import { ButtonHTMLAttributes } from "react";

interface OffsetButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "lime" | "pink" | "black" | "white";
  size?: "sm" | "md" | "lg";
}

export function OffsetButton({
  variant = "lime",
  size = "md",
  className = "",
  children,
  ...props
}: OffsetButtonProps) {
  const variantClass =
    variant === "lime"
      ? "bg-[#16A34A] text-white hover:bg-[#15803D]"
      : variant === "pink"
        ? "bg-[#EC4899] text-white hover:bg-[#DB2777]"
        : variant === "white"
          ? "bg-white text-[#0F172A] border border-slate-200 hover:bg-slate-50"
          : "bg-[#0F172A] text-white hover:bg-[#1E293B]";

  const sizeClass =
    size === "sm"
      ? "px-3 py-1.5 text-xs"
      : size === "lg"
        ? "px-6 py-3 text-sm font-semibold"
        : "px-4 py-2 text-sm";

  return (
    <button
      className={`rounded-lg font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
