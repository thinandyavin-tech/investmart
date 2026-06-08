"use client";

import { useEffect, useState } from "react";
import { getMarketInfo, formatCountdown, MarketInfo } from "@/lib/marketHours";

const STATUS_COLORS: Record<MarketInfo["status"], string> = {
  open:   "#16A34A",
  pre:    "#D97706",
  after:  "#1D4ED8",
  closed: "#64748B",
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
      className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200 bg-white"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-widest uppercase text-white"
        style={{ background: color }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-white"
          style={info.status === "open" ? { animation: "pulse 1.5s ease-in-out infinite" } : undefined}
          aria-hidden="true"
        />
        {info.statusThai}
      </span>

      <span className="text-xs text-slate-500">ตลาดหุ้นสหรัฐ (ET)</span>

      {info.secsToChange !== null && (
        <span
          className="ml-auto text-xs font-bold"
          style={{ fontFamily: "var(--font-mono)", color }}
        >
          {formatCountdown(info.secsToChange)}{" "}
          <span className="font-normal text-slate-500">ก่อน{info.nextEventThai}</span>
        </span>
      )}

      {info.secsToChange === null && (
        <span className="ml-auto text-xs text-slate-500">{info.nextEventThai}</span>
      )}
    </div>
  );
}
