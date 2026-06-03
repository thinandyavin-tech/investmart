import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline";
  /** @deprecated offset is kept for backwards compatibility but has no visual effect */
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
      ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
      : "bg-white dark:bg-slate-900 rounded-xl shadow-card border border-slate-100 dark:border-slate-700";

  return (
    <div className={`${base} ${className}`} {...props}>
      {children}
    </div>
  );
}
