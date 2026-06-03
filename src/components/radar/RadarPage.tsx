"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { OffsetButton } from "@/components/OffsetButton";
import { CategoryBadge } from "@/components/radar/CategoryBadge";
import { ScoreBadge } from "@/components/radar/ScoreBadge";
import { StockDetailPanel } from "@/components/radar/StockDetailPanel";
import type { StockMetrics, CapSize } from "@/lib/momentum";
import type { Universe } from "@/lib/stockUniverse";
import { ALL_SECTORS } from "@/lib/stockUniverse";

// ─── Types ────────────────────────────────────────────────────────────────────

const TIMEFRAMES = ["1D", "5D", "1M", "3M", "6M", "1Y"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];
type SortField = "rank" | "change" | "volume" | "score" | "rsi";

const CAP_OPTIONS: { value: CapSize; label: string }[] = [
  { value: "ALL",   label: "ทั้งหมด" },
  { value: "SMALL", label: "Small < $300M" },
  { value: "MID",   label: "Mid $300M–$100B" },
  { value: "BIG",   label: "Big $100B+" },
];

// ─── Scan Presets ─────────────────────────────────────────────────────────────

interface Preset {
  id:     string;
  label:  string;
  desc:   string;
  config: { universe: Universe; minScore: number; capSize: CapSize; filterDead: boolean };
}

const PRESETS: Preset[] = [
  { id: "breakout", label: "🔥 Breakout",  desc: "โมเมนตัมสูง ปริมาณพุ่ง",    config: { universe: "SP500",     minScore: 60, capSize: "ALL",   filterDead: true  } },
  { id: "quality",  label: "💎 คุณภาพ",    desc: "บิ๊กแคป คุณภาพดี",           config: { universe: "SP500",     minScore: 50, capSize: "BIG",   filterDead: true  } },
  { id: "small",    label: "🚀 Small Cap", desc: "ขนาดเล็ก โอกาสสูง",          config: { universe: "SP500",     minScore: 30, capSize: "SMALL", filterDead: true  } },
  { id: "tech",     label: "💻 Tech",      desc: "Nasdaq 100 tech",            config: { universe: "NASDAQ100", minScore: 30, capSize: "ALL",   filterDead: true  } },
  { id: "ceo",      label: "👤 CEO",       desc: "พอร์ตผู้สร้างเว็บ",           config: { universe: "CEO",       minScore: 0,  capSize: "ALL",   filterDead: false } },
];

// ─── Heat Indicator ───────────────────────────────────────────────────────────

