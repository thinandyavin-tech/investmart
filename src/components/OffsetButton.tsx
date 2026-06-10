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
      ? "bg-[#16A34A] text-white hover:bg-[#15803D] active:bg-[#166534] focus-visible:ring-[#16A34A]"
      : variant === "pink"
        ? "bg-[#EC4899] text-white hover:bg-[#DB2777] active:bg-[#BE185D] focus-visible:ring-[#EC4899]"
        : variant === "white"
          ? "bg-white text-[#1F1A14] border border-[#D0C8B8] hover:bg-[#F8F5EF] active:bg-[#EDE7D9] focus-visible:ring-[#1F1A14]"
          : "bg-[#1F1A14] text-white hover:bg-[#302820] active:bg-[#000000] focus-visible:ring-[#1F1A14]";

  const sizeClass =
    size === "sm"
      ? "px-3 py-1.5 text-xs min-h-[32px]"
      : size === "lg"
        ? "px-6 py-3 text-sm font-semibold min-h-[48px]"
        : "px-4 py-2 text-sm min-h-[38px]";

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-1.5
        font-semibold tracking-wide
        transition-all duration-150
        cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
        select-none
        ${variantClass} ${sizeClass} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
