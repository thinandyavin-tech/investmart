"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/userContext";
import { BuySellModal } from "@/components/assets/BuySellModal";
import { PortfolioAnalytics } from "@/components/assets/PortfolioAnalytics";
import type { AssetsPayload, EnrichedHolding } from "@/app/api/portfolio/assets/route";

type SortKey = "value" | "pnl" | "change1d" | "weight" | "name";
type Tab      = "holdings" | "analytics";

const SORT_LABELS: Record<SortKey, string> = {
  value: "มูลค่า", pnl: "P/L %", change1d: "1D %", weight: "น้ำหนัก", name: "ชื่อ",
};

const thb  = (v: number) => `฿${Math.abs(v).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
const usd  = (v: number) => `$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pctFmt = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const clr  = (v: number) => v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";

function TickerLogo({ ticker, logoUrl, size = 32 }: { ticker: string; logoUrl: string | null; size?: number }) {
  const [err, setErr] = useState(false);
  if (logoUrl && !err) {
    return (
      <img src={logoUrl} alt="" width={size} height={size}
        className="rounded-md object-contain bg-white flex-shrink-0"
        onError={() => setErr(true)} />
    );
  }
  return (
    <div aria-hidden="true"
      className="rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 flex-shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>
      {ticker[0]}
    </div>
  );
}

