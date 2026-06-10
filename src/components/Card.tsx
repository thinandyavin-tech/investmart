import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "ghost";
  /** @deprecated kept for backwards compatibility, has no visual effect */
  offset?: "pink" | "none";
}

export function Card({
  variant = "default",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  offset,
  className = "",
  children,
  ...props
}: CardProps) {
  const base =
    variant === "outline"
      ? "bg-transparent border border-[#E0D9CC]"
      : variant === "ghost"
        ? "bg-transparent"
        : "bg-[#FDFAF4]/90 border border-[#E0D9CC] shadow-card backdrop-blur-sm";

  return (
    <div className={`${base} ${className}`} {...props}>
      {children}
    </div>
  );
}
