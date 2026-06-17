"use client";

import { useMemo } from "react";
import { computeRdcf, type RdcfInputs, type RdcfSuccess } from "@/lib/rdcfMath";
import { useI18n } from "@/lib/i18n";

interface ScenarioPanelProps {
  baseInputs: RdcfInputs;
}

type ScenarioKey = "bear" | "base" | "bull";

interface ScenarioDef {
  label:       string;
  labelTh:     string;
  adjNote:     string;
  adjNoteTh:   string;
  marginDelta: number;
  gDelta:      number;
  roicMult:    number;
  tamMult:     number;
  bg:          string;
  border:      string;
  color:       string;
}

const SCENARIOS: Record<ScenarioKey, ScenarioDef> = {
  bear: {
    label: "Bear", labelTh: "Bear — แย่กว่าคาด",
    adjNote: "Margin −5pp · Growth −0.5pp · ROIC ×0.8 · TAM ×0.7",
    adjNoteTh: "Margin −5pp · Growth −0.5pp · ROIC ×0.8 · TAM ×0.7",
    marginDelta: -0.05, gDelta: -0.005, roicMult: 0.80, tamMult: 0.70,
    bg: "#FEF2F2", border: "#FCA5A5", color: "#DC2626",
  },
  base: {
    label: "Base", labelTh: "Base — ตามคาด",
    adjNote: "Your assumptions unchanged",
    adjNoteTh: "Assumptions ของคุณ (ไม่เปลี่ยน)",
    marginDelta: 0, gDelta: 0, roicMult: 1.00, tamMult: 1.00,
    bg: "#fefae0", border: "#ccd5ae", color: "#1A1A1A",
  },
  bull: {
    label: "Bull", labelTh: "Bull — ดีกว่าคาด",
    adjNote: "Margin +5pp · Growth +0.5pp · ROIC ×1.2 · TAM ×1.5",
    adjNoteTh: "Margin +5pp · Growth +0.5pp · ROIC ×1.2 · TAM ×1.5",
    marginDelta: +0.05, gDelta: +0.005, roicMult: 1.20, tamMult: 1.50,
    bg: "#F0FDF4", border: "#86EFAC", color: "#16A34A",
  },
};

const VERDICT_COLOR = { expensive: "#DC2626", fair: "#D97706", cheap: "#16A34A" } as const;
const VERDICT_EN    = { expensive: "Priced for Perfection", fair: "Fair", cheap: "Low Expectations" } as const;
const VERDICT_TH    = { expensive: "แพง", fair: "Fair", cheap: "ถูก" } as const;

function fPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

function applyScenario(base: RdcfInputs, key: ScenarioKey): RdcfInputs {
  const s = SCENARIOS[key];
  return {
    ...base,
    terminalMargin: Math.max(0.001, base.terminalMargin + s.marginDelta),
    g:              Math.max(0.005, base.g + s.gDelta),
    roic:           base.roic * s.roicMult,
    tam:            base.tam != null ? base.tam * s.tamMult : null,
  };
}

function ScenarioCard({
  scenarioKey, result, isEn,
}: { scenarioKey: ScenarioKey; result: RdcfSuccess | null; isEn: boolean }) {
  const s = SCENARIOS[scenarioKey];
  return (
    <div
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
      className="flex-1 min-w-0 px-3 py-2.5 flex flex-col gap-1.5"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: s.color }}>
        {isEn ? s.label : s.labelTh}
      </p>
      <p className="text-[8px] text-[#8A8378] leading-tight">{isEn ? s.adjNote : s.adjNoteTh}</p>
      {result ? (
        <>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
            {[
              { lEn: "Implied", lTh: "ตลาดต้องการ", v: result.impliedCAGR, c: s.color },
              { lEn: "Plausible", lTh: "ที่ทำได้จริง", v: result.plausibleCAGR, c: "#1A1A1A" },
              { lEn: "Gap", lTh: "Gap", v: result.gap, c: VERDICT_COLOR[result.verdict] },
            ].map(({ lEn, lTh, v, c }) => (
              <div key={lEn}>
                <div className="text-[8px] text-[#8A8378] uppercase tracking-wide">{isEn ? lEn : lTh}</div>
                <div
                  className="text-sm font-bold"
                  style={{ fontFamily: "var(--font-mono)", color: c }}
                >
                  {fPct(v)}
                </div>
              </div>
            ))}
          </div>
          <div
            className="mt-1 px-2 py-0.5 text-center text-[9px] font-bold"
            style={{
              background: VERDICT_COLOR[result.verdict] + "20",
              color: VERDICT_COLOR[result.verdict],
              border: `1px solid ${VERDICT_COLOR[result.verdict]}40`,
            }}
          >
            {isEn ? VERDICT_EN[result.verdict] : VERDICT_TH[result.verdict]}
          </div>
        </>
      ) : (
        <p className="text-[10px] text-[#8A8378]">
          {isEn ? "N/A — fill required inputs" : "ไม่สามารถคำนวณได้"}
        </p>
      )}
    </div>
  );
}

export function ScenarioPanel({ baseInputs }: ScenarioPanelProps) {
  const { lang } = useI18n();
  const isEn = lang === "en";

  const results = useMemo(() => {
    const out = {} as Record<ScenarioKey, RdcfSuccess | null>;
    for (const key of ["bear", "base", "bull"] as ScenarioKey[]) {
      const r = computeRdcf(applyScenario(baseInputs, key));
      out[key] = r.kind === "success" ? r : null;
    }
    return out;
  }, [baseInputs]);

  return (
    <div
      style={{ background: "#fefae0", border: "1px solid #ccd5ae", boxShadow: "2px 2px 0 #d4a373" }}
      className="px-4 py-3"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-0.5">
        {isEn ? "Scenario Toggle — Bull / Base / Bear" : "Scenario Toggle — Bull / Base / Bear"}
      </p>
      <p className="text-[9px] text-[#8A8378] mb-3">
        {isEn
          ? "Each scenario adjusts margin, growth, ROIC and TAM from your base — reinforces probabilistic thinking."
          : "แต่ละ scenario ปรับ margin, growth, ROIC, TAM จาก base — ช่วยคิดแบบ probabilistic"}
      </p>
      <div className="flex gap-2">
        {(["bear", "base", "bull"] as ScenarioKey[]).map(k => (
          <ScenarioCard key={k} scenarioKey={k} result={results[k]} isEn={isEn} />
        ))}
      </div>
    </div>
  );
}