function HeatIndicator({ stocks }: { stocks: StockMetrics[] }) {
  if (stocks.length === 0) return null;
  const bullPct = Math.round((stocks.filter((s) => s.change1D > 0).length / stocks.length) * 100);
  const avgChg  = stocks.reduce((a, s) => a + s.change1D, 0) / stocks.length;

  const heat =
    avgChg > 1.5 && bullPct > 70  ? { label: "🔥 ร้อนแรงมาก",  cls: "bg-red-50 border-red-200",     textCls: "text-red-600"   } :
    avgChg > 0.3 && bullPct > 55  ? { label: "📈 บวกโดยรวม",   cls: "bg-green-50 border-green-200",  textCls: "text-green-600" } :
    avgChg < -0.3 || bullPct < 35 ? { label: "📉 ลบโดยรวม",   cls: "bg-red-50 border-red-200",     textCls: "text-red-600"   } :
                                    { label: "↔️ ผสมปนเป",     cls: "bg-slate-50 border-slate-200",  textCls: "text-slate-500" };

  return (
    <div className={`border rounded-lg px-3 py-2 flex items-center justify-between text-[10px] ${heat.cls}`}>
      <span className={`font-semibold ${heat.textCls}`}>{heat.label}</span>
      <span className="text-slate-500">
        บวก {bullPct}% · เฉลี่ย{" "}
        <span className={avgChg >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
          {avgChg >= 0 ? "+" : ""}{avgChg.toFixed(2)}%
        </span>
      </span>
    </div>
  );
}

// ─── Compare View ─────────────────────────────────────────────────────────────

function CompareView({ stocks, onClose }: { stocks: StockMetrics[]; onClose: () => void }) {
  const fields: { key: keyof StockMetrics; label: string; fmt: (v: unknown) => string }[] = [
    { key: "price",         label: "ราคา",      fmt: (v) => `$${(v as number).toFixed(2)}`  },
    { key: "change1D",      label: "% 1D",      fmt: (v) => `${(v as number) >= 0 ? "+" : ""}${(v as number).toFixed(2)}%` },
    { key: "momentumScore", label: "Score",     fmt: (v) => String(v) },
    { key: "volumeSurge",   label: "Vol Surge", fmt: (v) => `${(v as number).toFixed(1)}x`  },
    { key: "qualityScore",  label: "Quality",   fmt: (v) => String(v) },
    { key: "rsi",           label: "RSI",       fmt: (v) => String(v) },
    { key: "sector",        label: "Sector",    fmt: (v) => String(v) },
  ];

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-700">เปรียบเทียบหุ้น</h2>
        <button onClick={onClose} className="text-[10px] font-semibold text-slate-400 hover:text-slate-900">
          ✕ ปิด
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left py-1.5 pr-3 text-slate-400 uppercase tracking-wide font-semibold text-[9px]">
                เมตริก
              </th>
              {stocks.map((s) => (
                <th key={s.ticker} className="text-center py-1.5 px-2 font-bold text-slate-900">
                  {s.ticker}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map(({ key, label, fmt }) => (
              <tr key={key} className="border-b border-slate-100">
                <td className="py-1.5 pr-3 text-slate-500 font-semibold text-[9px] uppercase tracking-wide">
                  {label}
                </td>
                {stocks.map((s) => {
                  const val    = s[key];
                  const isChange = key === "change1D";
                  const numVal   = typeof val === "number" ? val : null;
                  return (
                    <td
                      key={s.ticker}
                      className="py-1.5 px-2 text-center font-bold"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: isChange && numVal !== null
                          ? numVal >= 0 ? "#16A34A" : "#DC2626"
                          : "#0F172A",
                      }}
                    >
                      {fmt(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RadarPage() {
  const [universe, setUniverse]     = useState<Universe>("SP500");
  const [timeframe, setTimeframe]   = useState<Timeframe>("1D");
  const [capSize, setCapSize]       = useState<CapSize>("ALL");
  const [filterDead, setFilterDead] = useState(true);
  const [minScore, setMinScore]     = useState(20);
  const [search, setSearch]         = useState("");

  const [scanning, setScanning]                 = useState(false);
  const [progress, setProgress]                 = useState(0);
  const [stocks, setStocks]                     = useState<StockMetrics[]>([]);
  const [selected, setSelected]                 = useState<StockMetrics | null>(null);
  const [lastScanTime, setLastScanTime]         = useState("");
  const [totalScanned, setTotalScanned]         = useState(0);
  const [scanElapsed, setScanElapsed]           = useState("00:00");
  const [fromCache, setFromCache]               = useState(false);
  const [cacheRefreshing, setCacheRefreshing]   = useState(false);

  const [sectorFilter, setSectorFilter]         = useState("ALL");
  const [categoryFilter, setCategoryFilter]     = useState<StockMetrics["category"] | null>(null);
  const [sortField, setSortField]               = useState<SortField>("rank");
  const [sortDir, setSortDir]                   = useState<"asc" | "desc">("asc");
  const [compareSet, setCompareSet]             = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode]           = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [aiSummary, setAiSummary]               = useState("");
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen]           = useState(false);

  const scanStartRef = useRef<number>(0);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const runScan = useCallback(async (force = false) => {
    setScanning(true);
    setProgress(0);
    setStocks([]);
    setAiSummary("");
    scanStartRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - scanStartRef.current) / 1000);
      setScanElapsed(`${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`);
    }, 1000);

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(95, p + Math.random() * 8));
    }, 400);

    try {
      const params = new URLSearchParams({ universe, minScore: String(minScore), capSize, filterDead: String(filterDead) });
      if (force) params.set("force", "true");
      const res  = await fetch(`/api/radar/scan?${params}`);
      const data = (await res.json()) as {
        results: StockMetrics[]; total: number; scannedAt: string; cached: boolean; refreshing: boolean;
      };
      const results = data.results ?? [];
      setStocks(results);
      setTotalScanned(data.total ?? 0);
      setFromCache(data.cached ?? false);
      setCacheRefreshing(data.refreshing ?? false);
      setProgress(100);

      const ts = data.cached && data.scannedAt ? new Date(data.scannedAt) : new Date();
      setLastScanTime(
        ts.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) + " " +
        ts.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
      );

      if (results.length > 0 && !selected) setSelected(results[0]);

      if (results.length > 0) {
        setAiSummaryLoading(true);
        fetch("/api/radar/ai-summary", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            stocks: results.slice(0, 10).map((s) => ({
              ticker: s.ticker, companyName: s.companyName, change1D: s.change1D,
              volumeSurge: s.volumeSurge, sector: s.sector,
            })),
            total: data.total ?? 0,
          }),
        })
          .then((r) => r.json())
          .then((d: { summary?: string }) => setAiSummary(d.summary ?? ""))
          .catch(() => { /* non-fatal */ })
          .finally(() => setAiSummaryLoading(false));
      }
    } catch {
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      if (timerRef.current) clearInterval(timerRef.current);
      setScanning(false);
    }
  }, [universe, minScore, capSize, filterDead, selected]);

  useEffect(() => {
    void runScan(false);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyPreset(preset: Preset) {
    setUniverse(preset.config.universe);
    setMinScore(preset.config.minScore);
    setCapSize(preset.config.capSize);
    setFilterDead(preset.config.filterDead);
    setSectorFilter("ALL");
    setCategoryFilter(null);
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "rank" ? "asc" : "desc");
    }
  }

  function toggleCompare(ticker: string) {
    setCompareSet((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else if (next.size < 4) next.add(ticker);
      return next;
    });
  }

  const sortedFiltered = (() => {
    let list = stocks.filter((s) => {
      if (search) {
        const q = search.toUpperCase();
        if (!s.ticker.includes(q) && !s.companyName.toUpperCase().includes(q)) return false;
      }
      if (sectorFilter !== "ALL" && s.sector !== sectorFilter) return false;
      if (categoryFilter && s.category !== categoryFilter) return false;
      return true;
    });

    if (sortField !== "rank") {
      list = [...list].sort((a, b) => {
        const aVal = sortField === "change" ? a.change1D :
                     sortField === "volume" ? a.volumeSurge :
                     sortField === "score"  ? a.momentumScore : a.rsi;
        const bVal = sortField === "change" ? b.change1D :
                     sortField === "volume" ? b.volumeSurge :
                     sortField === "score"  ? b.momentumScore : b.rsi;
        return sortDir === "desc" ? bVal - aVal : aVal - bVal;
      });
    }

    return list;
  })();

  const compareStocks = stocks.filter((s) => compareSet.has(s.ticker));

  function SortHeader({ field, label }: { field: SortField; label: string }) {
    const active = sortField === field;
    return (
      <button
        onClick={() => toggleSort(field)}
        className={`flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
          active ? "text-slate-900" : "text-slate-400 hover:text-slate-700"
        }`}
      >
        {label}
        {active && <span className="text-[8px]">{sortDir === "desc" ? "▼" : "▲"}</span>}
      </button>
    );
  }

  // ─── Sidebar content ─────────────────────────────────────────────────────────

  function SidebarContent() {
    return (
      <div className="flex flex-col gap-4">
        {/* Scan presets */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-slate-500">Presets</div>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => { applyPreset(p); setSidebarOpen(false); }}
              className="w-full text-left px-2.5 py-2 rounded-lg border border-slate-200 mb-1 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <span className="text-[10px] font-semibold text-slate-800">{p.label}</span>
              <span className="text-[9px] text-slate-400 ml-1.5">{p.desc}</span>
            </button>
          ))}
        </div>

        {/* Universe */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-slate-500">กลุ่มหุ้น</div>
          {(["SP500", "NASDAQ100", "CEO"] as Universe[]).map((u) => {
            const labels: Record<Universe, string> = { SP500: "S&P 500", NASDAQ100: "Nasdaq 100", CEO: "CEO Portfolio" };
            return (
              <button
                key={u}
                onClick={() => setUniverse(u)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg mb-1 text-[10px] font-semibold transition-colors ${
                  universe === u
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {labels[u]}
              </button>
            );
          })}
        </div>

        {/* Scan buttons */}
        <div className="flex gap-1.5">
          <OffsetButton onClick={() => void runScan(false)} disabled={scanning} size="md" className="flex-1 text-center">
            {scanning ? "▶ สแกน..." : "▶ RE: SCAN"}
          </OffsetButton>
          <OffsetButton onClick={() => void runScan(true)} disabled={scanning} size="md" title="บังคับสแกนใหม่">
            ↺
          </OffsetButton>
        </div>

        {/* Progress card */}
        <div className="border border-slate-200 rounded-xl p-3 bg-white text-[10px]">
          <div className="flex justify-between mb-2">
            <span className="text-slate-500">ฐานข้อมูล</span>
            <span className="font-bold text-slate-800" style={{ fontFamily: "var(--font-mono)" }}>
              {totalScanned.toLocaleString()} หุ้น
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full mb-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-scan-gradient transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-[9px] text-slate-400">
            {scanning ? `สแกนอยู่… ${scanElapsed}` :
             fromCache ? `แคช · ${lastScanTime}${cacheRefreshing ? " · กำลังรีเฟรช" : ""}` :
             `อัพเดท ${lastScanTime}`}
          </div>
        </div>

        {/* Cap size */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-slate-500">ขนาดบริษัท</div>
          <select
            value={capSize}
            onChange={(e) => setCapSize(e.target.value as CapSize)}
            className="w-full border border-slate-200 bg-white rounded-lg text-[10px] px-2 py-1.5 text-slate-700 focus:outline-none focus:border-slate-400"
          >
            {CAP_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Filters */}
        <div>
          <label className="flex items-center gap-2 text-[10px] cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={filterDead}
              onChange={(e) => setFilterDead(e.target.checked)}
              className="rounded border-slate-300 text-green-600"
            />
            กรองหุ้นศพกระตุก
          </label>
        </div>

        {/* Min score */}
        <div>
          <div className="flex items-center justify-between text-[10px] mb-2">
            <span className="font-semibold text-slate-700 uppercase tracking-wide">Min Score</span>
            <span className="font-bold text-slate-900" style={{ fontFamily: "var(--font-mono)" }}>{minScore}</span>
          </div>
          <input
            type="range" min={0} max={100} value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-full h-1.5 appearance-none cursor-pointer rounded-full"
            style={{ background: `linear-gradient(to right, #16A34A 0%, #16A34A ${minScore}%, #E2E8F0 ${minScore}%)` }}
          />
        </div>

        {/* Timeframe */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-slate-500">ช่วงเวลา</div>
          <div className="flex flex-wrap gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${
                  timeframe === tf
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">

      {/* ── Desktop sidebar ──────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-52 flex-shrink-0 border-r border-slate-200 p-3 flex-col gap-3 bg-white overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar drawer ────────────────────────────────────────────── */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-white border-r border-slate-200 p-3 overflow-y-auto lg:hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-700">ตั้งค่าการสแกน</span>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 font-bold text-sm hover:text-slate-900">✕</button>
            </div>
            <SidebarContent />
          </div>
        </>
      )}

      {/* ── Center: stock list ───────────────────────────────────────────────── */}
      <section className="flex-1 lg:w-96 lg:flex-none border-r border-slate-200 flex flex-col overflow-hidden bg-white">

        {/* Top bar */}
        <div className="border-b border-slate-200 px-3 py-2.5 flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            ☰ ตั้งค่า
          </button>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-700 flex-1">
            MOMENTUM INTELLIGENCE
          </h2>
          {compareSet.size >= 2 && (
            <button
              onClick={() => setCompareMode(true)}
              className="text-[9px] font-semibold border border-green-600 rounded-md px-2 py-0.5 text-green-600 hover:bg-green-600 hover:text-white transition-colors"
            >
              เปรียบเทียบ {compareSet.size}
            </button>
          )}
        </div>

        {/* Heat indicator */}
        {!scanning && stocks.length > 0 && (
          <div className="px-3 pt-2">
            <HeatIndicator stocks={stocks} />
          </div>
        )}

        {/* AI summary */}
        {(aiSummary || aiSummaryLoading) && (
          <div className="mx-3 mt-2 border border-slate-100 rounded-xl p-3 bg-white shadow-card">
            <div className="text-[9px] font-semibold text-green-600 uppercase tracking-wide mb-1">AI SNAPSHOT</div>
            {aiSummaryLoading
              ? <div className="h-3 w-full bg-slate-100 animate-pulse rounded" />
              : <p className="leading-relaxed text-[10px] text-slate-700">{aiSummary}</p>
            }
            <p className="text-[8px] text-slate-400 mt-1">เครื่องมือวิจัย · ไม่ใช่คำแนะนำลงทุน</p>
          </div>
        )}

        {/* Sector tabs */}
        <div className="flex gap-1 px-3 pt-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {["ALL", ...ALL_SECTORS.filter((s) => stocks.some((st) => st.sector === s))].map((s) => (
            <button
              key={s}
              onClick={() => setSectorFilter(s)}
              className={`flex-shrink-0 px-2 py-0.5 text-[9px] font-semibold rounded-md transition-colors ${
                sectorFilter === s
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "ALL" ? "ทุกกลุ่ม" : s}
            </button>
          ))}
        </div>

        {/* Category badges */}
        <div className="px-3 pt-2 flex gap-2">
          {(["TOP100", "DARK_HORSE", "REVIVED", "STRONG"] as const).map((cat) => (
            <CategoryBadge
              key={cat}
              category={cat}
              active={categoryFilter === cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
            />
          ))}
        </div>

        {/* Search */}
        <div className="px-3 pt-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา ticker หรือชื่อบริษัท"
            className="w-full border border-slate-200 rounded-lg bg-white text-[10px] px-2.5 py-1.5 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Table header */}
        <div className="px-3 pt-2 pb-1 flex items-center gap-1 border-b border-slate-100 text-[9px] text-slate-400">
          <span className="w-5" />
          <span className="flex-1 font-semibold uppercase tracking-wide">TICKER</span>
          <SortHeader field="change" label="CHG%" />
          <span className="w-1" />
          <SortHeader field="volume" label="VOL" />
          <span className="w-1" />
          <SortHeader field="score"  label="SCORE" />
        </div>

        {/* Stock rows */}
        <div className="flex-1 overflow-y-auto">
          {scanning && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="text-xs text-slate-400">กำลังสแกน {totalScanned || "..."} หุ้น…</div>
              <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-scan-gradient rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {!scanning && sortedFiltered.length === 0 && (
            <div className="text-center text-xs text-slate-400 py-8">ไม่พบหุ้น — ลองปรับตัวกรอง</div>
          )}
          {sortedFiltered.map((stock, i) => {
            const isSelected = selected?.ticker === stock.ticker;
            const isCompared = compareSet.has(stock.ticker);
            return (
              <button
                key={stock.ticker}
                onClick={() => {
                  setSelected(stock);
                  setMobileDetailOpen(true);
                  setCompareMode(false);
                }}
                className="w-full text-left border-b border-slate-100 px-3 py-2.5 flex items-center gap-2 transition-colors"
                style={{
                  background: isSelected ? "#0F172A" : undefined,
                  color:      isSelected ? "#F1F5F9" : "#0F172A",
                }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "#F8FAFC"; }}
                onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = ""; }}
              >
                {/* Rank */}
                <span className="text-[9px] w-5 text-right flex-shrink-0 text-slate-400">{i + 1}</span>

                {/* Ticker + info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[11px] font-bold">{stock.ticker}</span>
                    {stock.isNew && (
                      <span className="text-[7px] font-bold px-1 py-0.5 rounded-sm" style={{ background: "#FF3D9A", color: "#fff" }}>NEW</span>
                    )}
                    {i === 0 && <span className="text-[10px]">🔥</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="text-[8px] px-1 rounded-sm"
                      style={{
                        background: isSelected ? "#1E293B" : "#F1F5F9",
                        color:      isSelected ? "#94A3B8" : "#64748B",
                      }}
                    >
                      {stock.sector}
                    </span>
                    <span
                      className="text-[9px] truncate"
                      style={{ color: isSelected ? "#94A3B8" : "#64748B" }}
                    >
                      {stock.companyName !== stock.ticker ? stock.companyName.slice(0, 16) : ""}
                    </span>
                  </div>
                </div>

                {/* Change */}
                <span
                  className="text-[10px] font-bold w-12 text-right flex-shrink-0"
                  style={{ color: stock.change1D >= 0 ? "#16A34A" : "#DC2626" }}
                >
                  {stock.change1D >= 0 ? "+" : ""}{stock.change1D.toFixed(2)}%
                </span>

                {/* Volume */}
                <span className="text-[9px] w-8 text-right flex-shrink-0 text-slate-400">
                  {stock.volumeSurge.toFixed(1)}x
                </span>

                {/* Score */}
                <ScoreBadge score={stock.momentumScore} size="sm" />

                {/* Compare checkbox */}
                <input
                  type="checkbox"
                  checked={isCompared}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleCompare(stock.ticker)}
                  className="flex-shrink-0 cursor-pointer rounded"
                  title="เพิ่มเข้าเปรียบเทียบ"
                />
              </button>
            );
          })}
        </div>

        {/* Mobile footer stats */}
        {!scanning && stocks.length > 0 && (
          <div className="lg:hidden border-t border-slate-200 px-3 py-2 flex gap-3 text-[9px] text-slate-500">
            <span>ติดเรดาร์ <b className="text-slate-800">{sortedFiltered.length}</b></span>
            <span>จาก <b className="text-slate-800">{totalScanned}</b> หุ้น</span>
            {fromCache && <span className="text-green-600 font-semibold">แคช</span>}
          </div>
        )}
      </section>

      {/* ── Desktop right panel ──────────────────────────────────────────────── */}
      <section className="hidden lg:block flex-1 overflow-y-auto bg-[#F8FAFC]">
        {compareMode && compareStocks.length >= 2 ? (
          <CompareView stocks={compareStocks} onClose={() => setCompareMode(false)} />
        ) : selected ? (
          <StockDetailPanel stock={selected} timeframe={timeframe} />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-slate-400">
            เลือกหุ้นจากรายการเพื่อดูรายละเอียด
          </div>
        )}
      </section>

      {/* ── Mobile bottom sheet ─────────────────────────────────────────────── */}
      {mobileDetailOpen && selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileDetailOpen(false)} />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 overflow-y-auto lg:hidden"
            style={{ maxHeight: "88vh" }}
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-3 py-2.5 flex items-center justify-between z-10">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-800">{selected.ticker}</span>
              <button
                onClick={() => setMobileDetailOpen(false)}
                className="text-slate-400 font-bold text-sm hover:text-slate-900"
                aria-label="ปิด"
              >
                ✕
              </button>
            </div>
            <StockDetailPanel stock={selected} timeframe={timeframe} />
          </div>
        </>
      )}
    </div>
  );
}
