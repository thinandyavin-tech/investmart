"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter }      from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { newsTeaser }      from "@/lib/newsUtils";
import dynamic from "next/dynamic";
import { ScenarioTable } from "./ScenarioTable";
import type { AnalysisResponse } from "@/app/api/analyze/[ticker]/route";

const PriceChart = dynamic(
  () => import("@/components/PriceChart").then(m => m.PriceChart),
  { ssr: false },
);

type Timeframe = "3M" | "1Y" | "5Y";
const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "3M", label: "3 เดือน" },
  { value: "1Y", label: "1 ปี"    },
  { value: "5Y", label: "5 ปี"    },
];

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;

function n(v: number | null, d = 2): string {
  return v != null ? v.toFixed(d) : "N/A";
}

function SignalRow({ label, value, detail, color }: { label: string; value: string; detail: string; color: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[#ccd5ae] last:border-0">
      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-800">{label}</span>
          <span className="text-xs font-bold text-slate-600 font-mono">{value}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{detail}</p>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-[#faedcd] border border-[#ccd5ae] shadow-sm p-5 space-y-3">
      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <span>{icon}</span>
        <span>{title}</span>
      </h2>
      {children}
    </section>
  );
}

function IndicatorPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center bg-[#faedcd] rounded-xl border border-[#ccd5ae] px-3 py-2.5 min-w-[80px]">
      <span className="text-xs font-bold text-slate-800 font-mono leading-none">{value}</span>
      <span className="text-xs text-slate-500 mt-1">{label}</span>
      {sub && <span className="text-xs text-slate-400 mt-0.5">{sub}</span>}
    </div>
  );
}

function HighRiskBanner({ reason }: { reason: string }) {
  return (
    <div className="rounded-2xl border-2 border-red-300 bg-red-50/80 p-4 flex gap-3">
      <span className="text-xl flex-shrink-0">⚠️</span>
      <div>
        <p className="text-sm font-bold text-red-700 mb-1">ความเสี่ยงสูงผิดปกติ</p>
        <p className="text-xs text-red-600 leading-relaxed">{reason}</p>
        <p className="text-xs text-red-500 mt-1.5 font-medium">
          ในสถานการณ์เช่นนี้ ความระมัดระวังมักให้ผลดีกว่าการ FOMO ตาม
        </p>
      </div>
    </div>
  );
}

function SkeletonLine({ w = "w-full" }: { w?: string }) {
  return <div className={`h-3 ${w} bg-[#faedcd] animate-pulse rounded`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl bg-[#faedcd] border border-[#ccd5ae] p-5 space-y-3">
          <SkeletonLine w="w-32" />
          <SkeletonLine />
          <SkeletonLine w="w-4/5" />
          <SkeletonLine w="w-3/4" />
        </div>
      ))}
    </div>
  );
}

interface Candle {
  time: number; open: number; high: number; low: number; close: number; volume: number;
}

interface Props {
  initialTicker?:   string;
  initialTimeframe: Timeframe;
}

