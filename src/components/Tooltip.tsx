interface TooltipProps {
  text: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
}

export function Tooltip({ text, children, side = "top" }: TooltipProps) {
  const positionClass =
    side === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 mb-1.5"
      : "top-full left-1/2 -translate-x-1/2 mt-1.5";

  return (
    <span className="relative group inline-flex cursor-help">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${positionClass} z-50 hidden group-hover:block w-52 px-2 py-1.5 text-[9px] text-white bg-[#1F1A14] leading-relaxed whitespace-normal`}
        style={{ boxShadow: "2px 2px 0 #5B8A2A" }}
      >
        {text}
      </span>
    </span>
  );
}
