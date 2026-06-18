"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  IChartApi, ISeriesApi, CandlestickData, Time,
  IPriceLine, PriceLineOptions,
} from "lightweight-charts";
import type { StructureResult, SRLevel, Zone, SwingLevel } from "@/app/api/stock/structure/route";
import { AskMartinButton } from "@/components/ai/AskMartinButton";

type TF = "1h" | "4h" | "D" | "W";

interface Toggles {
  swings:  boolean;
  sr:      boolean;
  zones:   boolean;
}

interface Sensitivity {
  lookback:  number; // swing pivot N
  proximity: number; // S&R cluster proximity %
}

function srColor(level: SRLevel): string {
  if (level.flipped) return "#8B5CF6";
  return level.kind === "resistance" ? "#DC2626" : "#16A34A";
}

function zoneColor(zone: Zone): string {
  return zone.kind === "demand" ? "rgba(22,163,74,0.12)" : "rgba(220,38,38,0.12)";
}

function zoneBorder(zone: Zone): string {
  return zone.kind === "demand" ? "rgba(22,163,74,0.5)" : "rgba(220,38,38,0.5)";
}

export function ChartStructureClient({ ticker }: { ticker: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const seriesRef    = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const linesRef     = useRef<IPriceLine[]>([]);

  const [tf,          setTf]          = useState<TF>("D");
  const [data,        setData]        = useState<StructureResult | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [toggles,     setToggles]     = useState<Toggles>({ swings: true, sr: true, zones: true });
  const [sensitivity, setSensitivity] = useState<Sensitivity>({ lookback: 5, proximity: 1.5 });
  const [martinRead,  setMartinRead]  = useState("");
  const [readLoading, setReadLoading] = useState(false);

  // ── Load chart library lazily ────────────────────────────────────────────────
  const initChart = useCallback(async () => {
    if (!containerRef.current || chartRef.current) return;
    const { createChart, CandlestickSeries } = await import("lightweight-charts");
    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: 380,
      layout: { background: { color: "#fefae0" }, textColor: "#1A1A1A" },
      grid:   { vertLines: { color: "#e9edc9" }, horzLines: { color: "#e9edc9" } },
      timeScale: { borderColor: "#ccd5ae" },
      rightPriceScale: { borderColor: "#ccd5ae" },
    });
    seriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor:   "#16A34A", downColor: "#DC2626",
      borderUpColor: "#16A34A", borderDownColor: "#DC2626",
      wickUpColor:   "#16A34A", wickDownColor:   "#DC2626",
    });
    chartRef.current = chart;

    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) chart.applyOptions({ width: w });
    });
    ro.observe(containerRef.current);
  }, []);

  // ── Fetch structure data ──────────────────────────────────────────────────────
  const fetchData = useCallback(async (timeframe: TF) => {
    setLoading(true);
    setError(null);
    setMartinRead("");
    try {
      const res  = await fetch(`/api/stock/structure?ticker=${ticker}&tf=${timeframe}`);
      const json = (await res.json()) as StructureResult & { error?: string };
      if (json.error) { setError(json.error); setData(null); }
      else setData(json);
    } catch { setError("Failed to load chart data"); }
    finally { setLoading(false); }
  }, [ticker]);

  useEffect(() => { void initChart(); }, [initChart]);
  useEffect(() => { void fetchData(tf); }, [tf, fetchData]);

  // ── Render candles + overlays ────────────────────────────────────────────────
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || !data) return;

    // Clear old price lines
    for (const line of linesRef.current) {
      try { seriesRef.current.removePriceLine(line); } catch { /* ignore */ }
    }
    linesRef.current = [];

    // Candles
    const candles: CandlestickData[] = data.candles.map(c => ({
      time:  c.time as Time,
      open:  c.open, high: c.high, low: c.low, close: c.close,
    }));
    seriesRef.current.setData(candles);
    chartRef.current.timeScale().fitContent();

    // S&R lines
    if (toggles.sr) {
      for (const level of data.srLevels) {
        const opts: PriceLineOptions = {
          price:             level.price,
          color:             srColor(level),
          lineWidth:         Math.min(3, level.strength) as 1 | 2 | 3,
          lineStyle:         level.flipped ? 1 : 0,
          lineVisible:       true,
          axisLabelVisible:  true,
          axisLabelColor:    srColor(level),
          axisLabelTextColor: "#fff",
          title:             `${level.flipped ? "Flipped " : ""}${level.kind === "resistance" ? "R" : "S"} $${level.price.toFixed(2)}`,
        };
        const line = seriesRef.current.createPriceLine(opts);
        linesRef.current.push(line);
      }
    }

    // Swing highs/lows — show only 6 most recent
    if (toggles.swings) {
      const recent = data.swings.slice(-6);
      for (const swing of recent) {
        const swingCol = swing.kind === "high" ? "#7C3AED" : "#0891B2";
        const opts: PriceLineOptions = {
          price:              swing.price,
          color:              swingCol,
          lineWidth:          1,
          lineStyle:          2,
          lineVisible:        true,
          axisLabelVisible:   true,
          axisLabelColor:     swingCol,
          axisLabelTextColor: "#fff",
          title:              `${swing.kind === "high" ? "↑" : "↓"} $${swing.price.toFixed(2)}`,
        };
        const line = seriesRef.current.createPriceLine(opts);
        linesRef.current.push(line);
      }
    }
  }, [data, toggles]);

  // ── Martin structural read ────────────────────────────────────────────────────
  async function loadMartinRead() {
    if (!data || data.candles.length === 0) return;
    setReadLoading(true);
    const currentPrice = data.candles[data.candles.length - 1]?.close ?? 0;
    const srText = data.srLevels.slice(0, 4).map(l =>
      `${l.kind} at $${l.price.toFixed(2)} (strength ${l.strength}/5${l.flipped ? ", flipped" : ""})`
    ).join("; ");
    const zoneText = data.zones.slice(0, 3).map(z =>
      `${z.kind} zone $${z.priceLow.toFixed(2)}–$${z.priceHigh.toFixed(2)} (${z.fresh ? "fresh" : "tested"})`
    ).join("; ");
    const swingText = data.swings.slice(-4).map(s =>
      `${s.kind} $${s.price.toFixed(2)}`
    ).join("; ");

    const prompt = `You are Martin, a Licensed Financial Analyst. Describe the chart structure for ${ticker} on the ${tf} timeframe as an observational, educational read — never a buy/sell signal.

Current price: $${currentPrice.toFixed(2)}
ATR: $${data.atr.toFixed(2)}
Recent swing highs/lows: ${swingText || "none computed"}
S/R levels: ${srText || "none computed"}
Supply/Demand zones: ${zoneText || "none computed"}

Give a concise structural read (3-5 sentences): where price sits relative to key levels, which levels are most significant, any notable structure (broken level, zone approaching, etc.). End with: "These are areas of historical interest — not predictions or trade signals."`;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          ticker, locale: "en",
        }),
      });
      if (!res.body) { setReadLoading(false); return; }
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      setMartinRead("");
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const chunk = JSON.parse(payload) as { token?: string };
            if (chunk.token) setMartinRead(prev => prev + chunk.token);
          } catch { /* ignore partial */ }
        }
      }
    } catch { setMartinRead("Unable to generate structural read at this time."); }
    finally { setReadLoading(false); }
  }

  const TF_LABELS: Record<TF, string> = { "1h": "1H", "4h": "4H", "D": "Daily", "W": "Weekly" };

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Timeframe */}
        <div className="flex gap-1 bg-[#e9edc9] rounded-lg p-0.5">
          {(Object.keys(TF_LABELS) as TF[]).map(t => (
            <button key={t} onClick={() => setTf(t)}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                tf === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
              }`}>
              {TF_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Overlay toggles */}
        <div className="flex gap-1.5">
          {([
            { key: "swings", label: "Swings", color: "#7C3AED" },
            { key: "sr",     label: "S/R",    color: "#16A34A" },
            { key: "zones",  label: "Zones",  color: "#D97706" },
          ] as const).map(({ key, label, color }) => (
            <button key={key}
              onClick={() => setToggles(prev => ({ ...prev, [key]: !prev[key] }))}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-full border transition-colors ${
                toggles[key] ? "text-white" : "text-slate-400 border-[#ccd5ae]"
              }`}
              style={toggles[key] ? { background: color, borderColor: color } : {}}>
              {label}
            </button>
          ))}
        </div>

        {/* Sensitivity */}
        <div className="flex items-center gap-1.5 ml-auto text-[10px] text-slate-400">
          <span>Lookback</span>
          <input type="range" min={3} max={10} value={sensitivity.lookback}
            onChange={e => setSensitivity(prev => ({ ...prev, lookback: parseInt(e.target.value) }))}
            className="w-16 h-1.5 accent-violet-500" />
          <span className="font-mono text-slate-600">{sensitivity.lookback}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative border border-[#ccd5ae] rounded-xl overflow-hidden bg-[#fefae0]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#fefae0]/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Loading candles…</span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#fefae0]">
            <div className="text-center px-4">
              <p className="text-sm font-bold text-slate-700">No candle data available</p>
              <p className="text-xs text-slate-400 mt-1">{error}</p>
              <p className="text-xs text-slate-400 mt-1">Yahoo Finance may not cover this ticker or timeframe.</p>
            </div>
          </div>
        )}
        <div ref={containerRef} style={{ height: 380 }} />
      </div>

      {/* Zone legend (canvas overlay not available in price-line API — show as legend) */}
      {data && toggles.zones && data.zones.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.zones.map((z, i) => (
            <div key={i}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold"
              style={{ borderColor: z.kind === "demand" ? "#16A34A" : "#DC2626",
                       background:  z.kind === "demand" ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
                       color:       z.kind === "demand" ? "#16A34A" : "#DC2626" }}>
              {z.kind === "demand" ? "▲ Demand" : "▼ Supply"} ${z.priceLow.toFixed(2)}–${z.priceHigh.toFixed(2)}
              {z.fresh && <span className="bg-current/20 px-1 rounded">fresh</span>}
            </div>
          ))}
        </div>
      )}

      {/* Data freshness */}
      {data && (
        <p className="text-[10px] text-slate-400">
          📊 Data: Yahoo Finance · Computed {new Date(data.computedAt).toLocaleTimeString()} ·
          Technical levels are areas of historical interest — heuristic, not predictions.
        </p>
      )}

      {/* Martin structural read */}
      {data && data.candles.length > 0 && (
        <div className="border border-[#ccd5ae] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900">
            <div className="flex items-center gap-2">
              <span className="text-violet-400 text-xs">✦</span>
              <p className="text-sm font-bold text-white">Martin · Structural Read</p>
            </div>
            {!martinRead && !readLoading && (
              <button onClick={() => void loadMartinRead()}
                className="text-xs font-bold px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors">
                Read Chart
              </button>
            )}
            {(martinRead || readLoading) && (
              <AskMartinButton
                q={`Read the chart structure for ${ticker} on the ${tf} timeframe — where is price relative to key levels?`}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Ask more →
              </AskMartinButton>
            )}
          </div>
          <div className="px-4 py-3 bg-[#fefae0]">
            {readLoading && <p className="text-xs text-slate-400 animate-pulse">Reading structure…</p>}
            {martinRead && (
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{martinRead}</p>
            )}
            {!readLoading && !martinRead && (
              <p className="text-xs text-slate-400">
                Click "Read Chart" for Martin's observational structural analysis of the computed levels.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
