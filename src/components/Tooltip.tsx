interface TooltipProps {
  text: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
}

export function Tooltip({ text, children, side = "top" }: TooltipProps) {
  const positionClass =
    side === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
      : "top-full left-1/2 -translate-x-1/2 mt-2";

  return (
    <span className="relative group inline-flex cursor-help">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${positionClass} z-50 hidden group-hover:block w-52 px-2.5 py-2 text-[9px] text-white bg-slate-900 rounded-lg leading-relaxed whitespace-normal shadow-lg`}
      >
        {text}
      </span>
    </span>
  );
}
