import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  offset?: "pink" | "none";
}

export function Card({
  offset = "none",
  className = "",
  children,
  ...props
}: CardProps) {
  const offsetClass = offset === "pink" ? "shadow-offset-pink" : "";

  return (
    <div
      className={`bg-[#F3EDE0] border border-[#1F1A14] ${offsetClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
