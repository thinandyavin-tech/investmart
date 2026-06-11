"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { AssetsPayload, EnrichedHolding } from "@/app/api/portfolio/assets/route";

// ─── Formatters ────────────────────────────────────────────────────────────────

const thb     = (v: number) => `฿${Math.abs(v).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
const pctFmt  = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const clr     = (v: number) => v >= 0 ? "#16A34A" : "#DC2626";
const clrCls  = (v: number) => v >= 0 ? "text-emerald-600" : "text-red-500";

const STARTING_THB = 1_250_000;

// ─── Sector grouping ──────────────────────────────────────────────────────────

interface SectorSlice {
  sector: string;
  valueThb: number;
  pct: number;
}

// Broad grouping so the bar doesn't fragment into 30 slivers
const SECTOR_COLORS: Record<string, string> = {
  Technology:           "#8B5CF6",
  Semiconductors:       "#7C3AED",
  Software:             "#6D28D9",
  "Media & Entertainment": "#A78BFA",
  Healthcare:           "#10B981",
  Biotechnology:        "#059669",
  Pharmaceuticals:      "#047857",
  Finance:              "#3B82F6",
  Banks:                "#2563EB",
  Insurance:            "#1D4ED8",
  "Financial Services": "#1E40AF",
  "Consumer Cyclical":  "#F59E0B",
  "Consumer Discretionary": "#F59E0B",
  "Consumer Defensive": "#D97706",
  Energy:               "#EF4444",
  "Oil, Gas & Consumable Fuels": "#DC2626",
  Industrials:          "#6B7280",
  Materials:            "#92400E",
  "Real Estate":        "#0891B2",
  Utilities:            "#0E7490",
  Telecommunications:   "#DB2777",
  Cash:                 "#D1D5DB",
};

function sectorColor(sector: string): string {
  if (SECTOR_COLORS[sector]) return SECTOR_COLORS[sector];
  for (const [key, color] of Object.entries(SECTOR_COLORS)) {
    if (sector.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "#94A3B8";
}

function buildSectors(holdings: EnrichedHolding[], cashThb: number, totalValueThb: number): SectorSlice[] {
  const map = new Map<string, number>();
  for (const h of holdings) {
    const s = h.sector ?? "Other";
    map.set(s, (map.get(s) ?? 0) + h.holdingValueThb);
  }
  if (cashThb > 0) map.set("Cash", (map.get("Cash") ?? 0) + cashThb);

  const slices: SectorSlice[] = Array.from(map.entries())
    .map(([sector, valueThb]) => ({
      sector,
      valueThb,
      pct: totalValueThb > 0 ? (valueThb / totalValueThb) * 100 : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  return slices;
}

// ─── Concentration flags ──────────────────────────────────────────────────────

interface ConcentrationFact {
  text: string;
  level: "info" | "high";
}

function getConcentrationFacts(
  holdings: EnrichedHolding[],
  sectors: SectorSlice[],
): ConcentrationFact[] {
  const facts: ConcentrationFact[] = [];
  for (const h of holdings) {
    if (h.weight >= 40) facts.push({ text: `${h.ticker} = ${h.weight.toFixed(0)}% ของพอร์ต`, level: "high" });
    else if (h.weight >= 25) facts.push({ text: `${h.ticker} = ${h.weight.toFixed(0)}% ของพอร์ต`, level: "info" });
  }
  for (const s of sectors) {
    if (s.sector === "Cash") continue;
    if (s.pct >= 60) facts.push({ text: `${s.sector} = ${s.pct.toFixed(0)}% ของพอร์ต`, level: "high" });
    else if (s.pct >= 45) facts.push({ text: `${s.sector} = ${s.pct.toFixed(0)}% ของพอร์ต`, level: "info" });
  }
  return facts;
}

// ─── Portfolio vs SPY comparison chart ────────────────────────────────────────

interface Snapshot { valueThb: number; createdAt: string }

async function fetchSpyCloses(fromDate: string): Promise<Map<string, number>> {
  try {
    // Compute days since fromDate for Yahoo Finance range
    const fromMs = new Date(fromDate).getTime();
    const nowMs  = Date.now();
    const daysDiff = Math.ceil((nowMs - fromMs) / 86_400_000);
    const range  = daysDiff > 365 ? "2y" : daysDiff > 90 ? "1y" : "6mo";
    const url    = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=${range}`;
    const res    = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return new Map();
    const data = (await res.json()) as {
      chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ close?: (number|null)[] }> } }> };
    };
    const result = data.chart?.result?.[0];
    if (!result?.timestamp || !result.indicators?.quote?.[0]) return new Map();
    const ts     = result.timestamp;
    const closes = result.indicators.quote[0].close ?? [];
    const m      = new Map<string, number>();
    ts.forEach((t, i) => {
      const c = closes[i];
      if (c && c > 0) m.set(new Date(t * 1000).toISOString().slice(0, 10), c);
    });
    return m;
  } catch { return new Map(); }
}

