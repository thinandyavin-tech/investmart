"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams }   from "next/navigation";
import { Link }              from "@/i18n/navigation";
import { AppShell }          from "@/components/AppShell";
import { useI18n }           from "@/lib/i18n";
import { getIndustryNames }  from "@/lib/damodaran";
import { computeValuation }  from "@/lib/valuationMath";
import type { ValuationMode, ValuationResult } from "@/lib/valuationMath";
import type { ValuationStockData } from "@/app/api/stock/valuation/route";

// ── Constants ─────────────────────────────────────────────────────────────────

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;
const MODES: ValuationMode[] = ["Aggressive", "Base", "Conservative"];
const QUICK = ["NVDA", "AAPL", "MSFT", "TSLA", "AMZN", "GOOGL", "META", "AMD"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function n(v: number | null, dec = 2, prefix = ""): string {
  if (v == null) return "N/A";
  return `${prefix}${v.toFixed(dec)}`;
}

function pct(v: number | null, dec = 1): string {
  if (v == null) return "N/A";
  const p = v * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(dec)}%`;
}

function fmtPrice(v: number): string {
  if (v === 0) return "N/A";
  return v >= 1000 ? `$${(v / 1000).toFixed(2)}K` : `$${v.toFixed(2)}`;
}

function upside(v: number | null): { text: string; color: string } {
  if (v == null) return { text: "N/A", color: "#8A8378" };
  const p = v * 100;
  const text = `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
  const color = p >= 20 ? "#1F9D55" : p >= 0 ? "#D97706" : "#D64545";
  return { text, color };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InputRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#E4DDD2] last:border-0">
      <div className="w-44 flex-shrink-0">
        <span className="text-[11px] font-bold text-[#1A1A1A]">{label}</span>
        {hint && <p className="text-[9px] text-[#8A8378] mt-0.5 leading-tight">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function NumberInput({ value, onChange, step = "0.01", min, placeholder }: {
  value: string; onChange: (v: string) => void;
  step?: string; min?: string; placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      step={step}
      min={min}
      placeholder={placeholder}
      inputMode="decimal"
      className="w-full text-sm font-bold px-2 py-1.5 border border-[#C8BFB0] focus:outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
      style={{ background: "#FFFDE7", fontFamily: "var(--font-mono)" }}
    />
  );
}

function ResultCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-2.5 bg-[#FDFAF4] border border-[#E4DDD2]">
      <span className="text-[9px] font-bold uppercase tracking-widest text-[#8A8378]">{label}</span>
      <span
        className="text-base font-bold"
        style={{ fontFamily: "var(--font-mono)", color: highlight ?? "#1A1A1A" }}
      >
        {value}
      </span>
      {sub && <span className="text-[9px] text-[#8A8378]">{sub}</span>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ValuationPage() {
  const { lang }       = useI18n();
  const searchParams   = useSearchParams();
  const isEn           = lang === "en";

  // ── Stock fetch state
  const [ticker,   setTicker]   = useState("");
  const [stockData, setStockData] = useState<ValuationStockData | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  // ── Model inputs (all editable)
  const [price,      setPrice]      = useState("");
  const [eps1,       setEps1]       = useState("");
  const [epsCAGR,    setEpsCAGR]    = useState("");
  const [years,      setYears]      = useState("5");
  const [coe,        setCoe]        = useState("");
  const [avgPE,      setAvgPE]      = useState("");
  const [mode,       setMode]       = useState<ValuationMode>("Base");
  const [manualPE,   setManualPE]   = useState("");

  const industryNames = getIndustryNames();

  // ── Auto-fill inputs from stock data
  useEffect(() => {
    if (!stockData) return;
    if (stockData.price > 0)          setPrice(stockData.price.toFixed(2));
    if (stockData.eps0)                setEps1(stockData.eps0.toFixed(2));
    if (stockData.epsGrowth3Y != null) setEpsCAGR((stockData.epsGrowth3Y * 100).toFixed(1));
    if (stockData.damodaranCoE != null) setCoe((stockData.damodaranCoE * 100).toFixed(2));
  }, [stockData]);

  // ── Fetch stock data
  const fetchStock = useCallback(async (t: string) => {
    if (!TICKER_RE.test(t)) return;
    setFetching(true); setFetchErr(null); setStockData(null);
    try {
      const res = await fetch(`/api/stock/valuation?ticker=${encodeURIComponent(t)}`);
      if (!res.ok) throw new Error(isEn ? "Failed to load stock data" : "โหลดข้อมูลไม่สำเร็จ");
      const data = await res.json() as ValuationStockData;
      setStockData(data);
      setTicker(t);
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : "Error");
    } finally { setFetching(false); }
  }, [isEn]);

  // ── Auto-load from URL ?ticker=
  useEffect(() => {
    const t = searchParams.get("ticker")?.toUpperCase();
    if (t && TICKER_RE.test(t)) { setTicker(t); void fetchStock(t); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Compute result from current inputs
  const p0   = parseFloat(price)  || 0;
  const e1   = parseFloat(eps1)   || 0;
  const g    = parseFloat(epsCAGR) / 100 || 0;
  const n_   = parseInt(years)    || 5;
  const r    = parseFloat(coe)    / 100 || 0;
  const ap   = parseFloat(avgPE)  || 0;
  const mpe  = parseFloat(manualPE) || undefined;

  const result: ValuationResult | null = (p0 > 0 && e1 > 0 && r > 0 && ap > 0)
    ? computeValuation({ price: p0, eps1: e1, g, n: n_, r, avgPE: ap, mode, manualPE: mpe })
    : null;

  const ups = result ? upside(result.upsidePct) : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    if (TICKER_RE.test(t)) void fetchStock(t);
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-[#1A1A1A]">
              {isEn ? "Multiple-Growth 5Y Valuation" : "ประเมินมูลค่า Multiple-Growth 5 ปี"}
            </h1>
            <p className="text-xs text-[#8A8378] mt-0.5">
              {isEn
                ? "EPS × P/E model · Damodaran 2025 CoE table · educational, not advice"
                : "โมเดล EPS × P/E · ตาราง CoE Damodaran 2025 · เพื่อการศึกษา ไม่ใช่คำแนะนำ"}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link href="/hunter" className="text-[10px] font-bold px-2.5 py-1.5 border border-[#C8BFB0] text-[#8A8378] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors">
              {isEn ? "SWOT ↗" : "SWOT ↗"}
            </Link>
            <Link href="/screens" className="text-[10px] font-bold px-2.5 py-1.5 border border-[#C8BFB0] text-[#8A8378] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors">
              {isEn ? "Screens ↗" : "คัดกรอง ↗"}
            </Link>
          </div>
        </div>

        {/* Ticker search */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={ticker}
            onChange={e => setTicker(e.target.value.toUpperCase())}
            placeholder={isEn ? "Ticker (e.g. NVDA)" : "รหัสหุ้น (เช่น NVDA)"}
            maxLength={10}
            autoCapitalize="characters"
            autoComplete="off"
            className="flex-1 border border-[#C8BFB0] bg-[#FDFAF4] px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-[#1A1A1A]"
            aria-label="Stock ticker"
            style={{ fontFamily: "var(--font-mono)" }}
          />
          <button
            type="submit"
            disabled={fetching}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#1A1A1A] hover:bg-[#333] disabled:opacity-40 transition-colors"
            style={{ boxShadow: "2px 2px 0 #8B5CF6" }}
          >
            {fetching ? "…" : isEn ? "Load" : "โหลด"}
          </button>
        </form>

        {/* Quick picks */}
        {!stockData && !fetching && (
          <div className="flex flex-wrap gap-2">
            {QUICK.map(t => (
              <button
                key={t}
                onClick={() => { setTicker(t); void fetchStock(t); }}
                className="text-xs font-bold px-3 py-1 border border-[#C8BFB0] bg-[#FDFAF4] hover:border-[#1A1A1A] transition-colors"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {fetchErr && (
          <div className="px-4 py-3 bg-red-50 border border-red-200">
            <p className="text-xs text-red-700">{fetchErr}</p>
          </div>
        )}

        {/* Stock header */}
        {stockData && (
          <div style={{ background: "#FDFAF4", border: "1px solid #C8BFB0", boxShadow: "2px 2px 0 #1A1A1A" }} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "var(--font-mono)" }}>
                    {stockData.ticker}
                  </span>
                  <span className="text-xs text-[#8A8378] truncate max-w-[200px]">{stockData.name}</span>
                  {stockData.industry && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#F3EDE0] border border-[#C8BFB0] text-[#8A8378]">
                      {stockData.industry}
                    </span>
                  )}
                </div>
                <div className="flex gap-4 mt-2 flex-wrap">
                  {[
                    { l: isEn ? "Price" : "ราคา",       v: fmtPrice(stockData.price) },
                    { l: "1D",                           v: `${stockData.change1D >= 0 ? "+" : ""}${stockData.change1D.toFixed(2)}%` },
                    { l: "P/E (TTM)",                    v: stockData.ttmPE != null ? `${stockData.ttmPE.toFixed(1)}×` : "N/A" },
                    { l: "Beta",                         v: stockData.beta != null ? stockData.beta.toFixed(2) : "N/A" },
                    { l: isEn ? "EPS₀" : "EPS₀ (TTM)",  v: stockData.eps0 != null ? `$${stockData.eps0.toFixed(2)}` : "N/A" },
                    { l: "Rev 3Y",                       v: pct(stockData.revenueGrowth3Y) },
                    { l: "EPS 3Y",                       v: pct(stockData.epsGrowth3Y) },
                  ].map(({ l, v }) => (
                    <div key={l} className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378]">{l}</span>
                      <span className="text-xs font-bold text-[#1A1A1A]" style={{ fontFamily: "var(--font-mono)" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link href={`/stock/${stockData.ticker}`} className="text-xs font-bold text-[#8B5CF6] hover:underline flex-shrink-0">
                {isEn ? "Stock page →" : "หน้าหุ้น →"}
              </Link>
            </div>
            {stockData.damodaranIndustry && (
              <p className="text-[10px] text-[#8A8378] mt-2">
                {isEn
                  ? `Damodaran match: "${stockData.damodaranIndustry}" · CoE ${((stockData.damodaranCoE ?? 0) * 100).toFixed(2)}% · β ${stockData.damodaranBeta}`
                  : `Damodaran: "${stockData.damodaranIndustry}" · CoE ${((stockData.damodaranCoE ?? 0) * 100).toFixed(2)}% · β ${stockData.damodaranBeta}`}
              </p>
            )}
          </div>
        )}

        {/* Model inputs + results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── Inputs ──────────────────────────────────────────────── */}
          <div style={{ background: "#FDFAF4", border: "1px solid #C8BFB0", boxShadow: "2px 2px 0 #1A1A1A" }} className="px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-3">
              {isEn ? "Inputs — fill yellow fields" : "ข้อมูลนำเข้า — กรอกช่องสีเหลือง"}
            </p>

            <InputRow
              label={isEn ? "Current Price (P₀)" : "ราคาปัจจุบัน (P₀)"}
              hint={isEn ? "Auto-filled from Finnhub" : "ดึงอัตโนมัติ"}
            >
              <NumberInput value={price} onChange={setPrice} step="0.01" min="0.01" placeholder="e.g. 207.41" />
            </InputRow>

            <InputRow
              label={isEn ? "Forward EPS (EPS₁)" : "Forward EPS (EPS₁)"}
              hint={isEn ? "Next-year consensus EPS. Auto: TTM EPS from P/PE." : "EPS ปีหน้า (consensus) ออโต้ = TTM EPS"}
            >
              <NumberInput value={eps1} onChange={setEps1} step="0.01" placeholder="e.g. 8.96" />
            </InputRow>

            <InputRow
              label={isEn ? "EPS CAGR (g)" : "EPS CAGR (g)"}
              hint={isEn ? "5Y EPS growth rate in %. Auto: Finnhub 3Y EPS CAGR." : "อัตราเติบโต EPS 5 ปี เป็น % ออโต้ = 3Y"}
            >
              <NumberInput value={epsCAGR} onChange={setEpsCAGR} step="0.1" placeholder="e.g. 45.1" />
            </InputRow>

            <InputRow label={isEn ? "Years (N)" : "จำนวนปี (N)"}>
              <div className="flex gap-1">
                {[3,5,7,10].map(y => (
                  <button
                    key={y}
                    onClick={() => setYears(String(y))}
                    className="px-2.5 py-1 text-xs font-bold border transition-colors"
                    style={{ background: years === String(y) ? "#1A1A1A" : "#FDFAF4", color: years === String(y) ? "#fff" : "#1A1A1A", borderColor: "#C8BFB0" }}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </InputRow>

            <InputRow
              label={isEn ? "Cost of Equity (r %)" : "ต้นทุนทุน (r %)"}
              hint={isEn ? "Auto: Damodaran 2025 industry CoE." : "ออโต้ = Damodaran 2025"}
            >
              <NumberInput value={coe} onChange={setCoe} step="0.01" placeholder="e.g. 10.72" />
            </InputRow>

            <InputRow
              label={isEn ? "5Y Avg Fwd P/E" : "P/E เฉลี่ย 5 ปี"}
              hint={isEn ? "Enter manually — check stockanalysis.com" : "กรอกเอง — ดูที่ stockanalysis.com"}
            >
              <NumberInput value={avgPE} onChange={setAvgPE} step="0.1" placeholder="e.g. 44.41" />
            </InputRow>

            <InputRow label={isEn ? "Valuation Mode" : "โหมดการประเมิน"}>
              <div className="flex gap-1">
                {MODES.map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className="flex-1 text-[10px] font-bold py-1.5 border transition-colors"
                    style={{ background: mode === m ? "#1A1A1A" : "#FDFAF4", color: mode === m ? "#fff" : "#1A1A1A", borderColor: "#C8BFB0" }}
                  >
                    {m === "Aggressive" ? (isEn ? "Agg." : "กล้า") : m === "Conservative" ? (isEn ? "Cons." : "รอบคอบ") : m}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-[#8A8378] mt-1">
                {mode === "Aggressive" && (isEn ? "P/E grows to full 5Y avg by year N" : "P/E ขึ้นถึงค่าเฉลี่ย 5 ปีเต็ม")}
                {mode === "Base"       && (isEn ? "P/E meets 5Y avg halfway (geometric)" : "P/E ขึ้นกลางทาง (geometric)")}
                {mode === "Conservative" && (isEn ? "P/E grows only 25% toward 5Y avg" : "P/E ขึ้นแค่ 25% ของช่วง")}
              </p>
            </InputRow>

            <InputRow
              label={isEn ? "Manual Target P/E (opt.)" : "P/E เป้าหมาย (เลือกได้)"}
              hint={isEn ? "Overrides mode if filled." : "ถ้าใส่ค่านี้ จะไม่ใช้โหมด"}
            >
              <NumberInput value={manualPE} onChange={setManualPE} step="0.1" placeholder={isEn ? "Leave blank to use mode" : "เว้นว่างเพื่อใช้โหมด"} />
            </InputRow>
          </div>

          {/* ── Results ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">

            {result && result.valid ? (
              <>
                <div style={{ background: "#FDFAF4", border: "1px solid #C8BFB0", boxShadow: "2px 2px 0 #1A1A1A" }} className="px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-3">
                    {isEn ? "Calculations" : "ผลการคำนวณ"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <ResultCard label={isEn ? "Current P/E (M₀)" : "P/E ปัจจุบัน (M₀)"}  value={`${result.m0.toFixed(1)}×`} />
                    <ResultCard label={isEn ? `Target P/E (Yr ${n_})` : `P/E เป้า (ปีที่${n_})`}   value={`${result.targetPE.toFixed(1)}×`} />
                    <ResultCard label={isEn ? `EPS at Yr ${n_}` : `EPS ปีที่${n_}`}        value={`$${result.epsN.toFixed(2)}`} />
                    <ResultCard label={isEn ? `Target Price (Yr ${n_})` : `ราคาเป้า ปีที่${n_}`} value={fmtPrice(result.targetPrice)} />
                    <ResultCard label={isEn ? "PV Today (discounted)" : "PV ปัจจุบัน"} value={fmtPrice(result.pvToday)}
                      sub={isEn ? `Discounted at ${coe}% CoE` : `ลดด้วย CoE ${coe}%`} />
                    <ResultCard
                      label={isEn ? "Upside to PV" : "Upside ถึง PV"}
                      value={ups!.text}
                      highlight={ups!.color}
                    />
                    <ResultCard label={isEn ? `Price CAGR (${n_}Y)` : `CAGR ราคา ${n_}Y`} value={pct(result.priceCagr)} />
                    <ResultCard
                      label={isEn ? "Margin of Safety" : "Margin of Safety"}
                      value={`${(result.mosPct * 100).toFixed(1)}%`}
                      sub={isEn ? "MoS = (PV−P₀)/PV" : "MoS = (PV−P₀)/PV"}
                      highlight={result.mosPct >= 0.25 ? "#1F9D55" : result.mosPct >= 0 ? "#D97706" : "#D64545"}
                    />
                  </div>

                  {/* P/E growth bar */}
                  <div className="mt-3 pt-3 border-t border-[#E4DDD2]">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378] mb-1.5">
                      {isEn ? "P/E path: M₀ → Target → 5Y Avg" : "เส้น P/E: M₀ → เป้า → ค่าเฉลี่ย 5 ปี"}
                    </p>
                    <div className="flex items-center gap-2 text-[10px]" style={{ fontFamily: "var(--font-mono)" }}>
                      <span className="text-[#8B5CF6] font-bold">{result.m0.toFixed(1)}×</span>
                      <div className="flex-1 h-1.5 bg-[#E4DDD2] relative">
                        {ap > 0 && (
                          <div
                            className="absolute top-0 left-0 h-full bg-[#1A1A1A]"
                            style={{ width: `${Math.min(100, (result.targetPE / ap) * 100)}%` }}
                          />
                        )}
                      </div>
                      <span className="text-[#1F9D55] font-bold">{result.targetPE.toFixed(1)}×</span>
                      <span className="text-[#8A8378]">/ {ap > 0 ? `${ap.toFixed(1)}×` : "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Martin CTA */}
                <Link
                  href={`/chat?q=${encodeURIComponent(`Analyze ${stockData?.ticker ?? ticker} valuation — EPS CAGR ${epsCAGR}%, target price ${fmtPrice(result.targetPrice)}, CoE ${coe}%`)}`}
                  className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-[#8B5CF6] border border-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white transition-colors"
                >
                  ✦ {isEn ? `Ask Martin about this valuation` : `ถาม Martin เรื่องการประเมินมูลค่านี้`}
                </Link>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-10 border border-dashed border-[#C8BFB0] bg-[#FDFAF4]">
                <p className="text-xs text-[#8A8378] text-center">
                  {isEn
                    ? "Load a stock or fill all inputs to see the valuation."
                    : "โหลดหุ้นหรือกรอกข้อมูลให้ครบเพื่อดูผลการประเมิน"}
                </p>
                <p className="text-[10px] text-[#B0A898] text-center">
                  {isEn ? "Required: Price, EPS₁, CoE, 5Y Avg P/E" : "ต้องกรอก: ราคา, EPS₁, CoE, P/E เฉลี่ย 5 ปี"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Growth comparison table */}
        {stockData && stockData.growthMetrics.length > 0 && (
          <div style={{ background: "#FDFAF4", border: "1px solid #C8BFB0", boxShadow: "2px 2px 0 #1A1A1A" }} className="px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-3">
              {isEn ? "Fundamental Metrics" : "ตัวชี้วัดพื้นฐาน"}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse" style={{ minWidth: 320 }}>
                <thead>
                  <tr className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378] bg-[#F3EDE0]" style={{ borderBottom: "2px solid #1A1A1A" }}>
                    <th className="px-2 py-1.5 text-left">{isEn ? "Metric" : "ตัวชี้วัด"}</th>
                    <th className="px-2 py-1.5 text-right">{stockData.ticker}</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.growthMetrics.map((m, i) => {
                    const isGrowth = m.label.includes("Growth") || m.label.includes("Return");
                    const display  = m.value == null
                      ? <span className="text-[#8A8378]">N/A</span>
                      : isGrowth
                        ? <span style={{ color: m.value >= 0 ? "#1F9D55" : "#D64545" }}>{pct(m.value)}</span>
                        : <span>{pct(m.value)}</span>;
                    return (
                      <tr key={i} style={{ background: i % 2 ? "#FDFAF4" : "#F8F5EF", borderBottom: "1px solid #E4DDD2" }}>
                        <td className="px-2 py-1.5 text-[#6B6B6B]">{m.label}</td>
                        <td className="px-2 py-1.5 text-right font-bold" style={{ fontFamily: "var(--font-mono)" }}>{display}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[9px] text-[#8A8378] mt-2">
              {isEn
                ? "Source: Finnhub · N/A where data unavailable"
                : "ข้อมูลจาก Finnhub · N/A หากไม่มีข้อมูล"}
            </p>
          </div>
        )}

        {/* Model notes + disclaimer */}
        <div style={{ background: "#F5F3FF", border: "1px solid #8B5CF6", borderLeft: "4px solid #8B5CF6" }} className="px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6] mb-1.5">
            {isEn ? "Model notes" : "หมายเหตุโมเดล"}
          </p>
          <ul className="text-[10px] text-[#4B4569] flex flex-col gap-1">
            <li>• {isEn ? "Multiple-Growth 5Y model: EPS CAGR projected over N years, multiplied by a target P/E, discounted back at cost of equity." : "โมเดล Multiple-Growth 5Y: นำ EPS CAGR คูณกับ Target P/E แล้วคิดลดกลับด้วย Cost of Equity"}</li>
            <li>• {isEn ? "EPS₁ should be forward (consensus) EPS — auto-fill uses TTM EPS as proxy." : "EPS₁ ควรเป็น forward EPS จาก consensus — ออโต้ใช้ TTM EPS แทน"}</li>
            <li>• {isEn ? "5Y Avg P/E must be entered manually (not available on Finnhub free tier) — check stockanalysis.com/stocks/[ticker]." : "P/E เฉลี่ย 5 ปีต้องกรอกเอง — ดูที่ stockanalysis.com/stocks/[ticker]"}</li>
            <li>• {isEn ? "Cost of Equity auto-suggested from Damodaran 2025 industry table (NYU Stern)." : "CoE แนะนำจากตาราง Damodaran 2025 (NYU Stern)"}</li>
            <li>• {isEn ? "This is an educational model. Outputs are estimates, not price targets. Not investment advice." : "นี่คือโมเดลเพื่อการศึกษา ผลลัพธ์เป็นการประมาณ ไม่ใช่คำแนะนำลงทุน"}</li>
          </ul>
        </div>

      </div>
    </AppShell>
  );
}
