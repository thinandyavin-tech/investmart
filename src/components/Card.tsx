import { HTMLAttributes, CSSProperties } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "ghost";
  /** @deprecated kept for backwards compatibility, has no visual effect */
  offset?: "pink" | "none";
}

// Brutalist offset shadow shared across cards
const DEFAULT_STYLE: CSSProperties = {
  background: "#fefae0",
  border: "1px solid #ccd5ae",
  boxShadow: "2px 2px 0 #1F1A14",
};

export function Card({
  variant = "default",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  offset,
  className = "",
  style,
  children,
  ...props
}: CardProps) {
  const base =
    variant === "outline"
      ? "bg-transparent border border-[#ccd5ae]"
      : variant === "ghost"
        ? "bg-transparent"
        : "";

  const mergedStyle = variant === "default"
    ? { ...DEFAULT_STYLE, ...style }
    : style;

  return (
    <div className={`${base} ${className}`} style={mergedStyle} {...props}>
      {children}
    </div>
  );
}
