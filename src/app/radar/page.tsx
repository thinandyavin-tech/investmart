"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RadarMovers } from "@/components/radar/RadarMovers";
import { RadarPage }   from "@/components/radar/RadarPage";

export default function RadarRoute() {
  const [mode, setMode] = useState<"movers" | "scored">("movers");

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        {/* Mode toggle — subtle, secondary position */}
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5 bg-[#F8F5EF] border-b border-[#E0D9CC] text-[10px]">
          <span className="text-[#8A8378] uppercase tracking-wide font-semibold">View:</span>
          <button
            onClick={() => setMode("movers")}
            className={`px-2 py-0.5 font-bold transition-colors ${
              mode === "movers"
                ? "text-[#1F1A14] underline underline-offset-2"
                : "text-[#8A8378] hover:text-[#1F1A14]"
            }`}
          >
            Market Movers
          </button>
          <span className="text-[#C8BFB0]">|</span>
          <button
            onClick={() => setMode("scored")}
            className={`px-2 py-0.5 font-bold transition-colors ${
              mode === "scored"
                ? "text-[#1F1A14] underline underline-offset-2"
                : "text-[#8A8378] hover:text-[#1F1A14]"
            }`}
          >
            Momentum Score
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {mode === "movers" ? <RadarMovers /> : <RadarPage />}
        </div>
      </div>
    </AppShell>
  );
}
