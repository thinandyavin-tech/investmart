"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/Card";
import { computeRdcf, type RdcfResult, type RdcfSuccess } from "@/lib/rdcfMath";
import { PERSONAS, type RdcfPreset } from "@/lib/personasData";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AutoFill {
  ev:               number | null;
  evSource:         "direct" | "marketCapProxy" | null;
  revenueTTM:       number | null;
  historicalCAGR3Y: number | null;
  netMarginTTM:     number | null;
  industry:         string | null;
  waccSuggested:    number;
  waccSource:       string;
}

interface Assumptions {
  wacc:           string;  // displayed as %, stored as string input
  g:              string;
  terminalMargin: string;  // "" = needs input
  taxRate:        string;
  roic:           string;
  n:              string;
  maxPenetration: string;
  buffer:         string;
  absoluteCap:    string;
  evB:            string;  // billions override, "" = use auto-fill
  revenueB:       string;
  tamB:           string;  // "" = not set
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const pct  = (s: string): number => parseFloat(s) / 100;
const num  = (s: string): number => parseFloat(s);
const fPct = (v: number): string => (v * 100).toFixed(1) + "%";
const fB   = (v: number): string => "$" + (v / 1e9).toFixed(2) + "B";
const fBig = (v: number): string => v >= 1e12 ? "$" + (v / 1e12).toFixed(1) + "T"
  : v >= 1e9 ? "$" + (v / 1e9).toFixed(1) + "B"
  : "$" + (v / 1e6).toFixed(0) + "M";

const VERDICT_STYLE: Record<string, { label: string; labelTh: string; bg: string; text: string }> = {
  expensive: { label: "Priced for Perfection", labelTh: "แพง — ราคาต้องการความสมบูรณ์แบบ", bg: "#FEF2F2", text: "#DC2626" },
  fair:      { label: "Fair Expectations",     labelTh: "Fair — ราคาสมเหตุสมผล",            bg: "#FFFBEB", text: "#D97706" },
  cheap:     { label: "Low Expectations",      labelTh: "ถูก — ตลาดคาดหวังต่ำ",             bg: "#F0FDF4", text: "#16A34A" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function InputRow({
  label, value, onChange, unit, hint, step = "0.1", min = "0", required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  unit?: string; hint?: string; step?: string; min?: string; required?: boolean;
}) {
  const id = "rdcf-" + label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor={id} className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="flex items-center gap-1">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={required ? "ต้องใส่" : "optional"}
          className={`w-full px-2 py-1 text-[10px] border rounded-md outline-none transition-colors font-mono
            ${required && !value ? "border-amber-400 bg-amber-50 focus:border-amber-500" : "border-slate-200 bg-white focus:border-green-500"}`}
          aria-required={required}
        />
        {unit && <span className="text-[9px] text-slate-400 flex-shrink-0">{unit}</span>}
      </div>
      {hint && <span className="text-[8px] text-slate-400 leading-tight">{hint}</span>}
    </div>
  );
}

function MathRow({ label, formula, value }: { label: string; formula: string; value: string }) {
  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="py-1 pr-2 text-[9px] font-semibold text-slate-600 whitespace-nowrap">{label}</td>
      <td className="py-1 pr-2 text-[9px] text-slate-400 font-mono">{formula}</td>
      <td className="py-1 text-[9px] font-bold text-slate-900 font-mono text-right">{value}</td>
    </tr>
  );
}

// ── Persona Preset Picker ─────────────────────────────────────────────────────

interface PersonaPresetPickerProps {
  selectedId:  string | null;
  onSelect:    (id: string, preset: RdcfPreset) => void;
}

function PersonaPresetPicker({ selectedId, onSelect }: PersonaPresetPickerProps) {
  const selected = selectedId ? PERSONAS.find((p) => p.id === selectedId) ?? null : null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
        Apply Persona Preset
      </span>
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {PERSONAS.map((p) => {
          const isSelected = p.id === selectedId;
          const firstName  = p.name.split(" ")[0];
          const initials   = firstName.slice(0, 2);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id, p.rdcfPreset)}
              title={`${p.name} · ${p.role}`}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl border transition-all
                ${isSelected
                  ? "border-green-500 bg-green-50 shadow-sm"
                  : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                style={{ backgroundColor: p.color }}
              >
                {initials}
              </div>
              <span className="text-[8px] text-slate-600 font-medium whitespace-nowrap">{firstName}</span>
            </button>
          );
        })}
      </div>
      {selected && (
        <p className="text-[9px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 leading-relaxed">
          <strong className="text-slate-700 not-italic">{selected.name}</strong>
          <span className="text-slate-400"> · {selected.role}</span>
          <br />
          {selected.rdcfPreset.rationale}
        </p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface ReverseDCFProps {
  ticker: string;
}

export function ReverseDCF({ ticker }: ReverseDCFProps) {
  const [autoFill, setAutoFill]               = useState<AutoFill | null>(null);
  const [assumptions, setAssumptions]         = useState<Assumptions | null>(null);
  const [missing, setMissing]                 = useState<string[]>([]);
  const [fetchLoading, setFetchLoading]       = useState(true);
  const [fetchError, setFetchError]           = useState(false);
  const [collapsed, setCollapsed]             = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showMath, setShowMath]               = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);

  useEffect(() => {
    setFetchLoading(true);
    setFetchError(false);
    fetch(`/api/stock/rdcf?ticker=${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((d: { autoFill: AutoFill; assumptions: { wacc: number; g: number; terminalMargin: number | null; taxRate: number; roic: number; n: number; maxPenetration: number; buffer: number; absoluteCap: number }; missingInputs: string[] }) => {
        setAutoFill(d.autoFill);
        setMissing(d.missingInputs);
        const a = d.assumptions;
        setAssumptions({
          wacc:           (a.wacc * 100).toFixed(1),
          g:              (a.g * 100).toFixed(1),
          terminalMargin: a.terminalMargin ? (a.terminalMargin * 100).toFixed(1) : "",
          taxRate:        (a.taxRate * 100).toFixed(1),
          roic:           (a.roic * 100).toFixed(1),
          n:              String(a.n),
          maxPenetration: (a.maxPenetration * 100).toFixed(0),
          buffer:         (a.buffer * 100).toFixed(1),
          absoluteCap:    (a.absoluteCap * 100).toFixed(0),
          evB:            "",
          revenueB:       "",
          tamB:           "",
        });
        if (d.missingInputs.includes("terminalMargin")) setShowAssumptions(true);
      })
      .catch(() => setFetchError(true))
      .finally(() => setFetchLoading(false));
  }, [ticker]);

  function set(field: keyof Assumptions, value: string) {
    setAssumptions((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  function applyPreset(preset: RdcfPreset) {
    setAssumptions((prev) => prev ? {
      ...prev,
      wacc:           (preset.wacc * 100).toFixed(1),
      g:              (preset.g * 100).toFixed(1),
      terminalMargin: (preset.terminalMargin * 100).toFixed(1),
      taxRate:        (preset.taxRate * 100).toFixed(1),
      roic:           (preset.roic * 100).toFixed(1),
      n:              String(preset.n),
      maxPenetration: (preset.maxPenetration * 100).toFixed(0),
      buffer:         (preset.buffer * 100).toFixed(1),
      absoluteCap:    (preset.absoluteCap * 100).toFixed(0),
    } : prev);
  }

  const result: RdcfResult | null = useMemo(() => {
    if (!autoFill || !assumptions) return null;
    const wacc          = pct(assumptions.wacc);
    const g             = pct(assumptions.g);
    const terminalMargin = assumptions.terminalMargin ? pct(assumptions.terminalMargin) : null;
    const taxRate       = pct(assumptions.taxRate);
    const roic          = pct(assumptions.roic);
    const n             = parseInt(assumptions.n);
    const maxPen        = pct(assumptions.maxPenetration);
    const buffer        = pct(assumptions.buffer);
    const absCap        = pct(assumptions.absoluteCap);
    const ev            = assumptions.evB      ? num(assumptions.evB)      * 1e9 : autoFill.ev;
    const revenueTTM    = assumptions.revenueB ? num(assumptions.revenueB) * 1e9 : autoFill.revenueTTM;
    const tam           = assumptions.tamB     ? num(assumptions.tamB)     * 1e9 : null;

    if (!ev || !revenueTTM || !terminalMargin || isNaN(wacc) || isNaN(g) || isNaN(n)) return null;
    return computeRdcf({ ev, revenueTTM, wacc, g, terminalMargin, taxRate, roic, n,
      historicalCAGR3Y: autoFill.historicalCAGR3Y, tam, maxPenetration: maxPen, buffer, absoluteCap: absCap });
  }, [autoFill, assumptions]);

  // Sensitivity table: 3 WACC × 3 margin combos
  const sensitivityGrid = useMemo(() => {
    if (!autoFill || !assumptions || !result || result.kind !== "success") return null;
    const baseWacc   = pct(assumptions.wacc);
    const baseMargin = pct(assumptions.terminalMargin);
    const ev         = assumptions.evB      ? num(assumptions.evB)      * 1e9 : autoFill.ev;
    const revenueTTM = assumptions.revenueB ? num(assumptions.revenueB) * 1e9 : autoFill.revenueTTM;
    if (!ev || !revenueTTM) return null;
    const waccs   = [baseWacc - 0.01, baseWacc, baseWacc + 0.01];
    const margins = [baseMargin - 0.03, baseMargin, baseMargin + 0.03].filter(m => m > 0);
    if (margins.length < 2) return null;
    const base = { taxRate: pct(assumptions.taxRate), roic: pct(assumptions.roic), n: parseInt(assumptions.n),
      g: pct(assumptions.g), historicalCAGR3Y: autoFill.historicalCAGR3Y, tam: null, maxPenetration: 0.3,
      buffer: pct(assumptions.buffer), absoluteCap: pct(assumptions.absoluteCap) };
    return { waccs, margins, grid: waccs.map(w => margins.map(m => {
      const r = computeRdcf({ ev, revenueTTM, wacc: w, terminalMargin: m, ...base });
      return r.kind === "success" ? r.impliedCAGR : null;
    })) };
  }, [autoFill, assumptions, result]);

  const needsInput = !assumptions?.terminalMargin ||
    (!autoFill?.ev && !assumptions?.evB) ||
    (!autoFill?.revenueTTM && !assumptions?.revenueB);

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-900">
              Reverse DCF · Expectations Gauge
            </h2>
            <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md font-semibold">
              by Earthh Evans
            </span>
          </div>
          <p className="text-[9px] text-slate-400 mt-0.5">ราคาหุ้นต้องการ CAGR เท่าใด vs ที่เป็นไปได้จริง</p>
        </div>
        <button onClick={() => setCollapsed(c => !c)} aria-expanded={!collapsed}
          className="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
          aria-label={collapsed ? "ขยาย" : "ย่อ"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={collapsed ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
          </svg>
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 pt-3 flex flex-col gap-3">

          {/* Loading / error */}
          {fetchLoading && (
            <div className="flex flex-col gap-2 animate-pulse">
              <div className="h-12 bg-slate-100 rounded-xl" />
              <div className="h-6 w-48 bg-slate-100 rounded" />
            </div>
          )}
          {fetchError && (
            <p className="text-[10px] text-slate-500 text-center py-2">
              ไม่สามารถโหลดข้อมูลได้ — ลองรีเฟรช
            </p>
          )}

          {!fetchLoading && !fetchError && assumptions && (
            <>
              {/* Needs-input notice */}
              {needsInput && (
                <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-amber-500 text-sm flex-shrink-0">⚠</span>
                  <p className="text-[9px] text-amber-800 leading-snug">
                    ต้องการข้อมูลเพิ่ม:{" "}
                    {[
                      !assumptions.terminalMargin && "Terminal Margin",
                      !autoFill?.ev && !assumptions.evB && "EV",
                      !autoFill?.revenueTTM && !assumptions.revenueB && "Revenue TTM",
                    ].filter(Boolean).join(", ")}
                    {" "}— กรอกใน Assumptions ด้านล่าง
                  </p>
                </div>
              )}

              {/* Results bar */}
              {result && result.kind === "success" && (
                <ResultsPanel result={result} missing={missing} />
              )}
              {result && result.kind === "error" && (
                <div className="text-[9px] text-red-600 px-2 py-1 bg-red-50 border border-red-100 rounded-lg">
                  {result.reason === "wacc_lte_g"
                    ? "WACC ต้องมากกว่า Terminal Growth Rate"
                    : result.reason === "negative_implied_revenue"
                    ? "สมการให้ Revenue เป็นลบ — ตรวจสอบ Margin / ROIC"
                    : "ข้อมูลไม่ครบ"}
                </div>
              )}

              {/* Assumptions */}
              <div>
                <button onClick={() => setShowAssumptions(s => !s)}
                  className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                  aria-expanded={showAssumptions}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={showAssumptions ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                  </svg>
                  Assumptions
                  {autoFill?.waccSource && (
                    <span className="text-[8px] text-slate-400 font-normal normal-case truncate max-w-[160px]">
                      ({autoFill.waccSource.split("—")[0].trim()})
                    </span>
                  )}
                </button>

                {showAssumptions && (
                  <div className="mt-2 flex flex-col gap-3">
                  <PersonaPresetPicker
                    selectedId={selectedPersona}
                    onSelect={(id, preset) => { setSelectedPersona(id); applyPreset(preset); }}
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <InputRow label="WACC" value={assumptions.wacc} onChange={(v) => set("wacc", v)} unit="%" step="0.1" />
                    <InputRow label="Terminal Growth (g)" value={assumptions.g} onChange={(v) => set("g", v)} unit="%" step="0.1" hint="GDP rate, ~3%" />
                    <InputRow label="Terminal Margin" value={assumptions.terminalMargin} onChange={(v) => set("terminalMargin", v)} unit="%" step="0.5" required hint={autoFill?.netMarginTTM ? `Hint: TTM Net Margin ${fPct(autoFill.netMarginTTM)}` : undefined} />
                    <InputRow label="Tax Rate" value={assumptions.taxRate} onChange={(v) => set("taxRate", v)} unit="%" step="0.5" />
                    <InputRow label="ROIC (terminal)" value={assumptions.roic} onChange={(v) => set("roic", v)} unit="%" step="0.5" />
                    <InputRow label="Forecast Years (N)" value={assumptions.n} onChange={(v) => set("n", v)} step="1" min="5" />
                    <InputRow label="TAM" value={assumptions.tamB} onChange={(v) => set("tamB", v)} unit="$B" step="10" hint="Optional — enables Cap B" />
                    <InputRow label="Max Penetration" value={assumptions.maxPenetration} onChange={(v) => set("maxPenetration", v)} unit="%" step="1" />
                    <InputRow label="Verdict Buffer" value={assumptions.buffer} onChange={(v) => set("buffer", v)} unit="%" step="0.5" hint="Gap threshold" />
                    <InputRow label="Absolute Cap" value={assumptions.absoluteCap} onChange={(v) => set("absoluteCap", v)} unit="%" step="5" />
                    <InputRow label="EV override" value={assumptions.evB} onChange={(v) => set("evB", v)} unit="$B" step="1" hint={autoFill?.ev ? `Auto: ${fB(autoFill.ev)}${autoFill.evSource === "marketCapProxy" ? " (mktcap proxy)" : ""}` : "needs input"} />
                    <InputRow label="Revenue TTM override" value={assumptions.revenueB} onChange={(v) => set("revenueB", v)} unit="$B" step="0.1" hint={autoFill?.revenueTTM ? `Auto: ${fB(autoFill.revenueTTM)}` : "needs input"} />
                  </div>
                  </div>
                )}
              </div>

              {/* Math steps */}
              {result && result.kind === "success" && (
                <div>
                  <button onClick={() => setShowMath(s => !s)}
                    className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                    aria-expanded={showMath}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d={showMath ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                    </svg>
                    Show the Math
                  </button>
                  {showMath && <MathPanel r={result} assumptions={assumptions} autoFill={autoFill} sensitivity={sensitivityGrid} />}
                </div>
              )}
            </>
          )}

          {/* Caveats — always visible */}
          <Caveats industry={autoFill?.industry ?? null} />
        </div>
      )}
    </Card>
  );
}

// ── Results Panel ─────────────────────────────────────────────────────────────

function ResultsPanel({ result, missing }: { result: RdcfSuccess; missing: string[] }) {
  const vs = VERDICT_STYLE[result.verdict];
  const gapPp = (result.gap * 100).toFixed(1);
  const gapPositive = result.gap >= 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-50 rounded-xl p-2.5">
          <div className="text-[8px] text-slate-400 uppercase tracking-wide mb-1">Implied CAGR</div>
          <div className="text-[18px] font-bold font-mono" style={{ color: gapPositive ? "#DC2626" : "#16A34A" }}>
            {fPct(result.impliedCAGR)}
          </div>
          <div className="text-[7px] text-slate-400">ราคาต้องการ/ปี</div>
        </div>

        <div className="flex flex-col items-center justify-center gap-1">
          <div className="text-[8px] text-slate-400 uppercase tracking-wide">Gap</div>
          <div className="text-[15px] font-bold font-mono" style={{ color: vs.text }}>
            {gapPositive ? "+" : ""}{gapPp}pp
          </div>
          <div className="text-[10px]">{gapPositive ? "▲" : "▼"}</div>
        </div>

        <div className="bg-slate-50 rounded-xl p-2.5">
          <div className="text-[8px] text-slate-400 uppercase tracking-wide mb-1">Plausible CAGR</div>
          <div className="text-[18px] font-bold font-mono text-slate-900">
            {fPct(result.plausibleCAGR)}
          </div>
          <div className="text-[7px] text-slate-400">{result.plausibleSource.split("(")[0].trim()}</div>
        </div>
      </div>

      <div className="rounded-xl px-4 py-2.5 text-center border" style={{ background: vs.bg, borderColor: vs.text + "33" }}>
        <div className="text-[11px] font-bold" style={{ color: vs.text }}>{vs.label}</div>
        <div className="text-[9px] mt-0.5" style={{ color: vs.text }}>{vs.labelTh}</div>
      </div>

      {missing.includes("historicalCAGR3Y") || !missing.includes("historicalCAGR3Y") && result.capA === null ? (
        <p className="text-[8px] text-slate-400 italic">
          Cap A ไม่ได้ใช้ (ไม่มีข้อมูล 3Y CAGR) — Plausible คำนวณจาก {result.plausibleSource}
        </p>
      ) : null}
    </div>
  );
}

// ── Math Panel ────────────────────────────────────────────────────────────────

function MathPanel({ r, assumptions, autoFill, sensitivity }: {
  r: RdcfSuccess;
  assumptions: Assumptions;
  autoFill: AutoFill | null;
  sensitivity: { waccs: number[]; margins: number[]; grid: (number | null)[][] } | null;
}) {
  const ev = assumptions.evB ? num(assumptions.evB) * 1e9 : (autoFill?.ev ?? 0);
  return (
    <div className="mt-2 flex flex-col gap-3">
      <table className="w-full text-left">
        <tbody>
          <MathRow label="EV"           formula="given"                        value={fBig(ev)} />
          <MathRow label="TV"           formula={`EV × (1+WACC)^${parseInt(assumptions.n)}`} value={fBig(r.tv)} />
          <MathRow label="FCFF"         formula="TV × (WACC−g)"               value={fBig(r.fcff)} />
          <MathRow label="Reinvestment" formula="g ÷ ROIC"                    value={fPct(r.reinvestmentRate) + (r.clampedReinvest ? " ⚠capped" : "")} />
          <MathRow label="R* (implied)" formula="FCFF ÷ [m×(1−t)×(1−re)]"   value={fBig(r.impliedRevenue)} />
          <MathRow label="Implied CAGR" formula={`(R*/R₀)^(1/${parseInt(assumptions.n)+1})−1`} value={fPct(r.impliedCAGR)} />
          <MathRow label="Cap A (fade)" formula={r.capA !== null ? `${fPct(autoFill?.historicalCAGR3Y ?? 0)} hist × ${(r.capAFade ?? 1).toFixed(2)} fade` : "N/A"} value={r.capA !== null ? fPct(r.capA) : "—"} />
          <MathRow label="Cap B (TAM)"  formula={r.capB !== null ? `(${assumptions.maxPenetration}% × TAM / R₀)^(1/${parseInt(assumptions.n)+1})−1` : "TAM not set"} value={r.capB !== null ? fPct(r.capB) : "—"} />
          <MathRow label="Cap C (abs)"  formula="absolute ceiling"            value={fPct(r.capC)} />
          <MathRow label="Plausible"    formula={`min(available) = ${r.plausibleSource}`} value={fPct(r.plausibleCAGR)} />
          <MathRow label="Gap"          formula="Implied − Plausible"         value={(r.gap >= 0 ? "+" : "") + (r.gap * 100).toFixed(1) + "pp"} />
        </tbody>
      </table>

      {sensitivity && (
        <div>
          <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Sensitivity — Implied CAGR (WACC × Terminal Margin)
          </div>
          <table className="w-full text-center text-[8px]">
            <thead>
              <tr>
                <th className="py-0.5 text-slate-400 font-normal">WACC ↓ / Margin →</th>
                {sensitivity.margins.map((m, i) => (
                  <th key={i} className="py-0.5 text-slate-500 font-semibold">{fPct(m)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivity.waccs.map((w, wi) => (
                <tr key={wi} className="border-t border-slate-100">
                  <td className="py-1 text-slate-500 font-semibold">{fPct(w)}</td>
                  {sensitivity.grid[wi].map((v, mi) => (
                    <td key={mi} className="py-1 font-mono font-bold"
                      style={{ color: v !== null ? (v > pct(assumptions.absoluteCap) * 0.8 ? "#DC2626" : v < 0 ? "#16A34A" : "#D97706") : "#94A3B8" }}>
                      {v !== null ? fPct(v) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Caveats ───────────────────────────────────────────────────────────────────

function Caveats({ industry }: { industry: string | null }) {
  const isMature = industry && /bank|util|insurance|consumer defensive/i.test(industry);
  return (
    <div className="border-t border-slate-100 pt-2.5 flex flex-col gap-1">
      <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wide">คำเตือนสำคัญ</p>
      <ul className="flex flex-col gap-0.5 text-[8px] text-slate-400 leading-relaxed list-none p-0 m-0">
        <li>• <strong>เครื่องมือเพื่อการศึกษาเท่านั้น</strong> — ไม่ใช่คำแนะนำการลงทุน ตรวจสอบตัวเลขทุกอันก่อนใช้</li>
        <li>• เหมาะกับหุ้น growth ที่ value อยู่ที่ปลาย horizon{isMature && " — "}
          {isMature && <strong>คำเตือน: {industry} มี early cashflow มาก โมเดลนี้ overstate required CAGR</strong>}
        </li>
        <li>• หุ้น cyclical: ระวัง trough→peak CAGR ประวัติ — ใช้ 5yr/full-cycle แทน</li>
        <li>• TAM เป็นตัวเลขที่ถกเถียงได้มากที่สุด — plausible CAGR ขึ้นอยู่กับ assumption นี้มาก</li>
        <li>• &quot;แพง&quot; ≠ ขาย — หมายถึงราคาต้องการความสมบูรณ์แบบ; &quot;ถูก&quot; ≠ ซื้อ — ตรวจสอบว่าถูกเพราะธุรกิจมีปัญหา หรือตลาดยังไม่เห็น thesis</li>
        <li>• ผลลัพธ์คือ expectations gauge ไม่ใช่ price target · method by Earthh Evans</li>
      </ul>
    </div>
  );
}
