"use client";

import type { Scenario } from "@/app/api/analyze/[ticker]/route";

const CONF_COLOR: Record<string, string> = {
  high:   "text-emerald-700 bg-emerald-50 border-emerald-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  low:    "text-slate-600 bg-slate-50 border-slate-200",
};

const DIR_COLOR: Record<string, string> = {
  bullish: "text-emerald-700",
  bearish: "text-red-600",
};

function fmt(n: number): string {
  return n > 0 ? `$${n.toFixed(2)}` : "—";
}

function ScenarioCard({ s }: { s: Scenario }) {
  const isBull = s.direction === "bullish";
  const border = isBull ? "border-l-emerald-400" : "border-l-red-400";
  const bg     = isBull ? "bg-emerald-50/40" : "bg-red-50/30";

  return (
    <div className={`border border-slate-200 border-l-4 ${border} ${bg} rounded-xl p-4 space-y-3`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase ${DIR_COLOR[s.direction]}`}>
            {isBull ? "▲ Bullish" : "▼ Bearish"}
          </span>
          <span className="text-xs text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">
            {s.variation === "aggressive" ? "Aggressive" : "Conservative"}
          </span>
        </div>
        <span className={`text-xs font-semibold border rounded px-2 py-0.5 ${CONF_COLOR[s.confidence]}`}>
          {s.confidence === "high" ? "High" : s.confidence === "medium" ? "Medium" : "Low"} confidence
        </span>
      </div>

      {/* Price levels */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <p className="text-slate-500 font-medium mb-0.5">Entry</p>
          <p className="font-bold text-slate-900">{fmt(s.entryPrice)}</p>
        </div>
        <div>
          <p className="text-slate-500 font-medium mb-0.5">Stop</p>
          <p className="font-bold text-red-600">{fmt(s.stop)}</p>
        </div>
        <div>
          <p className="text-slate-500 font-medium mb-0.5">Target 1</p>
          <p className="font-bold text-emerald-700">{fmt(s.targets[0])}</p>
        </div>
        <div>
          <p className="text-slate-500 font-medium mb-0.5">Target 2</p>
          <p className="font-bold text-emerald-700">{fmt(s.targets[1])}</p>
        </div>
      </div>

      {/* R:R + trigger */}
      <div className="flex items-start gap-3 text-xs flex-wrap">
        <div className="flex-shrink-0">
          <span className="text-slate-500">R:R</span>{" "}
          <span className="font-bold">{s.rr}</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-slate-500">Trigger: </span>
          <span className="text-slate-700">{s.entryTrigger}</span>
        </div>
      </div>

      {/* Best for + what to expect */}
      <div className="text-xs space-y-1">
        <p><span className="text-slate-500 font-medium">เหมาะกับ: </span>{s.bestFor}</p>
        <p><span className="text-slate-500 font-medium">คาดการณ์: </span>{s.whatToExpect}</p>
      </div>
    </div>
  );
}

export function ScenarioTable({ scenarios }: { scenarios: Scenario[] }) {
  if (!scenarios?.length) return null;

  const bullish = scenarios.filter(s => s.direction === "bullish");
  const bearish = scenarios.filter(s => s.direction === "bearish");

  return (
    <div className="space-y-3">
      {/* Desktop: 2-column grid; Mobile: stacked cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {bullish.map((s, i) => <ScenarioCard key={`bull-${i}`} s={s} />)}
        {bearish.map((s, i) => <ScenarioCard key={`bear-${i}`} s={s} />)}
      </div>
    </div>
  );
}
