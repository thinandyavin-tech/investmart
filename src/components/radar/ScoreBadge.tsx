interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const dim = size === "sm" ? 36 : 52;
  const fontSize = size === "sm" ? 11 : 14;

  return (
    <div
      className="flex flex-col items-center justify-center border-2 border-[#1F1A14] rounded-full"
      style={{ width: dim, height: dim, background: "#F3EDE0", flexShrink: 0 }}
      aria-label={`Score ${score}`}
    >
      <span
        className="font-bold leading-none"
        style={{ fontSize, fontFamily: "var(--font-mono)" }}
      >
        {score}
      </span>
      <span className="text-[7px] uppercase tracking-widest text-[#8A8378]">
        SCORE
      </span>
    </div>
  );
}