function nearestSpyClose(dateIso: string, spyMap: Map<string, number>): number | null {
  // Try exact date, then up to 4 days back (weekend/holiday buffer)
  for (let offset = 0; offset <= 4; offset++) {
    const d = new Date(dateIso);
    d.setDate(d.getDate() - offset);
    const key = d.toISOString().slice(0, 10);
    const v = spyMap.get(key);
    if (v) return v;
  }
  return null;
}

interface ChartPoint { time: number; portfolio: number; spy: number | null }

function PerformanceChart({ snapshots }: { snapshots: Snapshot[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef   = useRef(false);
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [hasSpyData, setHasSpyData] = useState(false);

  useEffect(() => {
    if (snapshots.length < 2) return;
    void (async () => {
      const firstDate = snapshots[0].createdAt;
      const spyMap    = await fetchSpyCloses(firstDate);
      const firstSnap = snapshots[0].valueThb;
      const firstSpy  = nearestSpyClose(firstDate.slice(0, 10), spyMap);
      let hasS = !!firstSpy;

      const pts: ChartPoint[] = snapshots.map(s => {
        const dateStr = s.createdAt.slice(0, 10);
        const ts      = Math.floor(new Date(s.createdAt).getTime() / 1000);
        const portPct = firstSnap > 0 ? ((s.valueThb / firstSnap) - 1) * 100 : 0;
        const spyClose = nearestSpyClose(dateStr, spyMap);
        const spyPct   = (firstSpy && spyClose) ? ((spyClose / firstSpy) - 1) * 100 : null;
        if (spyPct === null) hasS = false;
        return { time: ts, portfolio: portPct, spy: spyPct };
      });
      setPoints(pts);
      setHasSpyData(hasS && firstSpy !== null);
    })();
  }, [snapshots]);

  useEffect(() => {
    if (!containerRef.current || mountedRef.current || points.length < 2) return;
    mountedRef.current = true;

    void (async () => {
      const { createChart, LineSeries, ColorType } = await import("lightweight-charts");
      if (!containerRef.current) return;

      const chart = createChart(containerRef.current, {
        width:  containerRef.current.clientWidth,
        height: 140,
        layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#64748B", fontSize: 9 },
        grid:   { vertLines: { visible: false }, horzLines: { color: "#E2E8F0" } },
        rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.1 }, borderVisible: false },
        timeScale: { borderVisible: false, timeVisible: false },
        crosshair: { vertLine: { visible: true, labelVisible: false }, horzLine: { labelVisible: true } },
        handleScroll: false,
        handleScale:  false,
      });

      const portSeries = chart.addSeries(LineSeries, {
        color: "#8B5CF6", lineWidth: 2,
        priceFormat: { type: "percent", precision: 2 },
        lastValueVisible: true, priceLineVisible: false,
        title: "พอร์ต",
      });
      portSeries.setData(points.map(p => ({ time: p.time as import("lightweight-charts").UTCTimestamp, value: p.portfolio })));

      if (hasSpyData) {
        const spySeries = chart.addSeries(LineSeries, {
          color: "#94A3B8", lineWidth: 1,
          priceFormat: { type: "percent", precision: 2 },
          lastValueVisible: true, priceLineVisible: false,
          title: "SPY",
        });
        spySeries.setData(
          points
            .filter(p => p.spy !== null)
            .map(p => ({ time: p.time as import("lightweight-charts").UTCTimestamp, value: p.spy! }))
        );
      }

      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
      });
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    })();
  }, [points, hasSpyData]);

  if (snapshots.length < 2) {
    return (
      <div className="h-20 flex items-center justify-center border border-dashed border-[#C8BFB0]">
        <p className="text-xs text-[#8A8378]">กำลังสร้างประวัติ… จะแสดงหลังซื้อขาย 2 ครั้งขึ้นไป</p>
      </div>
    );
  }

  return (
    <div>
      <div ref={containerRef} className="w-full" style={{ height: 140 }} />
      <div className="flex gap-3 mt-1">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 rounded-full bg-violet-500" />
          <span className="text-[10px] text-[#8A8378]">พอร์ตคุณ</span>
        </div>
        {hasSpyData && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 rounded-full bg-[#8A8378]" />
            <span className="text-[10px] text-[#8A8378]">S&P 500 (SPY)</span>
          </div>
        )}
        {!hasSpyData && snapshots.length >= 2 && (
          <span className="text-[10px] text-[#8A8378] italic">เปรียบเทียบ SPY ไม่พร้อมใช้งาน</span>
        )}
      </div>
    </div>
  );
}

