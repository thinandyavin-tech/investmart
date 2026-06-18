"use client";

import { useState } from "react";
import type { PortfolioAnalysis } from "@/app/api/portfolio/ai-analysis/route";

interface ApiResponse extends PortfolioAnalysis {
  cached: boolean;
  error?: string;
}

function HealthBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "#16A34A" :
    score >= 40 ? "#D97706" :
                  "#DC2626";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#e9edc9] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold w-6 text-right" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

export function AiPortfolioCard() {
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function runAnalysis() {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/portfolio/ai-analysis");
      const data = (await res.json()) as ApiResponse;
      if (!res.ok || data.error) {
        setError(data.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
      } else {
        setAnalysis(data);
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  if (!analysis) {
    return (
      <div className="border border-[#ccd5ae] rounded-2xl p-4 bg-white flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700">
              AI วิเคราะห์พอร์ต
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              วิเคราะห์หุ้นที่ถืออยู่ · ข้อมูลเชิงลึก · จำลองเท่านั้น
            </p>
          </div>
          <button
            onClick={() => void runAnalysis()}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg disabled:opacity-50 hover:bg-slate-700 transition-colors flex-shrink-0"
          >
            {loading ? "กำลังวิเคราะห์..." : "วิเคราะห์"}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="border border-[#ccd5ae] rounded-2xl bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#ccd5ae]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-0.5">
              AI วิเคราะห์พอร์ต
            </p>
            <p className="text-xs font-bold text-slate-900 leading-snug">
              {analysis.headline}
            </p>
          </div>
          <button
            onClick={() => { setAnalysis(null); void runAnalysis(); }}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-slate-600 flex-shrink-0 underline"
          >
            {loading ? "..." : "ใหม่"}
          </button>
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">Portfolio Health</span>
          </div>
          <HealthBar score={analysis.healthScore} />
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-b border-[#ccd5ae]">
        <p className="text-xs text-slate-600 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Positions */}
      {analysis.positions.length > 0 && (
        <div className="px-4 py-3 border-b border-[#ccd5ae]">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            ตำแหน่ง ({analysis.positions.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {analysis.positions.map((p) => (
              <div key={p.ticker} className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 w-14">{p.ticker}</span>
                <span className="text-slate-500 flex-1">{p.shares} @ ${p.avgCost.toFixed(2)}</span>
                <span
                  className="font-bold w-14 text-right"
                  style={{ color: p.pnlPct >= 0 ? "#16A34A" : "#DC2626", fontFamily: "var(--font-mono)" }}
                >
                  {p.pnlPct >= 0 ? "+" : ""}{p.pnlPct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks + Highlights */}
      {(analysis.risks.length > 0 || analysis.highlights.length > 0) && (
        <div className="px-4 py-3 grid grid-cols-2 gap-3">
          {analysis.risks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1.5">
                ความเสี่ยง
              </p>
              <ul className="flex flex-col gap-1">
                {analysis.risks.map((r, i) => (
                  <li key={i} className="text-xs text-slate-600 flex gap-1">
                    <span className="text-red-400 flex-shrink-0">·</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.highlights.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1.5">
                จุดแข็ง
              </p>
              <ul className="flex flex-col gap-1">
                {analysis.highlights.map((h, i) => (
                  <li key={i} className="text-xs text-slate-600 flex gap-1">
                    <span className="text-green-500 flex-shrink-0">·</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="px-4 pb-3 text-xs text-slate-400">
        AI วิเคราะห์เพื่อการศึกษา · ไม่ใช่คำแนะนำการลงทุน
      </p>
    </div>
  );
}
