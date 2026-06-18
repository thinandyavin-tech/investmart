"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { IChartApi, ISeriesApi, CandlestickData, Time, IPriceLine, PriceLineOptions, LineData } from "lightweight-charts";
import type { StructureResult, SRLevel, Zone, MALine, ConflArea } from "@/app/api/stock/structure/route";
import { AskMartinButton } from "@/components/ai/AskMartinButton";

type TF = "1h" | "4h" | "D" | "W";
interface Toggles { swings: boolean; sr: boolean; zones: boolean; mas: boolean; fib: boolean; volume: boolean; confluence: boolean; structLabels: boolean }

const TF_LABELS: Record<TF, string> = { "1h": "1H", "4h": "4H", "D": "Daily", "W": "Weekly" };
const MA_COLORS: Record<string, string> = { "sma-20": "#F59E0B", "ema-50": "#3B82F6", "sma-200": "#8B5CF6" };
const TREND_COLOR: Record<string, string> = { up: "#16A34A", down: "#DC2626", range: "#8A8378" };
const STRUCT_COLORS: Record<string, string> = { BOS_UP: "#16A34A", BOS_DOWN: "#DC2626", CHoCH_UP: "#06B6D4", CHoCH_DOWN: "#F97316" };

function srColor(l: SRLevel) { return l.flipped ? "#8B5CF6" : l.kind === "resistance" ? "#DC2626" : "#16A34A"; }

