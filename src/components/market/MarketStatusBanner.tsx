"use client";

import { useEffect, useState } from "react";
import { getMarketInfo, formatCountdown, MarketInfo } from "@/lib/marketHours";

const STATUS_COLORS: Record<MarketInfo["status"], string> = {
  open:   "#5B8A2A",
  pre:    "#D97706",
  after:  "#1D4ED8",
  closed: "#8A8378",
};

export function MarketStatusBanner() {
  const [info, setInfo] = useState<MarketInfo>(() => getMarketInfo());

  useEffect(() => {
    const id = setInterval(() => setInfo(getMarketInfo()), 1000);
    return () => clearInterval(id);
  }, []);

  const color = STATUS_COLORS[info.status];

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b border-[#E8E2D4] bg-[#F3EDE0]"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase"
        style={{ background: color, color: "#fff" }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-white"
          style={info.status === "open" ? { animation: "pulse 1.5s ease-in-out infinite" } : undefined}
          aria-hidden="true"
        />
        {info.statusThai}
      </span>

      <span className="text-[11px] text-[#8A8378]">ตลาดหุ้นสหรัฐ (ET)</span>

      {info.secsToChange !== null && (
        <span
          className="ml-auto text-[11px] font-bold"
          style={{ fontFamily: "var(--font-mono)", color }}
        >
          {formatCountdown(info.secsToChange)}{" "}
          <span className="font-normal text-[#8A8378]">ก่อน{info.nextEventThai}</span>
        </span>
      )}

      {info.secsToChange === null && (
        <span className="ml-auto text-[10px] text-[#8A8378]">{info.nextEventThai}</span>
      )}
    </div>
  );
}
