import type { StockMetrics } from "@/lib/momentum";

const CATEGORY_CONFIG = {
  TOP100: {
    label: "TOP 100",
    icon: (
      <svg width="20" height="16" viewBox="0 0 20 16" style={{ imageRendering: "pixelated" }}>
        <rect x="1" y="11" width="3" height="4" fill="currentColor" />
        <rect x="6" y="7"  width="3" height="8" fill="currentColor" />
        <rect x="11" y="4" width="3" height="11" fill="currentColor" />
        <rect x="16" y="1" width="3" height="14" fill="currentColor" />
      </svg>
    ),
  },
  DARK_HORSE: {
    label: "ม้ามืด",
    icon: (
      <svg width="20" height="16" viewBox="0 0 20 16" style={{ imageRendering: "pixelated" }}>
        <rect x="8" y="1" width="4" height="2" fill="currentColor" />
        <rect x="6" y="3" width="8" height="2" fill="currentColor" />
        <rect x="4" y="5" width="10" height="4" fill="currentColor" />
        <rect x="4" y="9" width="2" height="6" fill="currentColor" />
        <rect x="8" y="9" width="2" height="6" fill="currentColor" />
        <rect x="12" y="9" width="2" height="4" fill="currentColor" />
        <rect x="14" y="7" width="2" height="2" fill="currentColor" />
      </svg>
    ),
  },
  REVIVED: {
    label: "คืนชีพ",
    icon: (
      <svg width="20" height="16" viewBox="0 0 20 16" style={{ imageRendering: "pixelated" }}>
        <rect x="6" y="3" width="8" height="1" fill="currentColor" />
        <rect x="4" y="4" width="12" height="9" fill="currentColor" />
        <rect x="5" y="5" width="10" height="7" fill="white" />
        <rect x="8" y="6" width="4" height="1" fill="currentColor" />
        <rect x="9" y="7" width="2" height="3" fill="currentColor" />
        <rect x="2" y="13" width="16" height="2" fill="currentColor" />
      </svg>
    ),
  },
  STRONG: {
    label: "หุ้นแกร่ง",
    icon: (
      <svg width="20" height="16" viewBox="0 0 20 16" style={{ imageRendering: "pixelated" }}>
        <rect x="8" y="2" width="6" height="4" fill="currentColor" />
        <rect x="6" y="3" width="2" height="2" fill="currentColor" />
        <rect x="4" y="6" width="12" height="4" fill="currentColor" />
        <rect x="6" y="10" width="8" height="3" fill="currentColor" />
        <rect x="14" y="8" width="4" height="2" fill="currentColor" />
        <rect x="16" y="6" width="2" height="2" fill="currentColor" />
      </svg>
    ),
  },
} as const;

interface CategoryBadgeProps {
  category: StockMetrics["category"];
  active?:  boolean;
  onClick?: () => void;
}

export function CategoryBadge({ category, active, onClick }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category];

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3D9A] focus-visible:ring-offset-1 rounded-xl border transition-colors ${
        active
          ? "bg-slate-900 border-slate-900 text-white"
          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
      aria-pressed={active}
      aria-label={`กรองหมวด ${config.label}`}
    >
      {/* accent strip */}
      <div className="w-full h-1 rounded-t-xl" style={{ background: "#FF3D9A" }} />
      <div className="px-3 py-1.5 flex flex-col items-center gap-1">
        <div className={active ? "text-white" : "text-slate-700"}>
          {config.icon}
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-wide">
          {config.label}
        </span>
      </div>
    </button>
  );
}
