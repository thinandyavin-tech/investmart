"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams }     from "next/navigation";
import { Link }                from "@/i18n/navigation";
import { AppShell }            from "@/components/AppShell";
import { useI18n }             from "@/lib/i18n";
import {
  computeRdcf,
  computeSuitabilityFlag,
  type RdcfInputs,
  type RdcfResult,
} from "@/lib/rdcfMath";
import { RdcfInputsPanel, type RdcfValues } from "@/components/valuation/RdcfInputsPanel";
import { SensitivityHeatmap }  from "@/components/valuation/SensitivityHeatmap";
import { ScenarioPanel }       from "@/components/valuation/ScenarioPanel";
import { FairValueBand }       from "@/components/valuation/FairValueBand";
import { SupportingCalcs }     from "@/components/valuation/SupportingCalcs";
import { ValuationCaveats }    from "@/components/valuation/ValuationCaveats";
import type { LabAutoFill }    from "@/app/api/stock/lab/route";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LabState { data: LabAutoFill | null; loading: boolean; error: string | null; }

const DEFAULTS: RdcfValues = {
  evB: "", revenueB: "", wacc: "10", g: "3", terminalMargin: "",
  taxRate: "21", roic: "15", n: "10",
  hist3Y: "", forwardCagr: "", tamB: "", maxPenetration: "30",
  buffer: "5", absoluteCap: "45",
  currentPrice: "", sharesB: "", netDebtB: "0",
};

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;
const QUICK = ["NVDA", "AAPL", "MSFT", "TSLA", "AMZN", "GOOGL", "META"];
const VERDICT_STYLE = {
  expensive: { bg: "#FEF2F2", border: "#FCA5A5", text: "#DC2626", en: "Priced for Perfection", th: "แพง — ราคาต้องการความสมบูรณ์แบบ" },
  fair:      { bg: "#FFFBEB", border: "#FCD34D", text: "#D97706", en: "Fair Expectations",     th: "Fair — ราคาสมเหตุสมผล" },
  cheap:     { bg: "#F0FDF4", border: "#86EFAC", text: "#16A34A", en: "Low Expectations",      th: "ถูก — ตลาดคาดหวังต่ำ" },
} as const;

function fPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ValuationLabPage() {
  const { lang }    = useI18n();
  const searchParams = useSearchParams();
  const isEn = lang === "en";

  const [ticker, setTicker] = useState("");
  const [lab,    setLab]    = useState<LabState>({ data: null, loading: false, error: null });
  const [vals,   setVals]   = useState<RdcfValues>(DEFAULTS);

  function setVal(field: keyof RdcfValues, value: string) {
    setVals(prev => ({ ...prev, [field]: value }));
  }

  // ── Parse inputs → RdcfInputs ─────────────────────────────────────────────

  const rdcfInputs = useMemo<RdcfInputs | null>(() => {
    const ev       = (parseFloat(vals.evB)       || 0) * 1e9;
    const revenue  = (parseFloat(vals.revenueB)   || 0) * 1e9;
    const margin   = (parseFloat(vals.terminalMargin) || 0) / 100;
    if (!ev || !revenue || !margin) return null;

    const hist     = vals.hist3Y      ? parseFloat(vals.hist3Y)      / 100 : null;
    const fwd      = vals.forwardCagr ? parseFloat(vals.forwardCagr) / 100 : null;
    const effectiveHist = hist !== null || fwd !== null
      ? Math.max(hist ?? -Infinity, fwd ?? -Infinity)
      : null;

    return {
      ev, revenueTTM:       revenue,
      wacc:                 (parseFloat(vals.wacc)          || 10)   / 100,
      g:                    (parseFloat(vals.g)             || 3)    / 100,
      terminalMargin:       margin,
      taxRate:              (parseFloat(vals.taxRate)        || 21)  / 100,
      roic:                 (parseFloat(vals.roic)           || 15)  / 100,
      n:                    parseInt(vals.n)                 || 10,
      historicalCAGR3Y:     isFinite(effectiveHist ?? NaN) ? effectiveHist : null,
      tam:                  vals.tamB ? (parseFloat(vals.tamB) || 0) * 1e9 : null,
      maxPenetration:       (parseFloat(vals.maxPenetration) || 30)  / 100,
      buffer:               (parseFloat(vals.buffer)         || 5)   / 100,
      absoluteCap:          (parseFloat(vals.absoluteCap)    || 45)  / 100,
    };
  }, [vals]);

  const result: RdcfResult | null = useMemo(
    () => rdcfInputs ? computeRdcf(rdcfInputs) : null,
    [rdcfInputs],
  );

  const suitability = useMemo(() => {
    if (result?.kind !== "success") return null;
    return computeSuitabilityFlag(lab.data?.industry ?? null, result.impliedCAGR);
  }, [result, lab.data]);

  // ── Martin auto-fill ──────────────────────────────────────────────────────

  const fetchLab = useCallback(async (t: string) => {
    setLab({ data: null, loading: true, error: null });
    try {
      const res = await fetch(`/api/stock/lab?ticker=${encodeURIComponent(t)}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json() as LabAutoFill;
      setLab({ data, loading: false, error: null });
      setVals(prev => ({
        ...prev,
        evB:            data.ev.value          != null ? data.ev.value.toFixed(2)                      : prev.evB,
        revenueB:       data.r0.value          != null ? data.r0.value.toFixed(2)                      : prev.revenueB,
        wacc:           data.wacc.value        != null ? (data.wacc.value * 100).toFixed(2)            : prev.wacc,
        terminalMargin: data.terminalMargin.value != null ? (data.terminalMargin.value * 100).toFixed(1) : prev.terminalMargin,
        hist3Y:         data.hist3Y.value      != null ? (data.hist3Y.value * 100).toFixed(1)          : prev.hist3Y,
        forwardCagr:    data.forwardCagr.value != null ? (data.forwardCagr.value * 100).toFixed(1)     : prev.forwardCagr,
        currentPrice:   data.price.value       != null ? data.price.value.toFixed(2)                   : prev.currentPrice,
        sharesB:        data.shares.value      != null ? data.shares.value.toFixed(3)                  : prev.sharesB,
        netDebtB:       data.netDebt.value     != null ? data.netDebt.value.toFixed(2)                 : prev.netDebtB,
      }));
    } catch {
      setLab(prev => ({ ...prev, loading: false, error: isEn ? "Failed to load — try again" : "โหลดไม่สำเร็จ — ลองใหม่" }));
    }
  }, [isEn]);

  useEffect(() => {
    const t = searchParams.get("ticker")?.toUpperCase();
    if (t && TICKER_RE.test(t)) { setTicker(t); void fetchLab(t); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    if (TICKER_RE.test(t)) void fetchLab(t);
  }

  const ld = lab.data;

  // ── Price band props ──────────────────────────────────────────────────────

  const fvbProps = result?.kind === "success" ? {
    plausibleCAGR:  result.plausibleCAGR,
    r0:             (parseFloat(vals.revenueB) || 0) * 1e9,
    wacc:           (parseFloat(vals.wacc)     || 10) / 100,
    g:              (parseFloat(vals.g)        || 3)  / 100,
    terminalMargin: (parseFloat(vals.terminalMargin) || 0) / 100,
    taxRate:        (parseFloat(vals.taxRate)  || 21) / 100,
    roic:           (parseFloat(vals.roic)     || 15) / 100,
    n:              parseInt(vals.n)           || 10,
    netDebt:        (parseFloat(vals.netDebtB) || 0)  * 1e9,
    shares:         (parseFloat(vals.sharesB)  || 0)  * 1e9,
    currentPrice:   parseFloat(vals.currentPrice) || 0,
  } : null;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-[#1A1A1A]">
              {isEn ? "Valuation Lab" : "ห้องวิเคราะห์มูลค่า"}
            </h1>
            <p className="text-xs text-[#8A8378] mt-0.5">
              {isEn
                ? "Reverse DCF · Expectations Gauge · Educational — not advice"
                : "Reverse DCF · Expectations Gauge · เพื่อการศึกษา ไม่ใช่คำแนะนำ"}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {[
              { href: "/hunter",   label: "SWOT ↗" },
              { href: "/screens",  label: isEn ? "Screens ↗" : "คัดกรอง ↗" },
            ].map(({ href, label }) => (
              <Link key={href} href={href}
                className="text-[10px] font-bold px-2.5 py-1.5 border border-[#ccd5ae] text-[#8A8378] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Ticker search ── */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text" value={ticker}
            onChange={e => setTicker(e.target.value.toUpperCase())}
            placeholder={isEn ? "Ticker (e.g. NVDA)" : "รหัสหุ้น (เช่น NVDA)"}
            maxLength={10} autoCapitalize="characters" autoComplete="off"
            className="flex-1 border border-[#ccd5ae] bg-[#fefae0] px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-[#1A1A1A]"
            style={{ fontFamily: "var(--font-mono)" }}
          />
          <button type="submit" disabled={lab.loading}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-40 transition-colors"
            style={{ boxShadow: "2px 2px 0 #d4a373" }}>
            {lab.loading ? "…" : isEn ? "Analyze with Martin" : "วิเคราะห์กับ Martin"}
          </button>
        </form>

        {/* Quick picks */}
        {!ld && !lab.loading && (
          <div className="flex flex-wrap gap-2">
            {QUICK.map(t => (
              <button key={t} onClick={() => { setTicker(t); void fetchLab(t); }}
                className="text-xs font-bold px-3 py-1 border border-[#ccd5ae] bg-[#fefae0] hover:border-[#1A1A1A] transition-colors"
                style={{ fontFamily: "var(--font-mono)" }}>{t}</button>
            ))}
          </div>
        )}

        {lab.error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200">
            <p className="text-xs text-red-700">{lab.error}</p>
          </div>
        )}

        {/* ── Stock header ── */}
        {ld && (
          <div style={{ background: "#fefae0", border: "1px solid #ccd5ae", boxShadow: "2px 2px 0 #d4a373" }} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-bold" style={{ fontFamily: "var(--font-mono)" }}>{ld.ticker}</span>
                  {ld.name && <span className="text-xs text-[#8A8378] truncate max-w-[200px]">{ld.name}</span>}
                  {ld.industry && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#faedcd] border border-[#ccd5ae] text-[#8A8378]">
                      {ld.industry}
                    </span>
                  )}
                </div>
                <div className="flex gap-4 mt-2 flex-wrap">
                  {[
                    { l: isEn ? "Price" : "ราคา",   v: ld.price.value    != null ? `$${ld.price.value.toFixed(2)}`            : "N/A" },
                    { l: "EV ($B)",                  v: ld.ev.value       != null ? `$${ld.ev.value.toFixed(1)}B`              : "N/A" },
                    { l: "Rev ($B)",                 v: ld.r0.value       != null ? `$${ld.r0.value.toFixed(1)}B`              : "N/A" },
                    { l: "EV/Sales",                 v: ld.evSales        != null ? `${ld.evSales.toFixed(1)}×`                : "N/A" },
                    { l: isEn ? "Analyst" : "เป้า",  v: ld.analystTarget.value != null ? `$${ld.analystTarget.value.toFixed(0)}` : "N/A" },
                  ].map(({ l, v }) => (
                    <div key={l} className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378]">{l}</span>
                      <span className="text-xs font-bold" style={{ fontFamily: "var(--font-mono)" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link href={`/stock/${ld.ticker}`} className="text-xs font-bold text-[#8B5CF6] hover:underline flex-shrink-0">
                {isEn ? "Stock page →" : "หน้าหุ้น →"}
              </Link>
            </div>
            {ld.sanityNotes.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[#e9edc9]">
                {ld.sanityNotes.map((n, i) => (
                  <p key={i} className="text-[9px] text-amber-700">⚠ {n}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Inputs ── */}
        <RdcfInputsPanel values={vals} onChange={setVal} labData={ld ?? null} />

        {/* ── Results ── */}
        {result && (
          result.kind === "success" ? (
            <div style={{ background: "#fefae0", border: "1px solid #ccd5ae", boxShadow: "2px 2px 0 #d4a373" }} className="px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-3">
                {isEn ? "Expectations Gauge" : "Expectations Gauge — ราคาต้องการอะไร?"}
              </p>
              {/* Three-column gauge */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3" style={{ background: "#faedcd", border: "1px solid #ccd5ae" }}>
                  <div className="text-[8px] font-bold uppercase tracking-widest text-[#8A8378] mb-1">
                    {isEn ? "Market-Implied CAGR" : "ตลาดต้องการ"}
                  </div>
                  <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-mono)", color: result.gap > 0 ? "#DC2626" : "#16A34A" }}>
                    {fPct(result.impliedCAGR)}
                  </div>
                  <div className="text-[8px] text-[#8A8378] mt-1">{isEn ? "required / yr" : "ต่อปี ที่ถูกตั้งราคา"}</div>
                </div>
                <div className="p-3 flex flex-col items-center justify-center">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-[#8A8378] mb-1">Gap</div>
                  <div className="text-xl font-bold" style={{ fontFamily: "var(--font-mono)", color: VERDICT_STYLE[result.verdict].text }}>
                    {fPct(result.gap)}
                  </div>
                  <div className="text-[9px] mt-1">{result.gap > 0 ? "▲" : "▼"}</div>
                  <div className="text-[8px] text-[#8A8378]">Implied − Plausible</div>
                </div>
                <div className="p-3" style={{ background: "#faedcd", border: "1px solid #ccd5ae" }}>
                  <div className="text-[8px] font-bold uppercase tracking-widest text-[#8A8378] mb-1">
                    {isEn ? "Plausible CAGR" : "ที่ทำได้จริง"}
                  </div>
                  <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-mono)", color: "#1A1A1A" }}>
                    {fPct(result.plausibleCAGR)}
                  </div>
                  <div className="text-[8px] text-[#8A8378] mt-1">{result.plausibleSource.split("(")[0].trim()}</div>
                </div>
              </div>
              {/* Verdict */}
              <div className="mt-3 px-4 py-3 text-center" style={{ background: VERDICT_STYLE[result.verdict].bg, border: `1px solid ${VERDICT_STYLE[result.verdict].border}` }}>
                <div className="text-sm font-bold" style={{ color: VERDICT_STYLE[result.verdict].text }}>
                  {isEn ? VERDICT_STYLE[result.verdict].en : VERDICT_STYLE[result.verdict].th}
                </div>
                <div className="text-[9px] text-[#8A8378] mt-1">
                  {isEn
                    ? "Observational expectations gauge — describes what's priced in, not a buy/sell signal."
                    : "บอกแค่ว่าราคาต้องการอะไร — ไม่ใช่สัญญาณซื้อ/ขาย"}
                </div>
              </div>
              {/* Math breakdown */}
              <div className="mt-3 pt-3 border-t border-[#e9edc9] grid grid-cols-2 gap-x-4 gap-y-1" style={{ fontSize: "10px" }}>
                {[
                  { l: "TV(N)",       v: `$${(result.tv / 1e9).toFixed(1)}B`,                           hint: `EV × (1+WACC)^${rdcfInputs!.n}` },
                  { l: "FCFF(N+1)",   v: `$${(result.fcff / 1e9).toFixed(1)}B`,                          hint: "TV × (WACC − g)" },
                  { l: "R* (implied)",v: `$${(result.impliedRevenue / 1e9).toFixed(1)}B`,                hint: "FCFF ÷ conversion factor" },
                  { l: "Reinvest",    v: `${(result.reinvestmentRate * 100).toFixed(0)}%${result.clampedReinvest ? " ⚠" : ""}`, hint: "g ÷ ROIC" },
                  { l: "Cap A",       v: result.capA !== null ? fPct(result.capA) : "N/A",               hint: `Hist×Fade (fade=${(result.capAFade ?? 1).toFixed(2)})` },
                  { l: "Cap B (TAM)", v: result.capB !== null ? fPct(result.capB) : "N/A — TAM not set", hint: "(MaxPen×TAM/R₀)^(1/N+1)−1" },
                ].map(({ l, v, hint }) => (
                  <div key={l} className="flex flex-col">
                    <span className="font-bold text-[#1A1A1A]">{l}: <span style={{ fontFamily: "var(--font-mono)" }}>{v}</span></span>
                    <span className="text-[#8A8378] text-[8px]">{hint}</span>
                  </div>
                ))}
              </div>

              {/* Suitability flag */}
              {suitability && (
                <div className="mt-3 flex items-start gap-2 px-3 py-2"
                  style={{ background: suitability.suitability === "good_fit" ? "#F0FDF4" : "#FEF9C3", border: `1px solid ${suitability.suitability === "good_fit" ? "#86EFAC" : "#FCD34D"}` }}>
                  <span style={{ color: suitability.suitability === "good_fit" ? "#16A34A" : "#D97706" }}>
                    {suitability.suitability === "good_fit" ? "✓" : "⚠"}
                  </span>
                  <div>
                    <p className="text-[9px] font-bold" style={{ color: suitability.suitability === "good_fit" ? "#16A34A" : "#D97706" }}>
                      {suitability.suitability === "good_fit"
                        ? (isEn ? "Good Fit" : "เหมาะสม")
                        : (isEn ? "Stress Test Only" : "ใช้เป็น Stress Test เท่านั้น")}
                    </p>
                    <p className="text-[9px] text-[#6B6B6B]">{suitability.reason}</p>
                  </div>
                </div>
              )}

              {/* Martin CTA */}
              <Link
                href={`/martin?q=${encodeURIComponent(`Analyze ${ticker || "this stock"} using Reverse DCF — implied CAGR ${fPct(result.impliedCAGR)}, plausible ${fPct(result.plausibleCAGR)}, verdict: ${result.verdict}`)}`}
                className="mt-3 flex items-center justify-center gap-2 py-2 text-xs font-bold text-[#8B5CF6] border border-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white transition-colors"
              >
                ✦ {isEn ? "Ask Martin about this result" : "ถาม Martin เรื่องผลการวิเคราะห์นี้"}
              </Link>
            </div>
          ) : (
            <div className="px-4 py-3 bg-red-50 border border-red-200">
              <p className="text-xs text-red-700 font-bold">
                {result.reason === "wacc_lte_g"
                  ? (isEn ? "WACC must be greater than Terminal Growth (g)" : "WACC ต้องมากกว่า Terminal Growth (g)")
                  : result.reason === "negative_implied_revenue"
                  ? (isEn ? "Negative implied revenue — check margin / ROIC" : "Revenue ที่คำนวณได้ติดลบ — ตรวจสอบ Margin / ROIC")
                  : (isEn ? "Invalid inputs — check EV, Revenue, Margin" : "ข้อมูลไม่ถูกต้อง — ตรวจสอบ EV, Revenue, Margin")}
              </p>
            </div>
          )
        )}

        {!result && (
          <div className="flex items-center justify-center py-8 border border-dashed border-[#ccd5ae] bg-[#fefae0]">
            <p className="text-xs text-[#8A8378] text-center">
              {isEn
                ? "Load a stock with Martin or fill EV, Revenue, and Terminal Margin to compute."
                : "โหลดหุ้นด้วย Martin หรือกรอก EV, Revenue และ Terminal Margin เพื่อเริ่มคำนวณ"}
            </p>
          </div>
        )}

        {/* ── Sensitivity heatmap ── */}
        {rdcfInputs && <SensitivityHeatmap baseInputs={rdcfInputs} />}

        {/* ── Scenario toggle ── */}
        {rdcfInputs && <ScenarioPanel baseInputs={rdcfInputs} />}

        {/* ── Fair-value price band ── */}
        {result?.kind === "success" && fvbProps && <FairValueBand {...fvbProps} />}

        {/* ── Supporting calculators ── */}
        <SupportingCalcs />

        {/* ── Caveats ── */}
        <ValuationCaveats industry={ld?.industry ?? null} />

      </div>
    </AppShell>
  );
}
