import { getTierInfo, type TierKey } from "@/lib/traderTier";

interface TierBadgeProps {
  tier:  TierKey;
  size?: "xs" | "sm";
  showLabel?: boolean;
}

export function TierBadge({ tier, size = "sm", showLabel = true }: TierBadgeProps) {
  const info = getTierInfo(tier);
  const px   = size === "xs" ? "px-1.5 py-0.5" : "px-2 py-0.5";
  const text = size === "xs" ? "text-[10px]"    : "text-xs";

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-widest rounded-sm ${px} ${text} flex-shrink-0`}
      style={{
        background:   info.color,
        color:        info.text,
        border:       `1px solid ${info.border}`,
        fontFamily:   "var(--font-mono, monospace)",
        letterSpacing: "0.08em",
      }}
      title={info.next ?? `${info.label} — ระดับสูงสุด`}
      aria-label={`Tier: ${info.label}`}
    >
      {showLabel ? info.en : info.en[0]}
    </span>
  );
}
