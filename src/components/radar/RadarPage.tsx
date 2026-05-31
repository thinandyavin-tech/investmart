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
  id:      string;
  label:   string;
  desc:    string;
  config:  { universe: Universe; minScore: number; capSize: CapSize; filterDead: boolean };
}

const PRESETS: Preset[] = [
  { id: "breakout", label: "🔥 Breakout",  desc: "โมเมนตัมสูง ปริมาณพุ่ง",    config: { universe: "SP500",    minScore: 60, capSize: "ALL",   filterDead: true  } },
  { id: "quality",  label: "💎 คุณภาพ",    desc: "บิ๊กแคป คุณภาพดี",           config: { universe: "SP500",    minScore: 50, capSize: "BIG",   filterDead: true  } },
  { id: "small",    label: "🚀 Small Cap", desc: "ขนาดเล็ก โอกาสสูง",          config: { universe: "SP500",    minScore: 30, capSize: "SMALL", filterDead: true  } },
  { id: "tech",     label: "💻 Tech",      desc: "Nasdaq 100 tech",            config: { universe: "NASDAQ100", minScore: 30, capSize: "ALL",   filterDead: true  } },
  { id: "ceo",      label: "👤 CEO",       desc: "พอร์ตผู้สร้างเว็บ",           config: { universe: "CEO",      minScore: 0,  capSize: "ALL",   filterDead: false } },
];

// ─── Heat Indicator ───────────────────────────────────────────────────────────

function HeatIndicator({ stocks }: { stocks: StockMetrics[] }) {
  if (stocks.length === 0) return null;
  const bullPct  = Math.round((stocks.filter((s) => s.change1D > 0).length / stocks.length) * 100);
  const avgChg   = stocks.reduce((a, s) => a + s.change1D, 0) / stocks.length;
  const heatLevel =
    avgChg > 1.5 && bullPct > 70 ? { label: "🔥 ร้อนแรงมาก", color: "#E5484D", bg: "#FEE2E2" } :
    avgChg > 0.3 && bullPct > 55 ? { label: "🟢 บวกโดยรวม",  color: "#5B8A2A", bg: "#F0FAE8" } :
    avgChg < -0.3 || bullPct < 35 ? { label: "🔴 ลบโดยรวม",  color: "#DC2626", bg: "#FEF2F2" } :
    { label: "⚪ ผสมปนเป", color: "#8A8378", bg: "#F3EDE0" };

  return (
    <div
      className="border border-[#1F1A14] px-3 py-2 flex items-center justify-between text-[10px]"
      style={{ background: heatLevel.bg }}
    >
      <span className="font-bold" style={{ color: heatLevel.color }}>{heatLevel.label}</span>
      <span className="text-[#8A8378]">
        บวก {bullPct}% · เฉลี่ย{" "}
        <span style={{ color: avgChg >= 0 ? "#5B8A2A" : "#E5484D" }}>
          {avgChg >= 0 ? "+" : ""}{avgChg.toFixed(2)}%
        </span>
      </span>
    </div>
  );
}

// ─── Compare View ─────────────────────────────────────────────────────────────

