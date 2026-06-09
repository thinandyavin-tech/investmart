"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { InfographicData } from "@/app/api/stock/infographic/route";

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ prices, up }: { prices: number[]; up: boolean }) {
  if (prices.length < 2) return null;
  const W = 120, H = 40;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pts = prices
    .map((p, i) => `${(i / (prices.length - 1)) * W},${H - ((p - min) / range) * H}`)
    .join(" ");
  const color = up ? "#16A34A" : "#DC2626";
  return (
    <svg width={W} height={H} aria-hidden="true" style={{ display: "block" }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 leading-none">{label}</span>
      <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 leading-tight">{value}</span>
    </div>
  );
}

// ─── RSI gauge ───────────────────────────────────────────────────────────────

function RsiGauge({ rsi }: { rsi: number }) {
  const color = rsi >= 70 ? "#DC2626" : rsi <= 30 ? "#16A34A" : "#8B5CF6";
  const label = rsi >= 70 ? "Overbought" : rsi <= 30 ? "Oversold" : "Neutral";
  const pct   = (rsi / 100) * 100;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">RSI-14</div>
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm font-bold font-mono" style={{ color }}>{rsi}</span>
        <span className="text-[10px] text-slate-500">{label}</span>
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface StockInfographicProps {
  ticker:  string;
  onClose?: () => void;
}

export function StockInfographic({ ticker, onClose }: StockInfographicProps) {
  const [data, setData]         = useState<InfographicData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [downloading, setDL]    = useState(false);
  const cardRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/stock/infographic?ticker=${encodeURIComponent(ticker)}`)
      .then(r => { if (!r.ok) throw new Error("ไม่สามารถโหลดข้อมูลได้"); return r.json(); })
      .then((d: InfographicData) => setData(d))
      .catch(e => setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด"))
      .finally(() => setLoading(false));
  }, [ticker]);

  const download = useCallback(async () => {
    if (!cardRef.current || !data) return;
    setDL(true);
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.ticker}-investmart.png`;
      a.click();
    } catch {
      // silent — download is a bonus feature
    } finally {
      setDL(false);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/30 p-5 animate-pulse w-full max-w-sm">
        <div className="h-5 w-24 bg-white/50 rounded mb-3" />
        <div className="h-8 w-32 bg-white/50 rounded mb-4" />
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[0,1,2].map(i => <div key={i} className="h-10 bg-white/50 rounded" />)}
        </div>
        <div className="h-16 bg-white/50 rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/30 p-4 max-w-sm">
        <p className="text-sm text-red-600">{error ?? "ไม่พบข้อมูล"}</p>
      </div>
    );
  }

  const noPrice = data.priceUnavailable ?? data.price === 0;
  const up    = !noPrice && data.change1D >= 0;
  const sign  = up ? "+" : "";
  const clr   = noPrice ? "#94A3B8" : up ? "#16A34A" : "#DC2626";
  const arrow = noPrice ? "—" : up ? "▲" : "▼";

  return (
    <div className="w-full max-w-sm">
      {/* Download + close controls */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs text-slate-500 font-mono">InvestMart Infographic</span>
        <div className="flex gap-2">
          <button
            onClick={download}
            disabled={downloading}
            className="text-[11px] font-semibold text-violet-600 hover:text-violet-800 transition-colors disabled:opacity-40"
            aria-label="ดาวน์โหลดเป็น PNG"
          >
            {downloading ? "กำลังบันทึก..." : "💾 บันทึก PNG"}
          </button>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xs" aria-label="ปิด">✕</button>
          )}
        </div>
      </div>

      {/* Card — this is what gets exported */}
      <div
        ref={cardRef}
        className="rounded-2xl border border-white/30 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(237,233,254,0.80) 100%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          fontFamily: '"Noto Sans Thai", "Inter", system-ui, sans-serif',
        }}
      >
        {/* Header stripe */}
        <div className="px-4 pt-4 pb-3 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Brand */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold tracking-[0.15em] text-violet-600 uppercase">INVESTMART</span>
              <span className="text-[10px] text-slate-400">✦ Martin</span>
            </div>
            {/* Ticker + company */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-bold font-mono text-slate-900 leading-none">{data.ticker}</span>
              <span className="text-xs text-slate-500 truncate max-w-[140px]">{data.companyName}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">{data.sector}</div>
          </div>

          {/* Sparkline */}
          <div className="flex-shrink-0 ml-3">
            <Sparkline prices={data.sparkline} up={up} />
            <div className="text-[10px] text-slate-400 text-center mt-0.5">3M</div>
          </div>
        </div>

        {/* Price row */}
        <div className="px-4 pb-3 flex items-end gap-3">
          {noPrice ? (
            <span className="text-sm font-medium text-slate-400">ราคาไม่พร้อมใช้งาน (Finnhub ไม่มีข้อมูล)</span>
          ) : (
            <>
              <span className="text-3xl font-bold font-mono text-slate-900">${data.price.toFixed(2)}</span>
              <span className="text-base font-bold font-mono pb-0.5" style={{ color: clr }}>
                {arrow} {sign}{data.change1D.toFixed(2)}%
              </span>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-white/40" />

        {/* Stats grid */}
        <div className="px-4 py-3 grid grid-cols-3 gap-3">
          <Stat label="Mkt Cap"  value={data.marketCap} />
          <Stat label="P/E TTM"  value={data.pe} />
          <Stat label="PEG"      value={data.peg} />
          <Stat label="52W High" value={data.week52High ? `$${data.week52High.toFixed(0)}` : "N/A"} />
          <Stat label="52W Low"  value={data.week52Low  ? `$${data.week52Low.toFixed(0)}`  : "N/A"} />
          <Stat label="Avg Vol"  value={data.volume10d} />
        </div>

        {/* RSI gauge */}
        {data.rsi !== null && (
          <div className="px-4 pb-3">
            <RsiGauge rsi={data.rsi} />
          </div>
        )}

        {/* Divider */}
        <div className="mx-4 border-t border-white/40" />

        {/* Martin takeaway */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">✦ Martin's Takeaway</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-700">{data.takeaway}</p>
        </div>

        {/* Footer */}
        <div className="px-4 pb-3 pt-1 border-t border-white/40">
          <p className="text-[10px] text-slate-400 leading-snug">
            ข้อมูลจริง · บทวิเคราะห์โดย Martin · ไม่ใช่คำแนะนำการลงทุน
            <br />
            {new Date(data.generatedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
      </div>
    </div>
  );
}
