"use client";

import { Component, type ReactNode } from "react";
import { useState } from "react";
import { AppShell }    from "@/components/AppShell";
import { RadarMovers } from "@/components/radar/RadarMovers";
import { RadarPage }   from "@/components/radar/RadarPage";

// Local error boundary — catches React render errors inside radar panels
// without letting them bubble to the full-page error.tsx boundary.
interface EBState { hasError: boolean; msg: string }
class RadarBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, msg: "" };
  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, msg: err.message ?? "Unknown error" };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#1F1A14]">Radar error</p>
          <p className="text-xs text-[#8A8378]">{this.state.msg}</p>
          <button
            onClick={() => this.setState({ hasError: false, msg: "" })}
            className="text-xs font-bold px-4 py-2 border border-[#1F1A14] hover:bg-[#1F1A14] hover:text-white transition-colors"
          >
            ลองใหม่
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function RadarRoute() {
  const [mode, setMode] = useState<"movers" | "scored">("movers");

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        {/* Mode toggle */}
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5 bg-[#e9edc9] border-b border-[#ccd5ae] text-[10px]">
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
          <span className="text-[#ccd5ae]">|</span>
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
          <RadarBoundary>
            {mode === "movers" ? <RadarMovers /> : <RadarPage />}
          </RadarBoundary>
        </div>
      </div>
    </AppShell>
  );
}