export function ChartStructureClient({ ticker }: { ticker: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const candleRef    = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const maRefs       = useRef<ISeriesApi<"Line">[]>([]);
  const priceLines   = useRef<IPriceLine[]>([]);

  const [tf,          setTf]          = useState<TF>("D");
  const [data,        setData]        = useState<StructureResult | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [toggles,     setToggles]     = useState<Toggles>({ swings: true, sr: true, zones: true, mas: true, fib: true, volume: true, confluence: true, structLabels: true });
  const [lookback,    setLookback]    = useState(5);
  const [martinRead,  setMartinRead]  = useState("");
  const [readLoading, setReadLoading] = useState(false);
  const [hoveredLevel, setHoveredLevel] = useState<{ label: string; detail: string } | null>(null);

  const initChart = useCallback(async () => {
    if (!containerRef.current || chartRef.current) return;
    const lc = await import("lightweight-charts");
    const chart = lc.createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: 400,
      layout: { background: { color: "#fefae0" }, textColor: "#1A1A1A" },
      grid:   { vertLines: { color: "#e9edc9" }, horzLines: { color: "#e9edc9" } },
      timeScale: { borderColor: "#ccd5ae", timeVisible: true },
      rightPriceScale: { borderColor: "#ccd5ae" },
      crosshair: { mode: 1 },
    });
    candleRef.current = chart.addSeries(lc.CandlestickSeries, {
      upColor: "#16A34A", downColor: "#DC2626",
      borderUpColor: "#16A34A", borderDownColor: "#DC2626",
      wickUpColor: "#16A34A", wickDownColor: "#DC2626",
    });
    chartRef.current = chart;
    const ro = new ResizeObserver(e => { const w = e[0]?.contentRect.width; if (w) chart.applyOptions({ width: w }); });
    ro.observe(containerRef.current);
  }, []);

  const clearOverlays = useCallback(() => {
    if (!candleRef.current) return;
    for (const l of priceLines.current) { try { candleRef.current.removePriceLine(l); } catch { /**/ } }
    priceLines.current = [];
    if (chartRef.current) {
      for (const s of maRefs.current) { try { chartRef.current.removeSeries(s); } catch { /**/ } }
    }
    maRefs.current = [];
  }, []);

  const fetchData = useCallback(async (timeframe: TF) => {
    setLoading(true); setError(null); setMartinRead("");
    try {
      const res  = await fetch(`/api/stock/structure?ticker=${ticker}&tf=${timeframe}&lookback=${lookback}`);
      const json = (await res.json()) as StructureResult & { error?: string };
      if (json.error) { setError(json.error); setData(null); }
      else setData(json);
    } catch { setError("Failed to load chart data"); }
    finally { setLoading(false); }
  }, [ticker, lookback]);

  useEffect(() => { void initChart(); }, [initChart]);
  useEffect(() => { void fetchData(tf); }, [tf, fetchData]);

  const makePriceLine = useCallback((opts: PriceLineOptions) => {
    if (!candleRef.current) return;
    try { priceLines.current.push(candleRef.current.createPriceLine(opts)); } catch { /**/ }
  }, []);

  useEffect(() => {
    if (!chartRef.current || !candleRef.current || !data) return;
    clearOverlays();

    // Candles
    candleRef.current.setData(data.candles.map(c => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close })));

    // S/R lines
    if (toggles.sr) {
      for (const l of data.srLevels) {
        const col = srColor(l);
        makePriceLine({ price: l.price, color: col, lineWidth: Math.min(3, l.strength) as 1|2|3, lineStyle: l.flipped ? 1 : 0, lineVisible: true, axisLabelVisible: true, axisLabelColor: col, axisLabelTextColor: "#fff", title: `${l.flipped ? "↔ " : ""}${l.kind === "resistance" ? "R" : "S"}${l.strength} $${l.price.toFixed(2)}` });
      }
    }

    // Swing highs/lows
    if (toggles.swings) {
      for (const s of data.swings.slice(-8)) {
        const col = s.kind === "high" ? "#7C3AED" : "#0891B2";
        makePriceLine({ price: s.price, color: col, lineWidth: 1, lineStyle: 2, lineVisible: true, axisLabelVisible: false, axisLabelColor: col, axisLabelTextColor: "#fff", title: `${s.kind === "high" ? "↑" : "↓"} $${s.price.toFixed(2)}` });
      }
    }

    // Fibonacci levels
    if (toggles.fib && data.autoFib) {
      for (const l of data.autoFib.levels) {
        const isGolden = l.ratio >= 0.618 && l.ratio <= 0.65;
        const col = isGolden ? "#F59E0B" : "#94A3B8";
        makePriceLine({ price: l.price, color: col, lineWidth: isGolden ? 2 : 1, lineStyle: isGolden ? 0 : 2, lineVisible: true, axisLabelVisible: true, axisLabelColor: col, axisLabelTextColor: "#fff", title: `Fib ${(l.ratio * 100).toFixed(0)}% $${l.price.toFixed(2)}` });
      }
    }

    // Structure labels (BOS/CHoCH)
    if (toggles.structLabels) {
      for (const lbl of data.structLabels) {
        const col = STRUCT_COLORS[lbl.kind] ?? "#8A8378";
        makePriceLine({ price: lbl.price, color: col, lineWidth: 1, lineStyle: 4, lineVisible: true, axisLabelVisible: true, axisLabelColor: col, axisLabelTextColor: "#fff", title: lbl.kind });
      }
    }

    // Volume POC
    if (toggles.volume && data.volumeProfile) {
      const { poc, vahPrice, valPrice } = data.volumeProfile;
      makePriceLine({ price: poc,      color: "#DC2626", lineWidth: 2, lineStyle: 0, lineVisible: true, axisLabelVisible: true, axisLabelColor: "#DC2626", axisLabelTextColor: "#fff", title: `POC $${poc.toFixed(2)}` });
      makePriceLine({ price: vahPrice, color: "#94A3B8", lineWidth: 1, lineStyle: 1, lineVisible: true, axisLabelVisible: true, axisLabelColor: "#94A3B8", axisLabelTextColor: "#fff", title: `VAH $${vahPrice.toFixed(2)}` });
      makePriceLine({ price: valPrice, color: "#94A3B8", lineWidth: 1, lineStyle: 1, lineVisible: true, axisLabelVisible: true, axisLabelColor: "#94A3B8", axisLabelTextColor: "#fff", title: `VAL $${valPrice.toFixed(2)}` });
    }

    // Confluence areas
    if (toggles.confluence) {
      for (const area of data.confluence) {
        const mid = (area.priceHigh + area.priceLow) / 2;
        makePriceLine({ price: mid, color: "#F97316", lineWidth: 2, lineStyle: 0, lineVisible: true, axisLabelVisible: true, axisLabelColor: "#F97316", axisLabelTextColor: "#fff", title: `★ ${area.score}pts ${area.signals.slice(0,2).join("+")}` });
      }
    }

    // Moving averages — line series
    (async () => {
      if (!toggles.mas || !chartRef.current) return;
      const lc = await import("lightweight-charts");
      for (const ma of data.mas) {
        if (ma.values.length < 2) continue;
        const col = MA_COLORS[`${ma.kind}-${ma.period}`] ?? "#94A3B8";
        const series = chartRef.current.addSeries(lc.LineSeries, { color: col, lineWidth: 1, priceLineVisible: false, lastValueVisible: true, title: `${ma.kind.toUpperCase()}${ma.period}` });
        series.setData(ma.values.map(v => ({ time: v.time as Time, value: v.value })) as LineData[]);
        maRefs.current.push(series);
      }
    })();

    chartRef.current.timeScale().fitContent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, toggles]);

  // Martin structural read
  async function loadMartinRead() {
    if (!data?.candles.length) return;
    setReadLoading(true); setMartinRead("");
    const cur   = data.candles[data.candles.length-1]?.close ?? 0;
    const trendDesc = data.trend === "up" ? "uptrend (higher-highs, higher-lows)" : data.trend === "down" ? "downtrend (lower-highs, lower-lows)" : "range/consolidation";
    const srTop3    = data.srLevels.slice(0,3).map(l => `${l.kind} $${l.price.toFixed(2)} (str ${l.strength})`).join("; ");
    const zoneTop2  = data.zones.slice(0,2).map(z => `${z.kind} $${z.priceLow.toFixed(2)}–$${z.priceHigh.toFixed(2)} ${z.fresh?"(fresh)":"(tested)"}`).join("; ");
    const fibCtx    = data.autoFib ? `Fib on ${data.autoFib.direction} swing $${data.autoFib.swingLow.toFixed(2)}–$${data.autoFib.swingHigh.toFixed(2)}; golden pocket: $${(data.autoFib.levels.find(l=>l.ratio===0.618)?.price??0).toFixed(2)}–$${(data.autoFib.levels.find(l=>l.ratio===0.65)?.price??0).toFixed(2)}` : "no Fib";
    const bos       = data.structLabels.slice(-2).map(l => l.kind).join(", ") || "none";
    const poc       = data.volumeProfile ? `$${data.volumeProfile.poc.toFixed(2)}` : "N/A";
    const top5      = data.confluence.slice(0,3).map(a => `$${((a.priceHigh+a.priceLow)/2).toFixed(2)} (${a.signals.join("+")})`).join("; ");

    const prompt = `You are Martin, Licensed Financial Analyst. Give a concise, observational structural read for ${ticker} on the ${tf} timeframe. Use only these computed values — no fabrication.

Current price: $${cur.toFixed(2)} | ATR: $${data.atr.toFixed(2)}
Trend: ${trendDesc}
Recent BOS/CHoCH: ${bos}
S/R levels: ${srTop3 || "none"}
Supply/Demand zones: ${zoneTop2 || "none"}
Fibonacci: ${fibCtx}
Volume POC: ${poc}
Top confluence areas: ${top5 || "none"}

Structure read (4-6 sentences): trend context, where price sits vs key levels, the most significant levels above and below, any notable structure events (BOS/CHoCH), confluence areas to watch. Be direct and professional.

End with: "These are areas of historical interest computed algorithmically — not buy/sell signals. Always do your own research."`;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], ticker, locale: "en" }),
      });
      if (!res.body) { setReadLoading(false); return; }
      const reader = res.body.getReader();
      const dec    = new TextDecoder();
      let   buf    = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const p = line.slice(6).trim();
          if (p === "[DONE]") break;
          try { const c = JSON.parse(p) as { token?: string }; if (c.token) setMartinRead(prev => prev + c.token); } catch { /**/ }
        }
      }
    } catch { setMartinRead("Unable to generate structural read."); }
    finally { setReadLoading(false); }
  }

  const toggleKey = (k: keyof Toggles) => setToggles(p => ({ ...p, [k]: !p[k] }));

  const OVERLAY_BTNS: { key: keyof Toggles; label: string; color: string }[] = [
    { key: "swings",       label: "Swings",     color: "#7C3AED" },
    { key: "sr",           label: "S/R",         color: "#16A34A" },
    { key: "zones",        label: "Zones",       color: "#D97706" },
    { key: "mas",          label: "MAs",         color: "#3B82F6" },
    { key: "fib",          label: "Fib",         color: "#F59E0B" },
    { key: "structLabels", label: "BOS/CHoCH",   color: "#06B6D4" },
    { key: "volume",       label: "Vol Profile", color: "#DC2626" },
    { key: "confluence",   label: "Confluence",  color: "#F97316" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Controls row */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Timeframe */}
        <div className="flex gap-0.5 bg-[#e9edc9] rounded-lg p-0.5">
          {(["1h","4h","D","W"] as TF[]).map(t => (
            <button key={t} onClick={() => setTf(t)}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${tf===t ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
              {TF_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Trend badge */}
        {data && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full text-white"
            style={{ background: TREND_COLOR[data.trend] }}>
            {data.trend === "up" ? "↑ Uptrend" : data.trend === "down" ? "↓ Downtrend" : "→ Range"}
          </span>
        )}

        {/* Overlay toggles */}
        <div className="flex flex-wrap gap-1">
          {OVERLAY_BTNS.map(({ key, label, color }) => (
            <button key={key} onClick={() => toggleKey(key)}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-full border transition-colors ${toggles[key] ? "text-white" : "text-slate-400 border-[#ccd5ae]"}`}
              style={toggles[key] ? { background: color, borderColor: color } : {}}>
              {label}
            </button>
          ))}
        </div>

        {/* Lookback */}
        <div className="flex items-center gap-1.5 ml-auto text-[10px] text-slate-400 flex-shrink-0">
          <span>N=</span>
          <input type="range" min={2} max={10} value={lookback} onChange={e => setLookback(+e.target.value)}
            className="w-14 h-1.5 accent-violet-500" />
          <span className="font-mono w-3">{lookback}</span>
          <button onClick={() => void fetchData(tf)} className="text-[10px] text-violet-500 hover:text-violet-700 font-bold ml-1">↺</button>
        </div>
      </div>

      {/* Chart */}
      <div className="relative border border-[#ccd5ae] rounded-xl overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#fefae0]/80 gap-2">
            <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400">Loading {tf} candles…</span>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#fefae0] gap-2 px-4">
            <span className="text-2xl">📊</span>
            <p className="text-sm font-bold text-slate-600">No candle data</p>
            <p className="text-xs text-slate-400 text-center">{error}</p>
          </div>
        )}
        <div ref={containerRef} style={{ height: 400 }} />
      </div>

      {/* Legend rows */}
      {data && (
        <div className="flex flex-col gap-1.5">
          {/* Zones */}
          {toggles.zones && data.zones.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.zones.map((z,i) => (
                <button key={i}
                  onMouseEnter={() => setHoveredLevel({ label: `${z.kind} Zone`, detail: `$${z.priceLow.toFixed(2)}–$${z.priceHigh.toFixed(2)} · str ${z.strength} · ${z.fresh?"fresh":"tested"}` })}
                  onMouseLeave={() => setHoveredLevel(null)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold cursor-default"
                  style={{ borderColor: z.kind==="demand"?"#16A34A":"#DC2626", background: z.kind==="demand"?"rgba(22,163,74,0.08)":"rgba(220,38,38,0.08)", color: z.kind==="demand"?"#16A34A":"#DC2626" }}>
                  {z.kind==="demand"?"▲":"▼"} ${z.priceLow.toFixed(2)}–${z.priceHigh.toFixed(2)}
                  {z.fresh && <span className="opacity-70">(fresh)</span>}
                </button>
              ))}
            </div>
          )}

          {/* Confluence */}
          {toggles.confluence && data.confluence.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.confluence.map((a,i) => (
                <button key={i}
                  onMouseEnter={() => setHoveredLevel({ label: "Confluence Area", detail: `$${((a.priceHigh+a.priceLow)/2).toFixed(2)} · score ${a.score} · ${a.signals.join(", ")}` })}
                  onMouseLeave={() => setHoveredLevel(null)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-orange-300 bg-orange-50 text-[10px] font-semibold text-orange-700 cursor-default">
                  ★ {a.score}pts — {a.signals.slice(0,3).join("+")}
                </button>
              ))}
            </div>
          )}

          {/* Hovered level tooltip */}
          {hoveredLevel && (
            <div className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs flex gap-2">
              <span className="font-bold">{hoveredLevel.label}:</span>
              <span className="text-slate-300">{hoveredLevel.detail}</span>
            </div>
          )}

          {/* MA legend */}
          {toggles.mas && (
            <div className="flex gap-3">
              {data.mas.map(ma => (
                <span key={`${ma.kind}-${ma.period}`} className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="w-3 h-0.5 rounded" style={{ background: MA_COLORS[`${ma.kind}-${ma.period}`] ?? "#94A3B8", display: "inline-block" }} />
                  {ma.kind.toUpperCase()}{ma.period}
                  {ma.values.length > 0 && <span className="font-mono">${ma.values[ma.values.length-1]?.value.toFixed(2)}</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gaps info */}
      {data && data.gaps.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.gaps.map((g,i) => (
            <span key={i} className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${g.direction==="up" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-red-300 bg-red-50 text-red-700"}`}>
              {g.direction==="up"?"↑":"↓"} Gap ${g.gapLow.toFixed(2)}–${g.gapHigh.toFixed(2)} (unfilled)
            </span>
          ))}
        </div>
      )}

      {/* Data source */}
      {data && (
        <p className="text-[10px] text-slate-400">
          📊 Yahoo Finance · {data.candles.length} candles · Computed {new Date(data.computedAt).toLocaleTimeString()} ·
          Technical levels are algorithmic heuristics — not predictions or advice.
        </p>
      )}

      {/* Martin read */}
      {data && data.candles.length > 0 && (
        <div className="border border-[#ccd5ae] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900">
            <div className="flex items-center gap-2">
              <span className="text-violet-400 text-xs">✦</span>
              <p className="text-sm font-bold text-white">Martin · Structural Read</p>
              <span className="text-[10px] text-slate-400">Licensed Financial Analyst</span>
            </div>
            <div className="flex gap-2">
              {!martinRead && !readLoading && (
                <button onClick={() => void loadMartinRead()}
                  className="text-xs font-bold px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors">
                  Read Chart
                </button>
              )}
              {(martinRead || readLoading) && (
                <button onClick={() => { setMartinRead(""); void loadMartinRead(); }}
                  className="text-xs text-slate-400 hover:text-white transition-colors">
                  ↺ Refresh
                </button>
              )}
              {data && (
                <AskMartinButton
                  q={`Analyse the chart structure for ${ticker} on the ${tf} timeframe in detail — trend, key levels, zones, and what to watch next.`}
                  className="text-xs font-bold px-3 py-1 rounded-lg border border-violet-500 text-violet-300 hover:bg-violet-600 hover:text-white transition-colors">
                  Ask More →
                </AskMartinButton>
              )}
            </div>
          </div>
          <div className="px-4 py-3 bg-[#fefae0]">
            {readLoading && <p className="text-xs text-slate-400 animate-pulse">Reading structure…</p>}
            {martinRead && <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{martinRead}</p>}
            {!readLoading && !martinRead && (
              <p className="text-xs text-slate-400">Click "Read Chart" for Martin's observational analysis of the computed levels — trend, S/R, zones, confluence, Fibonacci context.</p>
            )}
          </div>
        </div>
      )}

      {/* Phase 4: Alert shortcut from levels */}
      {data && data.srLevels.length > 0 && (
        <div className="border border-[#ccd5ae] rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Set Alert at Key Level</p>
          <div className="flex flex-wrap gap-1.5">
            {data.srLevels.slice(0, 5).map((l, i) => (
              <a key={i} href={`/alerts?ticker=${ticker}&price=${l.price.toFixed(2)}&condition=${l.kind === "resistance" ? "above" : "below"}`}
                className="text-[10px] px-2 py-1 rounded-lg border font-semibold transition-colors hover:text-white"
                style={{ borderColor: srColor(l), color: srColor(l) }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = srColor(l); }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                🔔 ${l.price.toFixed(2)} {l.kind === "resistance" ? "↑" : "↓"}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
