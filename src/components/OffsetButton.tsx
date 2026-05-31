"use client";

import { ButtonHTMLAttributes } from "react";

interface OffsetButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "lime" | "pink" | "black";
  size?: "sm" | "md" | "lg";
}

export function OffsetButton({
  variant = "lime",
  size = "md",
  className = "",
  children,
  ...props
}: OffsetButtonProps) {
  const shadowClass =
    variant === "lime"
      ? "shadow-offset-lime"
      : variant === "pink"
        ? "shadow-offset-pink"
        : "shadow-offset-black";

  const sizeClass =
    size === "sm"
      ? "px-3 py-1 text-xs"
      : size === "lg"
        ? "px-6 py-3 text-sm font-bold"
        : "px-4 py-2 text-xs";

  return (
    <button
      className={`
        bg-[#1F1A14] text-white border border-[#1F1A14]
        font-bold tracking-wide uppercase
        active:translate-x-[3px] active:translate-y-[3px] active:shadow-none
        transition-transform cursor-pointer
        ${shadowClass} ${sizeClass} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
