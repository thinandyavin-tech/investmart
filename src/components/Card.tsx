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
      ? "bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/30 dark:border-slate-700/40 rounded-xl"
      : "bg-white/75 dark:bg-slate-900/70 backdrop-blur-md rounded-xl shadow-card border border-white/40 dark:border-slate-700/60";

  return (
    <div className={`${base} ${className}`} {...props}>
      {children}
    </div>
  );
}
