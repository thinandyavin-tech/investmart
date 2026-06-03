import { Tooltip } from "@/components/Tooltip";

interface ScoreBadgeProps {
  score:    number;
  size?:    "sm" | "md";
  label?:   string;
  tooltip?: string;
}

export function ScoreBadge({ score, size = "md", label = "SCORE", tooltip }: ScoreBadgeProps) {
  const dim      = size === "sm" ? 36 : 52;
  const fontSize = size === "sm" ? 11 : 14;

  const scoreColor =
    score >= 70 ? "#16A34A" :
    score >= 40 ? "#0F172A" :
    "#DC2626";

  const badge = (
    <div
      className="flex flex-col items-center justify-center rounded-full border-2 bg-white"
      style={{ width: dim, height: dim, flexShrink: 0, borderColor: scoreColor }}
      aria-label={`${label} ${score}`}
    >
      <span
        className="font-bold leading-none"
        style={{ fontSize, fontFamily: "var(--font-mono)", color: scoreColor }}
      >
        {score}
      </span>
      <span className="text-[7px] uppercase tracking-widest text-slate-400">
        {label.slice(0, 5)}
      </span>
    </div>
  );

  if (!tooltip) return badge;
  return <Tooltip text={tooltip}>{badge}</Tooltip>;
}