export function AnalyzeClient({ initialTicker, initialTimeframe }: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [ticker,      setTicker]    = useState(initialTicker ?? "");
  const [input,       setInput]     = useState(initialTicker ?? "");
  const [timeframe,   setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [analysis,    setAnalysis]  = useState<AnalysisResponse | null>(null);
  const [candles,     setCandles]   = useState<Candle[]>([]);
  const [loading,     setLoading]   = useState(false);
  const [error,       setError]     = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (sym: string, tf: Timeframe, refresh = false) => {
    const clean = sym.trim().toUpperCase();
    if (!TICKER_RE.test(clean)) { setError("Ticker ไม่ถูกต้อง เช่น AAPL, NVDA, BRK.B"); return; }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setTicker(clean);

    // Update URL without full navigation
    const params = new URLSearchParams(searchParams.toString());
    params.set("ticker", clean);
    params.set("timeframe", tf);
    router.replace(`/analyze?${params.toString()}`, { scroll: false });

    // Fetch chart candles in parallel with analysis
    const YF_TF: Record<Timeframe, { range: string; interval: string }> = {
      "3M": { range: "3mo", interval: "1d" },
      "1Y": { range: "1y",  interval: "1d" },
      "5Y": { range: "5y",  interval: "1wk" },
    };
    const { range, interval } = YF_TF[tf];

    try {
      const [analysisRes, chartRes] = await Promise.allSettled([
        fetch(`/api/analyze/${clean}?timeframe=${tf}${refresh ? "&refresh=true" : ""}`, { signal: ctrl.signal }),
        fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(clean)}?interval=${interval}&range=${range}`,
          { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0" } },
        ),
      ]);

      // Parse candles
      if (chartRes.status === "fulfilled" && chartRes.value.ok) {
        const raw = (await chartRes.value.json()) as {
          chart?: { result?: Array<{
            timestamp?: number[];
            indicators?: { quote?: Array<{ open?: (number|null)[]; high?: (number|null)[]; low?: (number|null)[]; close?: (number|null)[]; volume?: (number|null)[] }> };
          }> };
        };
        const result = raw.chart?.result?.[0];
        if (result?.timestamp && result.indicators?.quote?.[0]) {
          const ts = result.timestamp;
          const q  = result.indicators.quote[0];
          setCandles(
            ts
              .map((t, i) => ({
                time:   t,
                open:   q.open?.[i]   ?? 0,
                high:   q.high?.[i]   ?? 0,
                low:    q.low?.[i]    ?? 0,
                close:  q.close?.[i]  ?? 0,
                volume: q.volume?.[i] ?? 0,
              }))
              .filter(c => c.close > 0),
          );
        }
      }

      // Parse analysis
      if (analysisRes.status === "fulfilled" && analysisRes.value.ok) {
        const data = (await analysisRes.value.json()) as AnalysisResponse & { error?: string };
        if (data.error) { setError(data.error); return; }
        setAnalysis(data);
      } else if (analysisRes.status === "fulfilled") {
        const err = (await analysisRes.value.json().catch(() => ({}))) as { error?: string };
        setError(err.error ?? "การวิเคราะห์ล้มเหลว ลองใหม่อีกครั้ง");
      } else {
        if ((analysisRes.reason as Error)?.name === "AbortError") return;
        setError("ไม่สามารถเชื่อมต่อได้ ลองใหม่อีกครั้ง");
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setError("เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }, [router, searchParams]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void run(input, timeframe);
  }

  function handleTimeframe(tf: Timeframe) {
    setTimeframe(tf);
    if (ticker) void run(ticker, tf);
  }

  const a = analysis?.analysis;
  const ind = analysis?.indicators;
  const q   = analysis?.quote;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-violet-500 font-bold text-base">✦</span>
          <h1 className="text-sm font-bold uppercase tracking-widest text-slate-800">
            Martin · Chart Analysis
          </h1>
        </div>
        <p className="text-xs text-slate-500">
          การวิเคราะห์กราฟเทคนิคเชิงลึก · grounded จากข้อมูลจริงเท่านั้น · ไม่ใช่คำแนะนำการลงทุน
        </p>
      </div>

      {/* Search + timeframe bar */}
      <form onSubmit={handleSubmit} className="rounded-2xl bg-[#faedcd] border border-[#ccd5ae] shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value.replace(/[^a-zA-Z.\-]/g, "").toUpperCase())}
            placeholder="AAPL, NVDA, BRK.B..."
            maxLength={12}
            className="flex-1 border border-[#ccd5ae] bg-[#fefae0] rounded-xl px-4 py-2.5 text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder:font-normal placeholder:text-slate-400"
            style={{ fontFamily: "var(--font-mono)" }}
            aria-label="Ticker symbol"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 bg-violet-600 hover:bg-violet-700 transition-colors flex-shrink-0"
          >
            {loading ? "กำลังวิเคราะห์..." : "วิเคราะห์"}
          </button>
        </div>

        {/* Timeframe selector */}
        <div className="flex gap-2 flex-wrap">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.value}
              type="button"
              onClick={() => handleTimeframe(tf.value)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                timeframe === tf.value
                  ? "border-violet-400 bg-violet-50 text-violet-700"
                  : "border-[#ccd5ae] text-slate-500 hover:border-violet-300 hover:text-violet-600"
              }`}
            >
              {tf.label}
            </button>
          ))}
          {analysis && (
            <button
              type="button"
              onClick={() => void run(ticker, timeframe, true)}
              disabled={loading}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#ccd5ae] text-slate-500 hover:border-slate-400 transition-colors ml-auto disabled:opacity-40"
            >
              ↻ รีเฟรช
            </button>
          )}
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-red-50/80 border border-red-200 p-4 flex items-start gap-3">
          <span className="text-red-400 text-base">⚠</span>
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => ticker ? void run(ticker, timeframe) : undefined}
              className="text-xs text-red-600 underline mt-1"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#faedcd] border border-[#ccd5ae] overflow-hidden" style={{ height: 320 }}>
            <div className="w-full h-full bg-[#e9edc9]/60 animate-pulse" />
          </div>
          <div className="rounded-2xl bg-violet-50/60 border border-violet-100 p-4 flex items-center gap-3">
            <span className="text-violet-400 animate-pulse text-lg">✦</span>
            <div className="flex-1 space-y-2">
              <p className="text-xs font-semibold text-violet-700">Martin กำลังดึงข้อมูลและวิเคราะห์...</p>
              <p className="text-xs text-violet-500">
                ดึงราคา → คำนวณ RSI / ATR / ADX / Support&Resistance / Fibonacci → ส่งให้ AI วิเคราะห์
              </p>
            </div>
          </div>
          <LoadingSkeleton />
        </div>
      )}

      {/* Analysis result */}
      {analysis && a && ind && q && (
        <div className="space-y-5">
          {/* Ticker header */}
          <div className="rounded-2xl bg-[#faedcd] border border-[#ccd5ae] shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl font-black text-slate-900">{analysis.ticker}</span>
                  {analysis.fundamentals.name && (
                    <span className="text-sm text-slate-500">{analysis.fundamentals.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-500">
                  {analysis.fundamentals.exchange && <span>{analysis.fundamentals.exchange}</span>}
                  {analysis.fundamentals.industry && <span>· {analysis.fundamentals.industry}</span>}
                  <span>· Timeframe: {analysis.timeframe}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xl font-black text-slate-900">${n(q.price)}</div>
                <div className={`text-sm font-bold ${q.changePct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {q.changePct >= 0 ? "+" : ""}{n(q.changePct)}%
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="mt-3 pt-3 border-t border-[#ccd5ae] flex items-center justify-between text-xs text-slate-400 flex-wrap gap-1">
              <span>สร้างเมื่อ {new Date(analysis.meta.cachedAt).toLocaleString("th-TH")}</span>
              <span>{analysis.meta.fromCache ? "⚡ จาก cache" : "🔄 ใหม่"} · {analysis.meta.exchangeNote}</span>
            </div>
          </div>

          {/* Chart */}
          {candles.length > 1 && (
            <div className="rounded-2xl overflow-hidden border border-[#ccd5ae] shadow-sm">
              <PriceChart candles={candles} mode="Price" height={320} ma={{ ma20: true, ma50: true, ma200: true }} showRsi />
            </div>
          )}

          {/* High risk banner */}
          {a.isHighRisk && a.highRiskReason && (
            <HighRiskBanner reason={a.highRiskReason} />
          )}

          {/* Indicator pills */}
          <Section title="ตัวชี้วัดทางเทคนิค" icon="📊">
            <div className="flex gap-2 flex-wrap">
              <IndicatorPill label="RSI-14" value={n(ind.rsi14, 1)}
                sub={ind.rsi14 != null ? ind.rsi14 > 70 ? "Overbought" : ind.rsi14 < 30 ? "Oversold" : "Neutral" : ""} />
              <IndicatorPill label="ATR-14" value={`$${n(ind.atr14)}`}
                sub={ind.atr14 && q.price ? `${((ind.atr14 / q.price) * 100).toFixed(2)}% ของราคา` : ""} />
              <IndicatorPill label="ADX-14" value={n(ind.adx14, 1)}
                sub={ind.adx14 != null ? ind.adx14 > 25 ? "Trending" : "Choppy" : ""} />
              <IndicatorPill label="+DI / -DI" value={`${n(ind.plusDI, 1)} / ${n(ind.minusDI, 1)}`} />
              <IndicatorPill label="Volume" value={ind.volumeRatio != null ? `${ind.volumeRatio.toFixed(2)}x` : "N/A"}
                sub="vs เฉลี่ย 20 วัน" />
              <IndicatorPill label="Trend" value={ind.trend === "uptrend" ? "▲ Up" : ind.trend === "downtrend" ? "▼ Down" : "→ Sideway"} />
            </div>

            {/* MA distances */}
            {(ind.ma20 || ind.ma50 || ind.ma200) && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                {ind.ma20 && (
                  <div className="bg-blue-50/60 rounded-lg p-2.5 border border-blue-100">
                    <p className="text-slate-500 font-medium">MA20</p>
                    <p className="font-bold text-slate-800">${n(ind.ma20)}</p>
                    {ind.pctFromMa20 != null && (
                      <p className={`font-bold ${ind.pctFromMa20 >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {ind.pctFromMa20 >= 0 ? "+" : ""}{ind.pctFromMa20.toFixed(2)}%
                      </p>
                    )}
                  </div>
                )}
                {ind.ma50 && (
                  <div className="bg-amber-50/60 rounded-lg p-2.5 border border-amber-100">
                    <p className="text-slate-500 font-medium">MA50</p>
                    <p className="font-bold text-slate-800">${n(ind.ma50)}</p>
                    {ind.pctFromMa50 != null && (
                      <p className={`font-bold ${ind.pctFromMa50 >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {ind.pctFromMa50 >= 0 ? "+" : ""}{ind.pctFromMa50.toFixed(2)}%
                      </p>
                    )}
                  </div>
                )}
                {ind.ma200 && (
                  <div className="bg-purple-50/60 rounded-lg p-2.5 border border-purple-100">
                    <p className="text-slate-500 font-medium">MA200</p>
                    <p className="font-bold text-slate-800">${n(ind.ma200)}</p>
                    {ind.pctFromMa200 != null && (
                      <p className={`font-bold ${ind.pctFromMa200 >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {ind.pctFromMa200 >= 0 ? "+" : ""}{ind.pctFromMa200.toFixed(2)}%
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Summary */}
          <Section title="สรุปภาพรวม" icon="✦">
            <p className="text-sm text-slate-700 leading-relaxed">{newsTeaser(a.summary)}</p>
          </Section>

          {/* Bull / Bear signals */}
          <Section title="สัญญาณ Bullish vs Bearish" icon="⚡">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-emerald-700 mb-2 uppercase tracking-wide">▲ สัญญาณบวก</p>
                {(a.bullishSignals ?? []).map((s, i) => (
                  <SignalRow key={i} label={s.label} value={s.value} detail={s.detail} color="bg-emerald-500" />
                ))}
                {(!a.bullishSignals?.length) && <p className="text-xs text-slate-400">ไม่มีสัญญาณบวกชัดเจน</p>}
              </div>
              <div>
                <p className="text-xs font-bold text-red-600 mb-2 uppercase tracking-wide">▼ สัญญาณลบ</p>
                {(a.bearishSignals ?? []).map((s, i) => (
                  <SignalRow key={i} label={s.label} value={s.value} detail={s.detail} color="bg-red-500" />
                ))}
                {(!a.bearishSignals?.length) && <p className="text-xs text-slate-400">ไม่มีสัญญาณลบชัดเจน</p>}
              </div>
            </div>

            {a.volumeRead && (
              <div className="mt-3 pt-3 border-t border-[#ccd5ae]">
                <p className="text-xs font-semibold text-slate-600 mb-1">📊 Volume</p>
                <p className="text-xs text-slate-700 leading-relaxed">{a.volumeRead}</p>
              </div>
            )}
            {a.volatilityNote && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-slate-600 mb-1">⚡ Volatility (ATR)</p>
                <p className="text-xs text-slate-700 leading-relaxed">{a.volatilityNote}</p>
              </div>
            )}
          </Section>

          {/* Scenario Playbook */}
          <Section title="Scenario Playbook" icon="🎯">
            <p className="text-xs text-slate-500 -mt-1">
              Entry/Stop/Target คำนวณจาก support, resistance, ATR, Fibonacci ที่มีในข้อมูลจริง
            </p>
            <ScenarioTable scenarios={a.scenarios ?? []} />

            {/* No-trade zone */}
            {a.noTradeZone?.range && (
              <div className="rounded-xl bg-orange-50/60 border border-orange-200 p-3.5 mt-2">
                <p className="text-xs font-bold text-orange-700 mb-1">🚫 No-Trade Zone: {a.noTradeZone.range}</p>
                <p className="text-xs text-orange-600">{a.noTradeZone.reason}</p>
              </div>
            )}

            {/* Invalidation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {a.bullishInvalidation && (
                <div className="rounded-xl bg-[#e9edc9] border border-[#ccd5ae] p-3">
                  <p className="text-xs font-bold text-emerald-700 mb-1">▲ Bull Invalidation</p>
                  <p className="text-xs text-slate-700 leading-snug">{a.bullishInvalidation}</p>
                </div>
              )}
              {a.bearishInvalidation && (
                <div className="rounded-xl bg-[#e9edc9] border border-[#ccd5ae] p-3">
                  <p className="text-xs font-bold text-red-600 mb-1">▼ Bear Invalidation</p>
                  <p className="text-xs text-slate-700 leading-snug">{a.bearishInvalidation}</p>
                </div>
              )}
            </div>

            {/* Management note */}
            {a.managementNote && (
              <div className="rounded-xl bg-blue-50/60 border border-blue-200 p-3.5 mt-2">
                <p className="text-xs font-semibold text-blue-700 mb-1">📋 Trade Management</p>
                <p className="text-xs text-blue-600 leading-relaxed">{a.managementNote}</p>
              </div>
            )}
          </Section>

          {/* Key levels */}
          <Section title="ระดับราคาสำคัญ" icon="📍">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-bold text-red-600 mb-2">Resistance</p>
                {ind.resistance.length > 0
                  ? ind.resistance.map((r, i) => (
                    <p key={i} className="font-mono text-slate-800 py-0.5">${r.price.toFixed(2)}</p>
                  ))
                  : <p className="text-slate-400">ไม่พบระดับ</p>}
              </div>
              <div>
                <p className="font-bold text-emerald-700 mb-2">Support</p>
                {ind.support.length > 0
                  ? ind.support.map((s, i) => (
                    <p key={i} className="font-mono text-slate-800 py-0.5">${s.price.toFixed(2)}</p>
                  ))
                  : <p className="text-slate-400">ไม่พบระดับ</p>}
              </div>
            </div>

            {ind.fibLevels && (
              <div className="mt-3 pt-3 border-t border-[#ccd5ae]">
                <p className="text-xs font-semibold text-slate-600 mb-2">Fibonacci Retracement</p>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {ind.fibLevels.map((f, i) => (
                    <div key={i} className="text-center py-1.5 bg-[#e9edc9] rounded border border-[#ccd5ae]">
                      <p className="text-slate-500">{f.label}</p>
                      <p className="font-bold font-mono text-slate-800">${f.price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* What the chart really says */}
          {a.chartSays && (
            <Section title="กราฟบอกอะไรจริงๆ" icon="🔍">
              <p className="text-sm text-slate-700 leading-relaxed">{a.chartSays}</p>
            </Section>
          )}

          {/* Key lesson */}
          {a.keyLesson && (
            <Section title="บทเรียน · Discipline" icon="📚">
              <p className="text-sm text-slate-700 leading-relaxed">{a.keyLesson}</p>
            </Section>
          )}

          {/* Disclaimer */}
          <div className="rounded-2xl bg-[#e9edc9] border border-[#ccd5ae] p-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              ⚠️ {a.disclaimer ?? "การวิเคราะห์นี้เพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              ข้อมูล {ind.dataPoints} candles · ประมวลผลโดย Martin AI (Groq/Gemini fallback) · {new Date(analysis.meta.cachedAt).toLocaleString("th-TH")}
            </p>
          </div>
        </div>
      )}

      {/* Empty state — before first run */}
      {!analysis && !loading && !error && (
        <div className="rounded-2xl bg-[#faedcd] border border-[#ccd5ae] p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center mx-auto">
            <span className="text-violet-500 text-xl">✦</span>
          </div>
          <p className="text-sm font-semibold text-slate-700">Martin พร้อมวิเคราะห์กราฟให้คุณ</p>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            ใส่ ticker แล้วกด วิเคราะห์ — Martin จะดึงข้อมูลจริง คำนวณ indicator และสร้าง Scenario Playbook ให้
          </p>
          <div className="flex gap-2 justify-center flex-wrap pt-1">
            {["AAPL", "NVDA", "TSLA", "META"].map(t => (
              <button
                key={t}
                onClick={() => { setInput(t); void run(t, timeframe); }}
                className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
