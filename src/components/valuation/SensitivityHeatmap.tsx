"use client";

import { computeRdcf, type RdcfInputs } from "@/lib/rdcfMath";
import { useI18n } from "@/lib/i18n";

interface SensitivityHeatmapProps {
  baseInputs: RdcfInputs;
}

const WACC_OFFSETS   = [-0.02, -0.01, 0, +0.01, +0.02] as const;
const MARGIN_OFFSETS = [-0.10, -0.05,  0, +0.05, +0.10] as const;

function cagrBg(v: number): string {
  if (v > 0.60) return "#7f1d1d";
  if (v > 0.40) return "#b91c1c";
  if (v > 0.25) return "#c2410c";
  if (v > 0.15) return "#ca8a04";
  if (v >= 0)   return "#15803d";
  return "#14532d";
}

function fPct(v: number): string {
  return (v * 100).toFixed(0) + "%";
}

export function SensitivityHeatmap({ baseInputs }: SensitivityHeatmapProps) {
  const { lang } = useI18n();
  const isEn = lang === "en";

  const waccs   = WACC_OFFSETS.map(d => baseInputs.wacc + d).filter(w => w > 0.01);
  const margins = MARGIN_OFFSETS.map(d => baseInputs.terminalMargin + d).filter(m => m > 0.001 && m < 1);

  const grid = waccs.map(w =>
    margins.map(m => {
      const r = computeRdcf({ ...baseInputs, wacc: w, terminalMargin: m });
      return r.kind === "success" ? r.impliedCAGR : null;
    })
  );

  return (
    <div
      style={{ background: "#FDFAF4", border: "1px solid #C8BFB0", boxShadow: "2px 2px 0 #1A1A1A" }}
      className="px-4 py-3"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-1">
        {isEn
          ? "Sensitivity — Implied CAGR (WACC × Terminal Margin)"
          : "Sensitivity — Implied CAGR (WACC × Margin)"}
      </p>
      <p className="text-[9px] text-[#8A8378] mb-3">
        {isEn
          ? "How assumption changes move the implied CAGR. Outlined cell = your base case."
          : "ความไวของ Implied CAGR — ช่องมีกรอบ = base case ของคุณ"}
      </p>
      <div className="overflow-x-auto">
        <table className="border-collapse text-center" style={{ fontSize: "10px", minWidth: 340 }}>
          <thead>
            <tr>
              <th
                className="px-2 py-1 text-[#8A8378] font-bold text-left"
                style={{ borderBottom: "2px solid #1A1A1A" }}
              >
                WACC ↓ / Margin →
              </th>
              {margins.map(m => (
                <th
                  key={m}
                  className="px-2 py-1 font-bold"
                  style={{ borderBottom: "2px solid #1A1A1A", color: "#1A1A1A" }}
                >
                  {fPct(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {waccs.map((w, wi) => (
              <tr key={w} style={{ background: wi % 2 ? "#F8F5EF" : "#FDFAF4" }}>
                <td
                  className="px-2 py-1.5 font-bold text-left"
                  style={{ color: "#1A1A1A", borderRight: "1px solid #E4DDD2" }}
                >
                  {fPct(w)}
                </td>
                {grid[wi].map((v, mi) => {
                  const isBase =
                    Math.abs(w - baseInputs.wacc) < 0.005 &&
                    Math.abs(margins[mi] - baseInputs.terminalMargin) < 0.005;
                  return (
                    <td
                      key={mi}
                      className="px-2 py-1.5 font-bold"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: v !== null ? "#fff" : "#C8BFB0",
                        background: v !== null ? cagrBg(v) : "#F8F5EF",
                        outline: isBase ? "2px solid #1A1A1A" : undefined,
                        outlineOffset: "-2px",
                        opacity: isBase ? 1 : 0.85,
                      }}
                    >
                      {v !== null ? fPct(v) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[8px] text-[#8A8378] mt-2">
        {isEn
          ? "Red = high required CAGR (harder to achieve) · Green = lower required CAGR"
          : "แดง = ต้องการ CAGR สูง (ยากกว่า) · เขียว = ต้องการ CAGR ต่ำกว่า"}
      </p>
    </div>
  );
}