function CompareView({ stocks, onClose }: { stocks: StockMetrics[]; onClose: () => void }) {
  const fields: { key: keyof StockMetrics; label: string; fmt: (v: unknown) => string }[] = [
    { key: "price",         label: "ราคา",          fmt: (v) => `$${(v as number).toFixed(2)}`  },
    { key: "change1D",      label: "% 1D",          fmt: (v) => `${(v as number) >= 0 ? "+" : ""}${(v as number).toFixed(2)}%` },
    { key: "momentumScore", label: "Score",         fmt: (v) => String(v)                       },
    { key: "volumeSurge",   label: "Vol Surge",     fmt: (v) => `${(v as number).toFixed(1)}x`  },
    { key: "qualityScore",  label: "Quality",       fmt: (v) => String(v)                       },
    { key: "rsi",           label: "RSI",           fmt: (v) => String(v)                       },
    { key: "sector",        label: "Sector",        fmt: (v) => String(v)                       },
  ];

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-widest">เปรียบเทียบหุ้น</h2>
        <button onClick={onClose} className="text-[10px] font-bold text-[#8A8378] hover:text-[#1F1A14]">
          ✕ ปิด
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="border-b-2 border-[#1F1A14]">
              <th className="text-left py-1.5 pr-3 text-[#8A8378] uppercase tracking-wide font-bold text-[9px]">
                เมตริก
              </th>
              {stocks.map((s) => (
                <th key={s.ticker} className="text-center py-1.5 px-2 font-bold">
                  {s.ticker}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map(({ key, label, fmt }) => (
              <tr key={key} className="border-b border-[#E8E2D4]">
                <td className="py-1.5 pr-3 text-[#8A8378] font-bold text-[9px] uppercase tracking-wide">
                  {label}
                </td>
                {stocks.map((s) => {
                  const val = s[key];
                  const isChange = key === "change1D";
                  const numVal   = typeof val === "number" ? val : null;
                  return (
                    <td
                      key={s.ticker}
                      className="py-1.5 px-2 text-center font-bold"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: isChange && numVal !== null
                          ? numVal >= 0 ? "#5B8A2A" : "#E5484D"
                          : "#1F1A14",
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

  const [scanning, setScanning]         = useState(false);
  const [progress, setProgress]         = useState(0);
  const [stocks, setStocks]             = useState<StockMetrics[]>([]);
  const [selected, setSelected]         = useState<StockMetrics | null>(null);
  const [lastScanTime, setLastScanTime] = useState("");
  const [totalScanned, setTotalScanned] = useState(0);
  const [scanElapsed, setScanElapsed]   = useState("00:00");
  const [fromCache, setFromCache]       = useState(false);
  const [cacheRefreshing, setCacheRefreshing] = useState(false);

  // New feature state
  const [sectorFilter, setSectorFilter]   = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState<StockMetrics["category"] | null>(null);
  const [sortField, setSortField]         = useState<SortField>("rank");
  const [sortDir, setSortDir]             = useState<"asc" | "desc">("asc");
  const [compareSet, setCompareSet]       = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode]     = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [aiSummary, setAiSummary]         = useState("");
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(false);

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

      // Fetch AI summary after scan
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
          .catch(() => {/* non-fatal */})
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
        className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide hover:text-[#1F1A14]"
        style={{ color: active ? "#1F1A14" : "#8A8378" }}
      >
        {label}
        {active && <span className="text-[8px]">{sortDir === "desc" ? "▼" : "▲"}</span>}
      </button>
    );
  }

  // ─── Sidebar content (shared between desktop aside and mobile drawer) ─────

  function SidebarContent() {
    return (
      <div className="flex flex-col gap-3">
        {/* Scan presets */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5">Presets</div>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => { applyPreset(p); setSidebarOpen(false); }}
              className="w-full text-left p-1.5 border border-[#1F1A14] mb-1 text-[10px] hover:bg-[#1F1A14] hover:text-white transition-colors"
            >
              <span className="font-bold">{p.label}</span>
              <span className="text-[9px] text-[#8A8378] ml-1 group-hover:text-white">{p.desc}</span>
            </button>
          ))}
        </div>

        {/* Universe */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5">กลุ่มหุ้น</div>
          {(["SP500", "NASDAQ100", "CEO"] as Universe[]).map((u) => {
            const labels: Record<Universe, string> = { SP500: "S&P 500", NASDAQ100: "Nasdaq 100", CEO: "CEO Portfolio" };
            return (
              <button
                key={u}
                onClick={() => setUniverse(u)}
                className="w-full text-left p-1.5 border border-[#1F1A14] mb-1 text-[10px]"
                style={{ background: universe === u ? "#1F1A14" : "#F3EDE0", color: universe === u ? "#F3EDE0" : "#1F1A14" }}
              >
                {labels[u]}
              </button>
            );
          })}
        </div>

        {/* Scan button */}
        <div className="flex gap-1.5">
          <OffsetButton onClick={() => void runScan(false)} disabled={scanning} size="md" className="flex-1 text-center">
            {scanning ? "▶ สแกน..." : "▶ RE: SCAN"}
          </OffsetButton>
          <OffsetButton onClick={() => void runScan(true)} disabled={scanning} size="md" title="บังคับสแกนใหม่">
            ↺
          </OffsetButton>
        </div>

        {/* Progress */}
        <div className="border border-[#1F1A14] p-2 text-[10px] bg-[#FBF7ED]" style={{ boxShadow: "2px 2px 0 #FF3D9A" }}>
          <div className="flex justify-between mb-1">
            <span className="text-[#8A8378]">ฐานข้อมูล</span>
            <span className="font-bold" style={{ fontFamily: "var(--font-mono)" }}>{totalScanned.toLocaleString()} หุ้น</span>
          </div>
          <div className="h-1.5 bg-[#E0D9CC] border border-[#1F1A14] mb-1">
            <div className="h-full bg-scan-gradient transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-[9px] text-[#8A8378]">
            {scanning ? `สแกนอยู่… ${scanElapsed}` :
             fromCache ? `แคช · ${lastScanTime}${cacheRefreshing ? " · กำลังรีเฟรช" : ""}` :
             `อัพเดท ${lastScanTime}`}
          </div>
        </div>

        {/* Cap size */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5">ขนาดบริษัท</div>
          <select
            value={capSize}
            onChange={(e) => setCapSize(e.target.value as CapSize)}
            className="w-full border border-[#1F1A14] bg-[#FBF7ED] text-[10px] px-2 py-1"
          >
            {CAP_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-[10px] cursor-pointer">
            <input type="checkbox" checked={filterDead} onChange={(e) => setFilterDead(e.target.checked)} className="border border-[#1F1A14]" />
            กรองหุ้นศพกระตุก
          </label>
        </div>

        {/* Score */}
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="font-bold uppercase tracking-wide">Min Score</span>
            <span className="font-bold" style={{ fontFamily: "var(--font-mono)" }}>{minScore}</span>
          </div>
          <input
            type="range" min={0} max={100} value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-full h-1.5 appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #5B8A2A 0%, #FF3D9A ${minScore}%, #E0D9CC ${minScore}%)` }}
          />
        </div>

        {/* Timeframe */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5">ช่วงเวลา</div>
          <div className="flex flex-wrap gap-1">
            {TIMEFRAMES.map((tf) => (
              <button key={tf} onClick={() => setTimeframe(tf)}
                className="px-2 py-0.5 text-[10px] border border-[#1F1A14] font-bold"
                style={{ background: timeframe === tf ? "#1F1A14" : "#F3EDE0", color: timeframe === tf ? "#F3EDE0" : "#1F1A14" }}>
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#FBF7ED]">
      {/* ── Desktop left sidebar ─────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-52 flex-shrink-0 border-r border-[#1F1A14] p-3 flex-col gap-3 bg-[#F3EDE0] overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar drawer ────────────────────────────────────────── */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-[#F3EDE0] border-r border-[#1F1A14] p-3 overflow-y-auto lg:hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-widest">ตั้งค่าการสแกน</span>
              <button onClick={() => setSidebarOpen(false)} className="text-[#8A8378] font-bold text-sm">✕</button>
            </div>
            <SidebarContent />
          </div>
        </>
      )}

      {/* ── Center: stock list ───────────────────────────────────────────── */}
      <section className="flex-1 lg:w-96 lg:flex-none border-r border-[#1F1A14] flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="border-b border-[#1F1A14] px-3 py-2 bg-[#F3EDE0] flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden border border-[#1F1A14] px-2 py-1 text-[10px] font-bold"
          >
            ☰ ตั้งค่า
          </button>
          <h2 className="text-[11px] font-bold uppercase tracking-widest flex-1">
            MOMENTUM INTELLIGENCE
          </h2>
          {compareSet.size >= 2 && (
            <button
              onClick={() => setCompareMode(true)}
              className="text-[9px] font-bold border border-[#5B8A2A] px-2 py-0.5 text-[#5B8A2A] hover:bg-[#5B8A2A] hover:text-white"
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
          <div className="mx-3 mt-2 border border-[#1F1A14] p-2 text-[10px] bg-[#F3EDE0]" style={{ boxShadow: "2px 2px 0 #5B8A2A" }}>
            <div className="text-[9px] font-bold text-[#5B8A2A] uppercase tracking-wide mb-0.5">AI SNAPSHOT</div>
            {aiSummaryLoading
              ? <div className="h-2.5 w-full bg-[#E0D9CC] animate-pulse rounded" />
              : <p className="leading-relaxed text-[#1F1A14]">{aiSummary}</p>
            }
            <p className="text-[8px] text-[#8A8378] mt-1">เครื่องมือวิจัย · ไม่ใช่คำแนะนำลงทุน</p>
          </div>
        )}

        {/* Sector tabs */}
        <div className="flex gap-1 px-3 pt-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {["ALL", ...ALL_SECTORS.filter((s) => stocks.some((st) => st.sector === s))].map((s) => (
            <button
              key={s}
              onClick={() => setSectorFilter(s)}
              className="flex-shrink-0 px-2 py-0.5 text-[9px] font-bold border border-[#1F1A14]"
              style={{ background: sectorFilter === s ? "#1F1A14" : "#F3EDE0", color: sectorFilter === s ? "#F3EDE0" : "#1F1A14" }}
            >
              {s === "ALL" ? "ทุกกลุ่ม" : s}
            </button>
          ))}
        </div>

        {/* Category badges */}
        <div className="px-3 pt-1 flex gap-2">
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
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา ticker หรือชื่อบริษัท"
            className="w-full border border-[#1F1A14] bg-[#FBF7ED] text-[10px] px-2 py-1 placeholder:text-[#8A8378]"
          />
        </div>

        {/* Table header */}
        <div className="px-3 pt-2 pb-1 flex items-center gap-1 border-b border-[#1F1A14] text-[9px] text-[#8A8378]">
          <span className="w-4" />
          <span className="flex-1">TICKER</span>
          <SortHeader field="change" label="CHG%" />
          <span className="w-1" />
          <SortHeader field="volume" label="VOL" />
          <span className="w-1" />
          <SortHeader field="score" label="SCORE" />
        </div>

        {/* Stock rows */}
        <div className="flex-1 overflow-y-auto">
          {scanning && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <div className="text-xs text-[#8A8378]">กำลังสแกน {totalScanned || "..."} หุ้น…</div>
              <div className="w-48 h-1.5 bg-[#E0D9CC] border border-[#1F1A14]">
                <div className="h-full bg-scan-gradient transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {!scanning && sortedFiltered.length === 0 && (
            <div className="text-center text-xs text-[#8A8378] py-8">ไม่พบหุ้น — ลองปรับตัวกรอง</div>
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
                className="w-full text-left border-b border-[#E8E2D4] px-3 py-2 flex items-center gap-2 hover:bg-[#E8E2D4] transition-colors"
                style={{ background: isSelected ? "#1F1A14" : undefined, color: isSelected ? "#F3EDE0" : "#1F1A14" }}
              >
                {/* Rank */}
                <span className="text-[9px] w-4 text-right flex-shrink-0" style={{ color: "#8A8378" }}>{i + 1}</span>

                {/* Ticker + badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[11px] font-bold">{stock.ticker}</span>
                    {stock.isNew && (
                      <span className="text-[7px] font-bold px-1 py-0.5" style={{ background: "#FF3D9A", color: "#fff" }}>NEW</span>
                    )}
                    {i === 0 && <span className="text-[10px]">🔥</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="text-[8px] px-1 rounded-sm"
                      style={{ background: isSelected ? "#333" : "#E8E2D4", color: isSelected ? "#ccc" : "#8A8378" }}
                    >
                      {stock.sector}
                    </span>
                    <span className="text-[9px] truncate" style={{ color: isSelected ? "#9BE15D" : "#8A8378" }}>
                      {stock.companyName !== stock.ticker ? stock.companyName.slice(0, 16) : ""}
                    </span>
                  </div>
                </div>

                {/* Change */}
                <span
                  className="text-[10px] font-bold w-12 text-right flex-shrink-0"
                  style={{ color: stock.change1D >= 0 ? "#5B8A2A" : "#E5484D" }}
                >
                  {stock.change1D >= 0 ? "+" : ""}{stock.change1D.toFixed(2)}%
                </span>

                {/* Volume surge */}
                <span className="text-[9px] w-8 text-right flex-shrink-0" style={{ color: isSelected ? "#8A8378" : "#8A8378" }}>
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
                  className="flex-shrink-0 cursor-pointer"
                  title="เพิ่มเข้าเปรียบเทียบ"
                />
              </button>
            );
          })}
        </div>

        {/* Mobile: compact stats */}
        {!scanning && stocks.length > 0 && (
          <div className="lg:hidden border-t border-[#1F1A14] px-3 py-1.5 flex gap-3 text-[9px] text-[#8A8378]">
            <span>ติดเรดาร์ <b className="text-[#1F1A14]">{sortedFiltered.length}</b></span>
            <span>จาก <b className="text-[#1F1A14]">{totalScanned}</b> หุ้น</span>
            {fromCache && <span className="text-[#5B8A2A]">แคช</span>}
          </div>
        )}
      </section>

      {/* ── Desktop right panel: detail or compare ───────────────────────── */}
      <section className="hidden lg:block flex-1 overflow-y-auto">
        {compareMode && compareStocks.length >= 2 ? (
          <CompareView stocks={compareStocks} onClose={() => setCompareMode(false)} />
        ) : selected ? (
          <StockDetailPanel stock={selected} timeframe={timeframe} />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-[#8A8378]">
            เลือกหุ้นจากรายการเพื่อดูรายละเอียด
          </div>
        )}
      </section>

      {/* ── Mobile bottom sheet ───────────────────────────────────────────── */}
      {mobileDetailOpen && selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileDetailOpen(false)} />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#FBF7ED] border-t-2 border-[#1F1A14] overflow-y-auto lg:hidden"
            style={{ maxHeight: "88vh" }}
          >
            <div className="sticky top-0 bg-[#F3EDE0] border-b border-[#1F1A14] px-3 py-2 flex items-center justify-between z-10">
              <span className="text-[11px] font-bold uppercase tracking-widest">{selected.ticker}</span>
              <button
                onClick={() => setMobileDetailOpen(false)}
                className="text-[#8A8378] font-bold text-sm hover:text-[#1F1A14]"
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
