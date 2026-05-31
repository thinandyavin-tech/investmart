import type { StockMetrics } from "@/lib/momentum";

const CATEGORY_CONFIG = {
  TOP100: {
    label: "TOP 100",
    labelTh: "TOP 100",
    bg: "#F3EDE0",
    icon: (
      // Pixel-art rising bar chart
      <svg width="20" height="16" viewBox="0 0 20 16" style={{ imageRendering: "pixelated" }}>
        <rect x="1" y="11" width="3" height="4" fill="#1F1A14" />
        <rect x="6" y="7"  width="3" height="8" fill="#1F1A14" />
        <rect x="11" y="4" width="3" height="11" fill="#1F1A14" />
        <rect x="16" y="1" width="3" height="14" fill="#1F1A14" />
      </svg>
    ),
  },
  DARK_HORSE: {
    label: "ม้ามืด",
    labelTh: "Dark Horse",
    bg: "#F3EDE0",
    icon: (
      // Pixel-art horse silhouette
      <svg width="20" height="16" viewBox="0 0 20 16" style={{ imageRendering: "pixelated" }}>
        <rect x="8" y="1" width="4" height="2" fill="#1F1A14" />
        <rect x="6" y="3" width="8" height="2" fill="#1F1A14" />
        <rect x="4" y="5" width="10" height="4" fill="#1F1A14" />
        <rect x="4" y="9" width="2" height="6" fill="#1F1A14" />
        <rect x="8" y="9" width="2" height="6" fill="#1F1A14" />
        <rect x="12" y="9" width="2" height="4" fill="#1F1A14" />
        <rect x="14" y="7" width="2" height="2" fill="#1F1A14" />
      </svg>
    ),
  },
  REVIVED: {
    label: "คืนชีพ",
    labelTh: "Revived",
    bg: "#F3EDE0",
    icon: (
      // Pixel-art tombstone
      <svg width="20" height="16" viewBox="0 0 20 16" style={{ imageRendering: "pixelated" }}>
        <rect x="6" y="3" width="8" height="1" fill="#1F1A14" />
        <rect x="4" y="4" width="12" height="9" fill="#1F1A14" />
        <rect x="5" y="5" width="10" height="7" fill="#F3EDE0" />
        <rect x="8" y="6" width="4" height="1" fill="#1F1A14" />
        <rect x="9" y="7" width="2" height="3" fill="#1F1A14" />
        <rect x="2" y="13" width="16" height="2" fill="#1F1A14" />
      </svg>
    ),
  },
  STRONG: {
    label: "หุ้นแกร่ง",
    labelTh: "Strong",
    bg: "#F3EDE0",
    icon: (
      // Pixel-art flexing arm
      <svg width="20" height="16" viewBox="0 0 20 16" style={{ imageRendering: "pixelated" }}>
        <rect x="8" y="2" width="6" height="4" fill="#1F1A14" />
        <rect x="6" y="3" width="2" height="2" fill="#1F1A14" />
        <rect x="4" y="6" width="12" height="4" fill="#1F1A14" />
        <rect x="6" y="10" width="8" height="3" fill="#1F1A14" />
        <rect x="14" y="8" width="4" height="2" fill="#1F1A14" />
        <rect x="16" y="6" width="2" height="2" fill="#1F1A14" />
      </svg>
    ),
  },
} as const;

interface CategoryBadgeProps {
  category: StockMetrics["category"];
  active?: boolean;
  onClick?: () => void;
}

export function CategoryBadge({ category, active, onClick }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category];

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center cursor-pointer focus:outline-none"
      aria-pressed={active}
      aria-label={`กรองหมวด ${config.label}`}
    >
      <div
        className="border-2 border-[#1F1A14] flex flex-col items-center"
        style={{
          background: active ? "#1F1A14" : "#F3EDE0",
          boxShadow: active ? "none" : "2px 2px 0 #FF3D9A",
        }}
      >
        {/* Pink strip at top */}
        <div style={{ width: "100%", height: 4, background: "#FF3D9A" }} />
        <div className="px-3 py-2 flex flex-col items-center gap-1">
          <div style={{ filter: active ? "invert(1)" : "none" }}>
            {config.icon}
          </div>
          <span
            className="text-[9px] font-bold uppercase tracking-wide"
            style={{ color: active ? "#F3EDE0" : "#1F1A14" }}
          >
            {config.label}
          </span>
        </div>
      </div>
    </button>
  );
}
