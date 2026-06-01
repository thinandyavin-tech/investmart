import { Tooltip } from "@/components/Tooltip";

interface ScoreBadgeProps {
  score:   number;
  size?:   "sm" | "md";
  label?:  string;
  tooltip?: string;
}

export function ScoreBadge({ score, size = "md", label = "SCORE", tooltip }: ScoreBadgeProps) {
  const dim      = size === "sm" ? 36 : 52;
  const fontSize = size === "sm" ? 11 : 14;

  const badge = (
    <div
      className="flex flex-col items-center justify-center border-2 border-[#1F1A14] rounded-full"
      style={{ width: dim, height: dim, background: "#F3EDE0", flexShrink: 0 }}
      aria-label={`${label} ${score}`}
    >
      <span
        className="font-bold leading-none"
        style={{ fontSize, fontFamily: "var(--font-mono)" }}
      >
        {score}
      </span>
      <span className="text-[7px] uppercase tracking-widest text-[#8A8378]">
        {label.slice(0, 5)}
      </span>
    </div>
  );

  if (!tooltip) return badge;
  return <Tooltip text={tooltip}>{badge}</Tooltip>;
}
