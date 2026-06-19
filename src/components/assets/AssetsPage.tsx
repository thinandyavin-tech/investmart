"use client";

import { useCallback, useEffect, useState } from "react";
import { Link }             from "@/i18n/navigation";
import { useUser }          from "@/lib/userContext";
import { useI18n }          from "@/lib/i18n";
import { BuySellModal }     from "@/components/assets/BuySellModal";
import { PortfolioAnalytics } from "@/components/assets/PortfolioAnalytics";
import { ThesisCapture }    from "@/components/journal/ThesisCapture";
import { StockLogo }        from "@/components/StockLogo";
import { InfoTooltip }      from "@/components/InfoTooltip";
import type { AssetsPayload, EnrichedHolding } from "@/app/api/portfolio/assets/route";

type SortKey = "value" | "pnl" | "change1d" | "weight" | "name";
type Tab      = "holdings" | "analytics";

const thb  = (v: number) => `฿${Math.abs(v).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
const usd  = (v: number) => `$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pctFmt = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const clr  = (v: number) => v >= 0 ? "text-emerald-600" : "text-red-500";

// ─── Sparkline ────────────────────────────────────────────────────────────────

const SPARK_W = 60;
const SPARK_H = 24;
const SPARK_POINTS = 7;

// Synthesize 7 directionally-correct points from a single change1D value.
// Start at 100, end at 100 + change1D, interpolated with a slight curve.
function buildSparkPoints(change1D: number): readonly number[] {
  const end = 100 + change1D;
  return Array.from({ length: SPARK_POINTS }, (_, i) => {
    const t = i / (SPARK_POINTS - 1);
    return 100 + (end - 100) * t;
  });
}