function HoldingRow({ h, fxRate, onTrade }: { h: EnrichedHolding; fxRate: number; onTrade: (t: string, s: "BUY" | "SELL") => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/20 last:border-0">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/30 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${h.companyName} ${open ? "ซ่อนรายละเอียด" : "แสดงรายละเอียด"}`}
      >
        <TickerLogo ticker={h.ticker} logoUrl={h.logoUrl} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm font-mono text-slate-900">{h.ticker}</span>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${h.unrealizedPnlUsd >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              {pctFmt(h.unrealizedPnlPct)}
            </span>
          </div>
          <div className="text-xs text-slate-500 truncate">{h.companyName} · {h.weight.toFixed(1)}% ของพอร์ต</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-bold font-mono text-slate-900">{thb(h.holdingValueThb)}</div>
          <div className={`text-xs font-semibold ${clr(h.change1D)}`}>{pctFmt(h.change1D)} วันนี้</div>
        </div>
        <span className={`text-slate-400 text-xs ml-1 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 bg-white/20 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            {[
              ["ถือหุ้น",      `${h.shares.toLocaleString("en-US", { maximumFractionDigits: 4 })} หุ้น`],
              ["ราคาปัจจุบัน",  usd(h.currentPrice)],
              ["ราคาเฉลี่ย",   usd(h.avgCost)],
              ["ต้นทุนรวม",    usd(h.totalCostUsd)],
            ].map(([label, val]) => (
              <div key={label as string} className="bg-white/60 backdrop-blur-sm rounded-xl p-2.5 border border-white/40">
                <div className="text-slate-500 text-[10px] uppercase tracking-wide mb-0.5">{label}</div>
                <div className="font-mono font-bold text-slate-800 text-xs">{val}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => onTrade(h.ticker, "BUY")}
              className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors shadow-sm">
              ซื้อเพิ่ม
            </button>
            <Link href={`/stock/${h.ticker}`}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors text-center shadow-sm">
              ดูกราฟ
            </Link>
            <button onClick={() => onTrade(h.ticker, "SELL")}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors shadow-sm">
              ขาย
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DesktopTable({ holdings, cashUsd, onTrade }: { holdings: EnrichedHolding[]; cashUsd: number; onTrade: (t: string, s: "BUY" | "SELL") => void }) {
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
    <th className={`px-3 py-2 ${align} text-xs font-medium text-slate-400 dark:text-slate-500 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none whitespace-nowrap`}
      onClick={() => toggleSort(key)}>
      {label}{sortBy === key ? (sortDir === -1 ? " ▾" : " ▴") : ""}
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/60">
          <tr>
            {th("name",     "หุ้น",       "text-left")}
            {th("weight",   "น้ำหนัก")}
            <th className="px-3 py-2 text-right text-xs font-medium text-slate-400 dark:text-slate-500">หุ้น</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-slate-400 dark:text-slate-500">ราคาเฉลี่ย</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-slate-400 dark:text-slate-500">ต้นทุนรวม</th>
            {th("change1d", "ราคา / 1D")}
            {th("value",    "มูลค่า THB")}
            {th("pnl",      "P/L")}
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {sorted.map((h) => (
            <tr key={h.ticker} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <TickerLogo ticker={h.ticker} logoUrl={h.logoUrl} size={28} />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{h.ticker}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[120px]">{h.companyName}</div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5 text-right text-slate-500 dark:text-slate-400">{h.weight.toFixed(1)}%</td>
              <td className="px-3 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">{h.shares.toLocaleString("en-US", { maximumFractionDigits: 4 })}</td>
              <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-400">{usd(h.avgCost)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-400">{usd(h.totalCostUsd)}</td>
              <td className="px-3 py-2.5 text-right">
                <div className="font-mono text-slate-800 dark:text-slate-200">{usd(h.currentPrice)}</div>
                <div className={`text-xs ${clr(h.change1D)}`}>{pctFmt(h.change1D)}</div>
              </td>
              <td className="px-3 py-2.5 text-right">
                <div className="font-semibold text-slate-800 dark:text-slate-200">{thb(h.holdingValueThb)}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{usd(h.holdingValueUsd)}</div>
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
                    className="px-2 py-1 text-xs rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-medium transition-colors">
                    ซื้อ
                  </button>
                  <button onClick={() => onTrade(h.ticker, "SELL")}
                    className="px-2 py-1 text-xs rounded-md bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-medium transition-colors">
                    ขาย
                  </button>
                </div>
              </td>
            </tr>
          ))}
          <tr className="bg-slate-50 dark:bg-slate-800/40">
            <td className="px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400 font-medium" colSpan={6}>เงินสด USD</td>
            <td className="px-3 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-300" colSpan={3}>
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
  const [data,     setData]     = useState<AssetsPayload | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [sortBy,   setSortBy]   = useState<SortKey>("value");
  const [sortDir,  setSortDir]  = useState<1 | -1>(-1);
  const [tab,      setTab]      = useState<Tab>("holdings");
  const [buySell,  setBuySell]  = useState<{ ticker: string; side: "BUY" | "SELL" } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch("/api/portfolio/assets");
      if (!res.ok) { setError("โหลดข้อมูลไม่สำเร็จ"); return; }
      const json = await res.json() as AssetsPayload;
      setData(json);
      setError(null);
    } catch { setError("เชื่อมต่อไม่ได้"); }
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
  function afterTrade() { setBuySell(null); void fetchData(); }

  if (authLoading) {
    return (
      <main className="px-4 pt-6 space-y-4 animate-pulse max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-white/40 rounded-xl" />
        <div className="h-16 w-64 bg-white/40 rounded-2xl" />
        <div className="flex gap-4">
          <div className="h-10 flex-1 bg-white/30 rounded-xl" />
          <div className="h-10 flex-1 bg-white/30 rounded-xl" />
        </div>
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white/30 rounded-xl" />)}
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/50 backdrop-blur-md border border-white/30 flex items-center justify-center text-3xl">📊</div>
        <div>
          <p className="text-lg font-bold text-slate-800 mb-1">ดูพอร์ตหุ้นของคุณ</p>
          <p className="text-sm text-slate-500">เข้าสู่ระบบเพื่อซื้อขายหุ้น และติดตามพอร์ตแบบ real-time</p>
        </div>
        <div className="flex gap-3">
          <Link href="/signup" className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition-colors">
            สมัครฟรี
          </Link>
          <Link href="/signin" className="px-6 py-2.5 bg-white/60 backdrop-blur-md border border-white/30 text-slate-700 rounded-xl font-semibold text-sm hover:bg-white/80 transition-colors">
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
        <div className="h-6 w-40 bg-white/40 rounded-lg" />
        <div className="h-14 w-56 bg-white/40 rounded-2xl" />
        <div className="flex gap-3">
          <div className="h-12 flex-1 bg-white/30 rounded-xl" />
          <div className="h-12 flex-1 bg-white/30 rounded-xl" />
        </div>
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white/30 rounded-xl" />)}
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
        <div className="text-4xl">⚠️</div>
        <p className="text-slate-700 font-semibold">{error ?? "ไม่พบข้อมูลพอร์ต"}</p>
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
      <div className="px-4 pt-5 pb-4 bg-white/60 backdrop-blur-md border-b border-white/20">
        <div className="max-w-5xl mx-auto">
          {/* Label row */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">มูลค่าพอร์ตทั้งหมด</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 font-semibold">เงินเสมือน</span>
            <span className="text-xs text-slate-400 ml-auto">อัพเดต {asOfTime}</span>
          </div>

          {/* Hero value */}
          <p className="text-4xl font-bold font-mono text-slate-900 tracking-tight mb-3">
            {thb(totalValueThb)}
          </p>

          {/* P&L stats */}
          <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-6">
            <div className="bg-white/50 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/40">
              <p className="text-xs text-slate-500 mb-0.5">วันนี้</p>
              <p className={`text-base font-bold font-mono ${clr(change1DThb)}`}>
                {change1DThb >= 0 ? "+" : ""}{thb(change1DThb)}
              </p>
              <p className={`text-xs ${clr(change1DPct)}`}>{pctFmt(change1DPct)}</p>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/40">
              <p className="text-xs text-slate-500 mb-0.5">กำไร/ขาดทุนรวม</p>
              <p className={`text-base font-bold font-mono ${clr(unrealizedPnlThb)}`}>
                {unrealizedPnlThb >= 0 ? "+" : ""}{thb(unrealizedPnlThb)}
              </p>
              <p className={`text-xs ${clr(unrealizedPnlPct)}`}>{pctFmt(unrealizedPnlPct)}</p>
            </div>
            <div className="sm:flex-none bg-white/50 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/40 col-span-2 sm:col-span-1">
              <p className="text-xs text-slate-500 mb-0.5">อัตราแลกเปลี่ยน</p>
              <p className="text-sm font-semibold font-mono text-slate-700">1 USD = {fxRate.toFixed(2)} THB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit mb-4">
          {(["holdings", "analytics"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
              {t === "holdings" ? "หุ้น" : "วิเคราะห์"}
            </button>
          ))}
        </div>

        {tab === "analytics" && <PortfolioAnalytics data={data} />}

        {tab === "holdings" && (
          <>
            {/* Mobile */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 dark:text-slate-500">{holdings.length} หุ้น</span>
                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    aria-label="เรียงตาม"
                    className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setSortDir((d) => (d === 1 ? -1 : 1))}
                    aria-label={sortDir === -1 ? "เรียงน้อยไปมาก" : "เรียงมากไปน้อย"}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    {sortDir === -1 ? "↓" : "↑"}
                  </button>
                </div>
              </div>

              <div className="flex text-xs text-slate-400 dark:text-slate-500 px-4 pb-1 gap-2">
                <span className="flex-1">ชื่อหุ้น</span>
                <span className="w-24 text-right">มูลค่า</span>
                <span className="w-20 text-right">P/L</span>
                <span className="w-4" />
              </div>

              <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-white/30 overflow-hidden">
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
                  <div className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="w-8 h-8 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-sm flex-shrink-0">💵</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">เงินสด USD</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-slate-700 dark:text-slate-300">{usd(cashUsd)}</div>
                    </div>
                  </div>
                )}
                {cashThb > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="w-8 h-8 rounded-md bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-sm flex-shrink-0">🇹🇭</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">เงินสด THB</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-slate-700 dark:text-slate-300">{thb(cashThb)}</div>
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
    </main>
  );
}