// ─── Main PortfolioHero ────────────────────────────────────────────────────────

function SkeletonHero() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-10 w-48 skeleton rounded" />
      <div className="h-5 w-32 skeleton rounded" />
      <div className="h-4 w-full skeleton rounded" />
      <div className="grid grid-cols-2 gap-2">
        {[0,1,2,3].map(i => <div key={i} className="h-12 skeleton rounded" />)}
      </div>
    </div>
  );
}

interface PortfolioHeroProps {
  /** compact mode — used on mobile home; shows less detail */
  compact?: boolean;
}

export function PortfolioHero({ compact = false }: PortfolioHeroProps) {
  const [data, setData]         = useState<AssetsPayload | null>(null);
  const [snapshots, setSnaps]   = useState<Snapshot[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [unauthorized, setUnauth] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [assetsRes, histRes] = await Promise.all([
          fetch("/api/portfolio/assets"),
          fetch("/api/portfolio/history"),
        ]);
        if (assetsRes.status === 401) { setUnauth(true); return; }
        if (!assetsRes.ok) { setError("ไม่สามารถโหลดพอร์ตได้"); return; }

        const assets = (await assetsRes.json()) as AssetsPayload;
        setData(assets);

        if (histRes.ok) {
          const hist = (await histRes.json()) as { snapshots: Snapshot[] };
          setSnaps(hist.snapshots ?? []);
        }
      } catch {
        setError("ไม่สามารถโหลดพอร์ตได้");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <div className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm p-5">
      <SkeletonHero />
    </div>
  );

  if (unauthorized) return (
    <div className="bg-[#FDFAF4]/90 border border-[#E0D9CC] shadow-card p-5 text-center space-y-3">
      <p className="text-sm font-bold text-[#1F1A14]">พอร์ตจำลองหุ้น US</p>
      <p className="text-xs text-[#8A8378] leading-relaxed">
        เริ่มด้วย ฿1,250,000 · จำลองซื้อขายหุ้น US ฟรี · ไม่ใช้เงินจริง
      </p>
      <div className="flex gap-2 justify-center">
        <Link href="/signin" className="text-xs font-bold px-4 py-2 bg-[#1F1A14] text-white hover:bg-[#302820] transition-colors">เข้าสู่ระบบ</Link>
        <Link href="/signup" className="text-xs font-bold px-4 py-2 bg-violet-600 text-white hover:bg-violet-700 transition-colors">สมัครฟรี</Link>
      </div>
    </div>
  );

  if (error) return (
    <div className="rounded-2xl bg-white/60 border border-white/40 p-4 text-center">
      <p className="text-xs text-red-500">{error}</p>
    </div>
  );

  if (!data) return null;

  const { holdings, cashThb, totalValueThb, change1DThb, change1DPct, unrealizedPnlThb, unrealizedPnlPct, fxRate, asOf } = data;
  const pnlVsStart    = totalValueThb - STARTING_THB;
  const pnlVsStartPct = (pnlVsStart / STARTING_THB) * 100;
  const sectors       = buildSectors(holdings, cashThb, totalValueThb);
  const concentration = getConcentrationFacts(holdings, sectors);

  // Top 3 holdings by value
  const topHoldings = [...holdings].sort((a, b) => b.holdingValueThb - a.holdingValueThb).slice(0, 3);

  // Best/worst performers today
  const hasMovers = holdings.length > 0;
  const best  = hasMovers ? [...holdings].sort((a, b) => b.change1D - a.change1D)[0] : null;
  const worst = hasMovers ? [...holdings].sort((a, b) => a.change1D - b.change1D)[0] : null;

  // Empty state: no holdings
  if (holdings.length === 0) {
    return (
      <div className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm p-5 space-y-3">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-3xl font-black font-mono text-[#1F1A14]">{thb(totalValueThb)}</span>
          <span className="text-xs text-slate-400">เงินสด (จำลอง)</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          พอร์ตของคุณยังว่างอยู่ · เริ่มต้นด้วยการค้นหาหุ้น แล้วกด Paper Trade
        </p>
        <div className="flex gap-2 flex-wrap">
          <Link href="/radar" className="text-xs font-bold px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors">
            📡 เรดาร์แสกนหุ้น
          </Link>
          <Link href="/search" className="text-xs font-bold px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-white transition-colors">
            🔍 ค้นหาหุ้น
          </Link>
        </div>
        <p className="text-[10px] text-slate-400">พอร์ตจำลอง · เงินจำลองเท่านั้น ไม่ใช่เงินจริง</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm overflow-hidden">
      {/* Hero row */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
              มูลค่าพอร์ต (จำลอง)
            </p>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl font-black font-mono text-[#1F1A14]">{thb(totalValueThb)}</span>
              <span className="text-base font-bold font-mono" style={{ color: clr(change1DThb) }}>
                {change1DThb >= 0 ? "+" : ""}{thb(change1DThb)}{" "}
                <span className="text-sm">({pctFmt(change1DPct)} วันนี้)</span>
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 mb-0.5">กำไร/ขาดทุน รวม</p>
            <p className="text-base font-bold font-mono" style={{ color: clr(unrealizedPnlThb) }}>
              {unrealizedPnlThb >= 0 ? "+" : ""}{thb(unrealizedPnlThb)}
            </p>
            <p className="text-xs font-semibold" style={{ color: clr(unrealizedPnlPct) }}>
              {pctFmt(unrealizedPnlPct)} vs ต้นทุน
            </p>
          </div>
        </div>

        {/* vs starting capital */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-slate-500">vs ทุนเริ่มต้น ฿1.25M:</span>
          <span className={`text-xs font-bold ${clrCls(pnlVsStart)}`}>
            {pnlVsStart >= 0 ? "+" : ""}{thb(pnlVsStart)} ({pctFmt(pnlVsStartPct)})
          </span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Sector allocation bar */}
        {sectors.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
              Sector Allocation
            </p>
            <div className="flex h-4 rounded-full overflow-hidden gap-px">
              {sectors.map(s => (
                <div
                  key={s.sector}
                  className="h-full transition-all"
                  style={{ width: `${s.pct}%`, backgroundColor: sectorColor(s.sector), minWidth: s.pct > 0.5 ? "4px" : "0" }}
                  title={`${s.sector}: ${s.pct.toFixed(1)}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
              {sectors.slice(0, 6).map(s => (
                <div key={s.sector} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: sectorColor(s.sector) }} />
                  <span className="text-[10px] text-slate-600">{s.sector} {s.pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Concentration flag */}
        {concentration.length > 0 && (
          <div className={`rounded-xl px-3 py-2 text-xs leading-snug ${
            concentration.some(c => c.level === "high")
              ? "bg-amber-50 border border-amber-200 text-amber-700"
              : "bg-[#F8F5EF] border border-[#E0D9CC] text-[#5A4E42]"
          }`}>
            <span className="font-semibold">สังเกต: </span>
            {concentration.map(c => c.text).join(" · ")}
            {" "}— ข้อมูลนี้เพื่อการสังเกตเท่านั้น ไม่ใช่คำแนะนำการลงทุน
          </div>
        )}

        {/* Top holdings */}
        {!compact && topHoldings.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A8378] mb-1.5">
              ถือมากสุด
            </p>
            <div className="grid grid-cols-3 gap-2">
              {topHoldings.map(h => (
                <Link key={h.ticker} href={`/stock/${h.ticker}`}
                  className="rounded-xl bg-white/60 border border-white/40 px-3 py-2.5 hover:border-violet-300 hover:bg-white/80 transition-colors">
                  <p className="text-xs font-bold font-mono text-violet-700">{h.ticker}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{h.weight.toFixed(1)}% ของพอร์ต</p>
                  <p className={`text-xs font-bold mt-0.5 ${clrCls(h.change1D)}`}>{pctFmt(h.change1D)} วันนี้</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Best / worst today */}
        {best && worst && best.ticker !== worst.ticker && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-emerald-50/60 border border-emerald-200 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-0.5">▲ ดีสุดวันนี้</p>
              <Link href={`/stock/${best.ticker}`} className="block">
                <p className="text-xs font-bold font-mono text-slate-900 hover:text-violet-700 transition-colors">{best.ticker}</p>
                <p className="text-xs font-bold text-emerald-600">{pctFmt(best.change1D)}</p>
              </Link>
            </div>
            <div className="rounded-xl bg-red-50/60 border border-red-200 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mb-0.5">▼ แย่สุดวันนี้</p>
              <Link href={`/stock/${worst.ticker}`} className="block">
                <p className="text-xs font-bold font-mono text-slate-900 hover:text-violet-700 transition-colors">{worst.ticker}</p>
                <p className="text-xs font-bold text-red-500">{pctFmt(worst.change1D)}</p>
              </Link>
            </div>
          </div>
        )}

        {/* Performance chart vs S&P */}
        {!compact && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
              Performance (% return from first trade)
            </p>
            <PerformanceChart snapshots={snapshots} />
          </div>
        )}

        {/* Links */}
        <div className="flex items-center justify-between pt-1">
          <Link href="/assets" className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
            ดูพอร์ตเต็ม →
          </Link>
          <p className="text-[10px] text-slate-400">
            ข้อมูล ณ {new Date(asOf).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} · 1 USD = {fxRate.toFixed(2)} THB · พอร์ตจำลอง
          </p>
        </div>
      </div>
    </div>
  );
}