function toPolylinePoints(values: readonly number[]): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // avoid div-by-zero for flat lines
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * SPARK_W;
      // Invert y so higher value = higher on canvas
      const y = SPARK_H - ((v - min) / range) * SPARK_H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function Sparkline({ change1D }: { change1D: number }) {
  const points = buildSparkPoints(change1D);
  const polyPoints = toPolylinePoints(points);
  const color = change1D >= 0 ? "#1F9D55" : "#D64545";

  return (
    <svg
      width={SPARK_W}
      height={SPARK_H}
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <polyline
        points={polyPoints}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// TickerLogo → delegated to StockLogo (three-tier: provided URL → Parqet → avatar)
function TickerLogo({ ticker, logoUrl, size = 32 }: { ticker: string; logoUrl: string | null; size?: number }) {
  return <StockLogo ticker={ticker} logoUrl={logoUrl} size={size} radius={6} />;
}

function HoldingRow({ h, fxRate, onTrade }: { h: EnrichedHolding; fxRate: number; onTrade: (t: string, s: "BUY" | "SELL") => void }) {
  const { t: i18nT, lang } = useI18n();
  const ac = i18nT.assets;
  const [open, setOpen] = useState(false);

  const pnlBadgeCls = h.unrealizedPnlUsd >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600";

  return (
    <div className="border-b border-[#ccd5ae] last:border-0">
      {/* ── Collapsed row ── */}
      <button
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#faedcd] transition-colors text-left min-h-[56px]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${h.companyName} ${open ? ac.row.hideDetail : ac.row.showDetail}`}
      >
        <TickerLogo ticker={h.ticker} logoUrl={h.logoUrl} size={32} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs font-mono text-slate-900">{h.ticker}</span>
            <span className={`text-[10px] font-semibold px-1 py-0.5 rounded ${pnlBadgeCls}`}>
              {pctFmt(h.unrealizedPnlPct)}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            {h.companyName}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs font-bold font-mono text-slate-900">{thb(h.holdingValueThb)}</div>
          <div className={`text-[10px] font-semibold ${clr(h.change1D)}`}>{pctFmt(h.change1D)}</div>
        </div>
        <span className={`text-slate-400 text-[10px] ml-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {/* ── Expanded detail (animated) ── */}
      <div
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
        style={{ maxHeight: open ? 320 : 0, opacity: open ? 1 : 0 }}
      >
        <div className="px-3 pb-3 pt-1 bg-[#e9edc9] space-y-2.5">
          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4">
            {([
              [lang === "en" ? "Price" : "ราคา",      usd(h.currentPrice), "underlying-price"],
              [lang === "en" ? "Avg Cost" : "ต้นทุน",  usd(h.avgCost),      "avg-cost"],
              [lang === "en" ? "Total Cost" : "รวม",   usd(h.totalCostUsd), "total-cost"],
              [lang === "en" ? "Shares" : "หุ้น",      h.shares.toLocaleString("en-US", { maximumFractionDigits: 4 }), null],
              [lang === "en" ? "Value" : "มูลค่า",     `${usd(h.holdingValueUsd)}`, "holding-value"],
              [lang === "en" ? "P/L" : "กำไร/ขาดทุน",  `${h.unrealizedPnlUsd >= 0 ? "+" : ""}${usd(h.unrealizedPnlUsd)}`, "unrealized-pnl"],
              [lang === "en" ? "Weight" : "สัดส่วน",    `${h.weight.toFixed(1)}%`, null],
              [lang === "en" ? "1D Change" : "วันนี้",  pctFmt(h.change1D), "change-1d"],
            ] as [string, string, string | null][]).map(([label, val, termId]) => (
              <div key={label} className="bg-[#faedcd] rounded-lg p-2 border border-[#ccd5ae]">
                <div className="flex items-center gap-0.5 text-slate-500 text-[9px] uppercase tracking-wide mb-0.5">
                  {label}
                  {termId && <InfoTooltip termId={termId} size={11} />}
                </div>
                <div className="font-mono font-bold text-slate-800 text-[11px]">{val}</div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button onClick={() => onTrade(h.ticker, "BUY")}
              className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors shadow-sm">
              {lang === "en" ? "Buy More" : "ซื้อเพิ่ม"}
            </button>
            <Link href={`/stock/${h.ticker}`}
              className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors text-center shadow-sm">
              {lang === "en" ? "Chart" : "ดูกราฟ"}
            </Link>
            <button onClick={() => onTrade(h.ticker, "SELL")}
              className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors shadow-sm">
              {lang === "en" ? "Sell" : "ขาย"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopTable({ holdings, cashUsd, onTrade }: { holdings: EnrichedHolding[]; cashUsd: number; onTrade: (t: string, s: "BUY" | "SELL") => void }) {
  const { t: i18nT } = useI18n();
  const ac = i18nT.assets;
  const SORT_LABELS: Record<SortKey, string> = {
    value: ac.col.value, pnl: ac.col.pnl, change1d: ac.col.change1d,
    weight: ac.col.weight, name: ac.col.name,
  };
  const [sortBy, setSortBy]   = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortBy(key); setSortDir(-1); }
  }

  const sorted = [...holdings].sort((a, b) => {
    const map: Record<SortKey, number> = {
      value: a.holdingValueUsd - b.holdingValueUsd,
      pnl:   a.unrealizedPnlPct - b.unrealizedPnlPct,
      change1d: a.change1D - b.change1D,
      weight:   a.weight - b.weight,
      name:     a.ticker.localeCompare(b.ticker),
    };
    return map[sortBy] * sortDir;
  });

  const th = (key: SortKey, label: string, align = "text-right") => (
    <th className={`px-3 py-2 ${align} text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap`}
      onClick={() => toggleSort(key)}>
      {label}{sortBy === key ? (sortDir === -1 ? " ▾" : " ▴") : ""}
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#ccd5ae]">
      <table className="w-full text-sm">
        <thead className="bg-[#e9edc9]">
          <tr>
            {th("name",     ac.col.name,     "text-left")}
            {th("weight",   ac.col.weight)}
            <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">{ac.shares}</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">
              <span className="inline-flex items-center gap-1">{ac.avgCost} <InfoTooltip termId="avg-cost" size={11} /></span>
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">
              <span className="inline-flex items-center gap-1">{ac.row.totalCost} <InfoTooltip termId="total-cost" size={11} /></span>
            </th>
            {th("change1d", ac.col.change1d)}
            {th("value",    ac.col.value)}
            <th className="px-3 py-2 text-right text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap" onClick={() => toggleSort("pnl")}>
              <span className="inline-flex items-center gap-1">
                {ac.col.pnl}{sortBy === "pnl" ? (sortDir === -1 ? " ▾" : " ▴") : ""} <InfoTooltip termId="unrealized-pnl" size={11} />
              </span>
            </th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {sorted.map((h) => (
            <tr key={h.ticker} className="hover:bg-[#e9edc9] transition-colors">
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <TickerLogo ticker={h.ticker} logoUrl={h.logoUrl} size={28} />
                  <div>
                    <div className="font-semibold text-slate-900">{h.ticker}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[120px]">{h.companyName}</div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5 text-right text-slate-500">{h.weight.toFixed(1)}%</td>
              <td className="px-3 py-2.5 text-right font-mono text-slate-700">{h.shares.toLocaleString("en-US", { maximumFractionDigits: 4 })}</td>
              <td className="px-3 py-2.5 text-right font-mono text-slate-600">{usd(h.avgCost)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-slate-600">{usd(h.totalCostUsd)}</td>
              <td className="px-3 py-2.5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Sparkline change1D={h.change1D} />
                  <div>
                    <div className="font-mono text-slate-800">{usd(h.currentPrice)}</div>
                    <div className={`text-xs ${clr(h.change1D)}`}>{pctFmt(h.change1D)}</div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5 text-right">
                <div className="font-semibold text-slate-800">{thb(h.holdingValueThb)}</div>
                <div className="text-xs text-slate-400">{usd(h.holdingValueUsd)}</div>
              </td>
              <td className="px-3 py-2.5 text-right">
                <div className={`font-semibold ${clr(h.unrealizedPnlUsd)}`}>
                  {h.unrealizedPnlUsd >= 0 ? "+" : "-"}{usd(h.unrealizedPnlUsd)}
                </div>
                <div className={`text-xs ${clr(h.unrealizedPnlPct)}`}>{pctFmt(h.unrealizedPnlPct)}</div>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex gap-1">
                  <button onClick={() => onTrade(h.ticker, "BUY")}
                    className="px-2 py-1 text-xs rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium transition-colors">
                    ซื้อ
                  </button>
                  <button onClick={() => onTrade(h.ticker, "SELL")}
                    className="px-2 py-1 text-xs rounded-md bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-colors">
                    ขาย
                  </button>
                </div>
              </td>
            </tr>
          ))}
          <tr className="bg-[#e9edc9]">
            <td className="px-3 py-2.5 text-sm text-slate-500 font-medium" colSpan={6}>เงินสด USD</td>
            <td className="px-3 py-2.5 text-right font-semibold text-slate-700" colSpan={3}>
              {usd(cashUsd)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function AssetsPage() {
  const { user, loading: authLoading } = useUser();
  const { t, format } = useI18n();
  const ac = t.assets;
  const SORT_LABELS: Record<SortKey, string> = {
    value: ac.col.value, pnl: ac.col.pnl, change1d: ac.col.change1d,
    weight: ac.col.weight, name: ac.col.name,
  };
  const [data,     setData]     = useState<AssetsPayload | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [sortBy,   setSortBy]   = useState<SortKey>("value");
  const [sortDir,  setSortDir]  = useState<1 | -1>(-1);
  const [tab,      setTab]      = useState<Tab>("holdings");
  const [buySell,  setBuySell]  = useState<{ ticker: string; side: "BUY" | "SELL" } | null>(null);
  const [thesis,   setThesis]   = useState<{ tradeId: string; ticker: string; side: "BUY" | "SELL"; shares: number; price: number } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch("/api/portfolio/assets");
      if (!res.ok) { setError(ac.loadError); return; }
      const json = await res.json() as AssetsPayload;
      setData(json);
      setError(null);
    } catch { setError(ac.networkError); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!user) return;
    void fetchData();
    const id = setInterval(() => void fetchData(), 60_000);
    return () => clearInterval(id);
  }, [user, fetchData]);

  function openTrade(ticker: string, side: "BUY" | "SELL") { setBuySell({ ticker, side }); }
  function closeTrade() { setBuySell(null); }
  function afterTrade(tradeId: string, shares: number, price: number) {
    const info = buySell;
    setBuySell(null);
    void fetchData();
    if (tradeId && info) setThesis({ tradeId, ticker: info.ticker, side: info.side, shares, price });
  }

  if (authLoading) {
    return (
      <main className="px-4 pt-6 space-y-4 animate-pulse max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-[#faedcd] rounded-xl" />
        <div className="h-16 w-64 bg-[#faedcd] rounded-2xl" />
        <div className="flex gap-4">
          <div className="h-10 flex-1 bg-[#faedcd] rounded-xl" />
          <div className="h-10 flex-1 bg-[#faedcd] rounded-xl" />
        </div>
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#faedcd] rounded-xl" />)}
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#faedcd] border border-[#ccd5ae] flex items-center justify-center text-3xl">📊</div>
        <div>
          <p className="text-lg font-bold text-slate-800 mb-1">ดูพอร์ตหุ้นของคุณ</p>
          <p className="text-sm text-slate-500">เข้าสู่ระบบเพื่อซื้อขายหุ้น และติดตามพอร์ตแบบ real-time</p>
        </div>
        <div className="flex gap-3">
          <Link href="/signup" className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition-colors">
            สมัครฟรี
          </Link>
          <Link href="/signin" className="px-6 py-2.5 bg-[#faedcd] border border-[#ccd5ae] text-slate-700 rounded-xl font-semibold text-sm hover:bg-[#fefae0] transition-colors">
            เข้าสู่ระบบ
          </Link>
        </div>
        <p className="text-xs text-slate-400">เริ่มต้นด้วยเงินเสมือน ฿1,250,000 — ไม่ใช้เงินจริง</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="px-4 pt-4 space-y-3 animate-pulse max-w-5xl mx-auto">
        <div className="h-6 w-40 bg-[#faedcd] rounded-lg" />
        <div className="h-14 w-56 bg-[#faedcd] rounded-2xl" />
        <div className="flex gap-3">
          <div className="h-12 flex-1 bg-[#faedcd] rounded-xl" />
          <div className="h-12 flex-1 bg-[#faedcd] rounded-xl" />
        </div>
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#faedcd] rounded-xl" />)}
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
        <div className="text-4xl">⚠️</div>
        <p className="text-slate-700 font-semibold">{error ?? ac.notFound}</p>
        <button onClick={() => { setLoading(true); void fetchData(); }}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors">
          ลองใหม่
        </button>
      </main>
    );
  }

  const { holdings, cashUsd, cashThb, fxRate, totalValueThb, change1DThb, change1DPct, unrealizedPnlThb, unrealizedPnlPct, asOf } = data;

  const sorted = [...holdings].sort((a, b) => {
    const map: Record<SortKey, number> = {
      value:    a.holdingValueUsd - b.holdingValueUsd,
      pnl:      a.unrealizedPnlPct - b.unrealizedPnlPct,
      change1d: a.change1D - b.change1D,
      weight:   a.weight - b.weight,
      name:     a.ticker.localeCompare(b.ticker),
    };
    return map[sortBy] * sortDir;
  });

  const asOfTime = new Date(asOf).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

  return (
    <main className="min-h-screen pb-24 lg:pb-8">
      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4 bg-[#faedcd] border-b border-[#ccd5ae]">
        <div className="max-w-5xl mx-auto">
          {/* Label row */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">มูลค่าพอร์ตทั้งหมด</span>
            <InfoTooltip termId="total-asset-value" size={13} />
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 font-semibold">เงินเสมือน</span>
            <span className="text-xs text-slate-400 ml-auto">อัพเดต {asOfTime}</span>
          </div>

          {/* Hero value */}
          <p className="text-4xl font-bold font-mono text-slate-900 tracking-tight mb-3">
            {thb(totalValueThb)}
          </p>

          {/* P&L stats */}
          <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-6">
            <div className="bg-[#faedcd] rounded-xl px-3 py-2.5 border border-[#ccd5ae]">
              <p className="text-xs text-slate-500 mb-0.5">วันนี้</p>
              <p className={`text-base font-bold font-mono ${clr(change1DThb)}`}>
                {change1DThb >= 0 ? "+" : ""}{thb(change1DThb)}
              </p>
              <p className={`text-xs ${clr(change1DPct)}`}>{pctFmt(change1DPct)}</p>
            </div>
            <div className="bg-[#faedcd] rounded-xl px-3 py-2.5 border border-[#ccd5ae]">
              <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">กำไร/ขาดทุนรวม <InfoTooltip termId="unrealized-pnl" size={12} /></p>
              <p className={`text-base font-bold font-mono ${clr(unrealizedPnlThb)}`}>
                {unrealizedPnlThb >= 0 ? "+" : ""}{thb(unrealizedPnlThb)}
              </p>
              <p className={`text-xs ${clr(unrealizedPnlPct)}`}>{pctFmt(unrealizedPnlPct)}</p>
            </div>
            <div className="sm:flex-none bg-[#faedcd] rounded-xl px-3 py-2.5 border border-[#ccd5ae] col-span-2 sm:col-span-1">
              <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">อัตราแลกเปลี่ยน <InfoTooltip termId="exchange-rate" size={12} /></p>
              <p className="text-sm font-semibold font-mono text-slate-700">1 USD = {fxRate.toFixed(2)} THB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex gap-1 bg-[#e9edc9] rounded-xl p-1 w-fit mb-4">
          {(["holdings", "analytics"] as Tab[]).map((tabKey) => (
            <button key={tabKey} onClick={() => setTab(tabKey)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === tabKey ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
              {tabKey === "holdings" ? ac.tabs.holdings : ac.tabs.analysis}
            </button>
          ))}
        </div>

        {tab === "analytics" && <PortfolioAnalytics data={data} />}

        {tab === "holdings" && (
          <>
            {/* Mobile */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">{holdings.length} หุ้น</span>
                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    aria-label={ac.row.sortAria}
                    className="text-xs px-2 py-1 rounded-lg border border-[#ccd5ae] bg-white text-slate-700">
                    {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setSortDir((d) => (d === 1 ? -1 : 1))}
                    aria-label={sortDir === -1 ? ac.row.sortDirAsc : ac.row.sortDirDesc}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#ccd5ae] text-slate-500 hover:bg-[#e9edc9] transition-colors">
                    {sortDir === -1 ? "↓" : "↑"}
                  </button>
                </div>
              </div>

              <div className="flex text-xs text-slate-400 px-4 pb-1 gap-2">
                <span className="flex-1">ชื่อหุ้น</span>
                <span className="w-24 text-right">มูลค่า</span>
                <span className="w-20 text-right">P/L</span>
                <span className="w-4" />
              </div>

              <div className="bg-[#faedcd] rounded-2xl border border-[#ccd5ae] overflow-hidden">
                {sorted.length === 0 && (
                  <div className="text-center py-14 px-6">
                    <div className="text-4xl mb-3">📈</div>
                    <p className="text-base font-semibold text-slate-700 mb-1">ยังไม่มีหุ้นในพอร์ต</p>
                    <p className="text-sm text-slate-500 mb-4">เริ่มซื้อหุ้นแรกด้วยเงินเสมือน ฿1,250,000</p>
                    <Link href="/radar" className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors">
                      📡 ค้นหาหุ้นด้วย Radar
                    </Link>
                  </div>
                )}
                {sorted.map((h) => (
                  <HoldingRow key={h.ticker} h={h} fxRate={fxRate} onTrade={openTrade} />
                ))}
                {/* Cash rows */}
                {cashUsd > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[#ccd5ae] bg-[#e9edc9]/50">
                    <div className="w-8 h-8 rounded-md bg-green-100 flex items-center justify-center text-sm flex-shrink-0">💵</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-700">เงินสด USD</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-slate-700">{usd(cashUsd)}</div>
                    </div>
                  </div>
                )}
                {cashThb > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[#ccd5ae] bg-[#e9edc9]/50">
                    <div className="w-8 h-8 rounded-md bg-yellow-100 flex items-center justify-center text-sm flex-shrink-0">🇹🇭</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-700">เงินสด THB</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-slate-700">{thb(cashThb)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden lg:block">
              <DesktopTable holdings={sorted} cashUsd={cashUsd} onTrade={openTrade} />
            </div>
          </>
        )}
      </div>

      {buySell && data && (
        <BuySellModal
          ticker={buySell.ticker}
          side={buySell.side}
          currentPrice={data.holdings.find((h) => h.ticker === buySell.ticker)?.currentPrice ?? 0}
          availableUsd={data.cashUsd}
          availableShares={data.holdings.find((h) => h.ticker === buySell.ticker)?.shares ?? 0}
          fxRate={fxRate}
          onClose={closeTrade}
          onSuccess={afterTrade}
        />
      )}
      {thesis && (
        <ThesisCapture
          tradeId={thesis.tradeId}
          ticker={thesis.ticker}
          side={thesis.side}
          shares={thesis.shares}
          price={thesis.price}
          onClose={() => setThesis(null)}
        />
      )}
    </main>
  );
}
