"use client";

import { useEffect, useState } from "react";
import type { AssetsPayload, EnrichedHolding } from "@/app/api/portfolio/assets/route";
import type { PortfolioAnalysis } from "@/app/api/portfolio/ai-analysis/route";

const CHART_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#06B6D4", "#F97316", "#84CC16", "#EC4899", "#14B8A6",
] as const;

interface Snapshot { valueThb: number; createdAt: string; }

interface PortfolioAnalyticsProps {
  data: AssetsPayload;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function donutArc(cx: number, cy: number, R: number, r: number, a1: number, a2: number): string {
  const os = polarToCartesian(cx, cy, R, a1);
  const oe = polarToCartesian(cx, cy, R, a2);
  const is = polarToCartesian(cx, cy, r, a1);
  const ie = polarToCartesian(cx, cy, r, a2);
  const lg = a2 - a1 > Math.PI ? 1 : 0;
  return `M ${os.x} ${os.y} A ${R} ${R} 0 ${lg} 1 ${oe.x} ${oe.y} L ${ie.x} ${ie.y} A ${r} ${r} 0 ${lg} 0 ${is.x} ${is.y} Z`;
}

function DonutChart({ holdings }: { holdings: EnrichedHolding[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const top10 = [...holdings]
    .sort((a, b) => b.holdingValueUsd - a.holdingValueUsd)
    .slice(0, 10);
  const top10Total = top10.reduce((s, h) => s + h.holdingValueUsd, 0);
  const portfolioTotal = holdings.reduce((s, h) => s + h.holdingValueUsd, 0);
  const otherValue = portfolioTotal - top10Total;

  const slices = [
    ...top10.map((h, i) => ({ label: h.ticker, value: h.holdingValueUsd, color: CHART_COLORS[i % CHART_COLORS.length] })),
    ...(otherValue > 0 ? [{ label: "อื่นๆ", value: otherValue, color: "#94A3B8" }] : []),
  ];

  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total <= 0) return null;

  let angle = -Math.PI / 2;
  const CX = 80, CY = 80, R = 72, r = 46;

  const arcs = slices.map((sl) => {
    const sweep = (sl.value / total) * 2 * Math.PI;
    const gapAdj = sweep > 0.05 ? 0.02 : 0;
    const path = donutArc(CX, CY, R, r, angle + gapAdj / 2, angle + sweep - gapAdj / 2);
    angle += sweep;
    return { ...sl, path, pct: (sl.value / total) * 100 };
  });

  const hoveredSlice = arcs.find((a) => a.label === hovered);

  return (
    <div className="flex gap-4 items-start">
      <div className="relative flex-shrink-0">
        <svg width="160" height="160" viewBox="0 0 160 160" aria-label="กราฟวงกลมสัดส่วนพอร์ต">
          {arcs.map((arc) => (
            <path
              key={arc.label}
              d={arc.path}
              fill={arc.color}
              opacity={hovered && hovered !== arc.label ? 0.4 : 1}
              className="transition-opacity cursor-pointer"
              onMouseEnter={() => setHovered(arc.label)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          <text x="80" y="76" textAnchor="middle" className="text-xs fill-slate-600" fontSize="10">
            {hoveredSlice ? hoveredSlice.label : "พอร์ต"}
          </text>
          <text x="80" y="90" textAnchor="middle" className="font-bold fill-slate-900" fontSize="13">
            {hoveredSlice ? `${hoveredSlice.pct.toFixed(1)}%` : `${holdings.length} หุ้น`}
          </text>
        </svg>
      </div>

      <ul className="flex-1 space-y-1.5 pt-1 min-w-0">
        {arcs.slice(0, 8).map((arc) => (
          <li key={arc.label} className="flex items-center gap-2 text-xs min-w-0">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: arc.color }} />
            <span className="truncate text-slate-700 flex-1">{arc.label}</span>
            <span className="font-mono text-slate-500 flex-shrink-0">{arc.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PerformanceChart({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-slate-400">
        กำลังสะสมข้อมูลประวัติ — จะแสดงกราฟเมื่อมีการเทรดมากพอ
      </div>
    );
  }

  const W = 400, H = 100, PX = 4, PY = 8;
  const values  = snapshots.map((s) => s.valueThb);
  const minV    = Math.min(...values);
  const maxV    = Math.max(...values);
  const range   = maxV - minV || 1;
  const last    = values[values.length - 1];
  const first   = values[0];
  const isUp    = last >= first;
  const color   = isUp ? "#10B981" : "#EF4444";
  const fillId  = `perf-fill-${isUp ? "up" : "down"}`;

  const pts = snapshots.map((s, i) => {
    const x = PX + (i / (snapshots.length - 1)) * (W - 2 * PX);
    const y = PY + (1 - (s.valueThb - minV) / range) * (H - 2 * PY);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polyline = pts.join(" ");
  const lastPt   = pts[pts.length - 1].split(",");
  const fillPath = `M ${pts[0].split(",")[0]},${H} L ${pts.join(" L ")} L ${lastPt[0]},${H} Z`;

  const pct = ((last - first) / first) * 100;

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-sm font-semibold ${isUp ? "text-emerald-500" : "text-red-500"}`}>
          {isUp ? "+" : ""}{pct.toFixed(2)}%
        </span>
        <span className="text-xs text-slate-400">
          ตั้งแต่เริ่มต้น ({snapshots.length} จุดข้อมูล)
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none" aria-label="กราฟประสิทธิภาพพอร์ต">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#${fillId})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function MartinReviewCard({ holdingCount }: { holdingCount: number }) {
  const [data,    setData]    = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  async function load(refresh = false) {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/portfolio/ai-analysis${refresh ? "?refresh=true" : ""}`);
      const json = (await res.json()) as PortfolioAnalysis & { error?: string };
      if (!json.error) setData(json);
    } catch { /* ignore */ } finally {
      setLoading(false);
      setDone(true);
    }
  }

  const score = data?.healthScore ?? 0;
  const scoreColor = score >= 70 ? "#16A34A" : score >= 40 ? "#D97706" : "#DC2626";
  const scoreLabel = score >= 70 ? "แข็งแกร่ง" : score >= 40 ? "ปานกลาง" : "ต้องปรับ";

  return (
    <div className="bg-white rounded-2xl border border-[#ccd5ae] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-violet-500/40 flex items-center justify-center">
            <span className="text-violet-400 text-xs">✦</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white">Martin · วิเคราะห์พอร์ต</p>
            <p className="text-xs text-slate-400">AI ตรวจสุขภาพพอร์ตทั้งหมด · ไม่ใช่คำแนะนำลงทุน</p>
          </div>
        </div>
        {done && (
          <button
            onClick={() => void load(true)}
            className="text-xs text-slate-400 hover:text-white transition-colors"
            aria-label="รีเฟรชการวิเคราะห์"
          >
            ↺
          </button>
        )}
      </div>

      <div className="p-4">
        {!done && !loading && (
          holdingCount === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">ซื้อหุ้นแรกก่อนเพื่อให้ Martin วิเคราะห์</p>
          ) : (
            <button
              onClick={() => void load()}
              className="w-full py-2.5 text-xs font-bold text-violet-700 border border-violet-200 rounded-xl bg-violet-50 hover:bg-violet-100 transition-colors"
            >
              ✦ ให้ Martin วิเคราะห์พอร์ต {holdingCount} หุ้น
            </button>
          )
        )}

        {loading && (
          <div className="flex flex-col gap-2 py-2">
            {[80, 60, 70].map(w => (
              <div key={w} className="h-2 bg-[#e9edc9] animate-pulse rounded" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {data && !loading && (
          <div className="flex flex-col gap-3">
            {/* Health score */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: scoreColor }}
              >
                {score}
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: scoreColor }}>{scoreLabel}</p>
                <p className="text-xs text-slate-700 leading-snug">{data.headline}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{data.summary}</p>

            {data.highlights.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">จุดเด่น</p>
                {data.highlights.map((h, i) => (
                  <div key={i} className="flex gap-1.5 text-xs text-slate-700 mb-0.5">
                    <span className="text-emerald-500 flex-shrink-0">✓</span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            )}

            {data.risks.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">ความเสี่ยง</p>
                {data.risks.map((r, i) => (
                  <div key={i} className="flex gap-1.5 text-xs text-slate-700 mb-0.5">
                    <span className="text-red-500 flex-shrink-0">!</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[9px] text-slate-400 border-t border-[#e9edc9] pt-2">
              📊 ข้อมูล: Finnhub (ราคาปัจจุบัน) · เพื่อการศึกษาเท่านั้น
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#e9edc9] rounded-xl p-3">
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className="font-semibold text-slate-900 text-sm">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export function PortfolioAnalytics({ data }: PortfolioAnalyticsProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [donutMode, setDonutMode] = useState<"stock" | "sector">("stock");

  useEffect(() => {
    fetch("/api/portfolio/history")
      .then((r) => r.json())
      .then((d: { snapshots?: Snapshot[] }) => { if (d.snapshots) setSnapshots(d.snapshots); })
      .catch(() => {});
  }, []);

  const { holdings, totalValueThb, totalCostUsd, unrealizedPnlUsd, unrealizedPnlPct, fxRate } = data;

  const best = holdings.length > 0
    ? holdings.reduce((a, b) => (a.unrealizedPnlPct > b.unrealizedPnlPct ? a : b))
    : null;
  const worst = holdings.length > 0
    ? holdings.reduce((a, b) => (a.unrealizedPnlPct < b.unrealizedPnlPct ? a : b))
    : null;

  const sectorSlices = (() => {
    const map = new Map<string, number>();
    for (const h of holdings) {
      const key = h.sector || "ไม่ระบุ";
      map.set(key, (map.get(key) ?? 0) + h.holdingValueUsd);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  })();

  const displayHoldings: EnrichedHolding[] = donutMode === "sector"
    ? sectorSlices.map((sl) => ({
        ticker: sl.label, shares: 0, avgCost: 0, totalCostUsd: 0,
        currentPrice: 0, prevClose: 0, change1D: 0,
        holdingValueUsd: sl.value, holdingValueThb: sl.value * fxRate,
        unrealizedPnlUsd: 0, unrealizedPnlThb: 0, unrealizedPnlPct: 0,
        weight: 0, companyName: sl.label, logoUrl: null, sector: null,
      }))
    : holdings;

  const thb = (v: number) => `฿${Math.abs(v).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* Martin AI portfolio review */}
      <MartinReviewCard holdingCount={holdings.length} />

      {/* Allocation donut */}
      <div className="bg-white rounded-2xl border border-[#ccd5ae] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-sm">สัดส่วนการลงทุน</h3>
          <div className="flex gap-1 bg-[#e9edc9] rounded-lg p-0.5 text-xs">
            {(["stock", "sector"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setDonutMode(m)}
                className={`px-2.5 py-1 rounded-md transition-colors ${donutMode === m ? "bg-white shadow-sm font-medium text-slate-800" : "text-slate-500"}`}
              >
                {m === "stock" ? "หุ้น" : "Sector"}
              </button>
            ))}
          </div>
        </div>
        {displayHoldings.length > 0
          ? <DonutChart holdings={displayHoldings} />
          : <p className="text-sm text-slate-400 text-center py-6">ยังไม่มีหุ้น</p>
        }
      </div>

      {/* Performance chart */}
      <div className="bg-white rounded-2xl border border-[#ccd5ae] p-4">
        <h3 className="font-semibold text-slate-800 text-sm mb-3">ประสิทธิภาพพอร์ต</h3>
        <PerformanceChart snapshots={snapshots} />
      </div>

      {/* Stats */}
      <div className="bg-white rounded-2xl border border-[#ccd5ae] p-4">
        <h3 className="font-semibold text-slate-800 text-sm mb-3">สถิติ</h3>
        <div className="grid grid-cols-2 gap-2">
          <StatRow
            label="มูลค่ารวมทั้งหมด"
            value={thb(totalValueThb)}
          />
          <StatRow
            label="ต้นทุนรวม (USD)"
            value={`$${totalCostUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            sub={thb(totalCostUsd * fxRate)}
          />
          <StatRow
            label="กำไร/ขาดทุนสะสม"
            value={`${unrealizedPnlUsd >= 0 ? "+" : ""}$${unrealizedPnlUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            sub={`${unrealizedPnlPct >= 0 ? "+" : ""}${unrealizedPnlPct.toFixed(2)}%`}
          />
          <StatRow
            label="จำนวนหุ้น"
            value={`${holdings.length} ตัว`}
          />
          {best && (
            <StatRow
              label="ดีที่สุด"
              value={best.ticker}
              sub={`+${best.unrealizedPnlPct.toFixed(2)}%`}
            />
          )}
          {worst && (
            <StatRow
              label="แย่ที่สุด"
              value={worst.ticker}
              sub={`${worst.unrealizedPnlPct.toFixed(2)}%`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
