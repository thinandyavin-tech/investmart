"use client";

import {
  useState, useEffect, useCallback, useRef, useMemo, useId
} from "react";
import Link from "next/link";
import { CategoryBadge } from "@/components/radar/CategoryBadge";
import { ScoreBadge } from "@/components/radar/ScoreBadge";
import { StockDetailPanel } from "@/components/radar/StockDetailPanel";
import type { StockMetrics, CapSize } from "@/lib/momentum";
import type { Universe } from "@/lib/stockUniverse";
import { ALL_SECTORS } from "@/lib/stockUniverse";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField = "rank" | "change" | "volume" | "score";

interface ScanResponse {
  results:    StockMetrics[];
  total:        number;
  scannedAt:    string | null;
  cached:       boolean;
  refreshing:   boolean;
  building:     boolean;
  scannedCount: number;
}

const UNIVERSES: { value: Universe; label: string; desc: string }[] = [
  { value: "NASDAQ100",label: "Nasdaq 100",  desc: "95 หุ้น" },
  { value: "SP500",    label: "S&P 500",     desc: "150 หุ้น" },
  { value: "CEO",      label: "CEO Picks",   desc: "20 หุ้น" },
  { value: "SET50",    label: "SET 50 ⚠️",    desc: "ข้อมูลล่าช้า" },
];

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "rank",   label: "Score" },
  { value: "change", label: "% 1D" },
  { value: "volume", label: "Vol Surge" },
  { value: "score",  label: "Momentum" },
];

const PAGE_SIZE = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ที่แล้ว`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ที่แล้ว`;
  return `${Math.floor(diff / 3600)}h ที่แล้ว`;
}

function fmtPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function fmtPrice(v: number): string {
  if (v >= 1000) return `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `$${v.toFixed(2)}`;
}

function fmtVol(v: number): string {
  return `${v.toFixed(1)}×`;
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 animate-pulse">
      <div className="w-6 h-3 bg-slate-200 rounded flex-shrink-0" />
      <div className="w-14 h-4 bg-slate-200 rounded" />
      <div className="flex-1 h-3 bg-slate-100 rounded hidden sm:block" />
      <div className="w-16 h-4 bg-slate-200 rounded ml-auto" />
      <div className="w-12 h-4 bg-slate-200 rounded" />
      <div className="w-10 h-6 bg-slate-200 rounded-full" />
    </div>
  );
}

// ─── Stock row ────────────────────────────────────────────────────────────────

interface StockRowProps {
  s:        StockMetrics;
  rank:     number;
  selected: boolean;
  onSelect: () => void;
}

function StockRow({ s, rank, selected, onSelect }: StockRowProps) {
  const up  = s.change1D >= 0;
  const clr = up ? "text-emerald-600" : "text-red-500";

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 border-b border-slate-100 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-inset ${
        selected
          ? "bg-violet-50 border-l-2 border-l-violet-500"
          : "hover:bg-slate-50/80"
      }`}
      aria-selected={selected}
      aria-label={`${rank}. ${s.ticker} ${s.companyName} — ${fmtPct(s.change1D)} วันนี้`}
    >
      {/* Rank */}
      <span className="w-6 text-[10px] font-mono text-slate-400 text-right flex-shrink-0">
        {rank}
      </span>

      {/* Ticker + company */}
      <div className="w-16 sm:w-20 flex-shrink-0">
        <div className="text-xs font-bold font-mono text-slate-900">{s.ticker}</div>
        {s.isNew && (
          <span className="text-[9px] font-semibold text-violet-600 uppercase tracking-wide">new</span>
        )}
      </div>

      {/* Company name — hidden on mobile */}
      <div className="flex-1 min-w-0 hidden sm:block">
        <p className="text-xs text-slate-500 truncate">{s.companyName}</p>
        <p className="text-[10px] text-slate-400">{s.sector}</p>
      </div>

      {/* Price */}
      <span className="text-xs font-mono text-slate-800 w-16 text-right flex-shrink-0 hidden xs:block">
        {fmtPrice(s.price)}
      </span>

      {/* 1D % */}
      <span className={`text-xs font-bold font-mono w-14 text-right flex-shrink-0 ${clr}`}>
        {fmtPct(s.change1D)}
      </span>

      {/* Vol surge */}
      <span className="text-xs font-mono text-slate-600 w-10 text-right flex-shrink-0 hidden md:block">
        {fmtVol(s.volumeSurge)}
      </span>

      {/* Score badge */}
      <div className="flex-shrink-0">
        <ScoreBadge score={s.momentumScore} />
      </div>

      {/* Category badge */}
      <div className="flex-shrink-0 hidden lg:block">
        <CategoryBadge category={s.category} />
      </div>
    </button>
  );
}

// ─── Why-it's-here line ───────────────────────────────────────────────────────

function WhyHere({ s }: { s: StockMetrics }) {
  const parts: string[] = [];
  if (Math.abs(s.change1D) >= 1) parts.push(`${fmtPct(s.change1D)} วันนี้`);
  if (s.volumeSurge >= 1.5) parts.push(`วอลุ่ม ${fmtVol(s.volumeSurge)} ค่าเฉลี่ย`);
  if (s.rsi > 70)  parts.push("RSI overbought");
  if (s.rsi < 30)  parts.push("RSI oversold");
  if (s.isNew)     parts.push("ใหม่วันนี้");
  return parts.length > 0
    ? <span className="text-[10px] text-violet-500">{parts.join(" · ")}</span>
    : null;
}

// ─── Building / empty state ───────────────────────────────────────────────────

function BuildingState({ universe, scannedCount, total }: {
  universe: Universe;
  scannedCount: number;
  total: number;
}) {
  if (universe === "SET50") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
        <span className="text-2xl">🇹🇭</span>
        <p className="text-sm font-semibold text-[#1F1A14]">ข้อมูล SET50 ไม่พร้อมใช้งาน</p>
        <p className="text-xs text-[#8A8378] max-w-sm leading-relaxed">
          Finnhub free tier ไม่รองรับหุ้นไทย (.BK) · ต้องการ Finnhub Growth/Premium
        </p>
        <Link href="/browse?index=SET50" className="text-xs font-semibold text-violet-600 hover:underline mt-1">
          ดูรายชื่อ SET50 →
        </Link>
      </div>
    );
  }

  const hasPartial = scannedCount > 0 && total > 0;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
      {hasPartial ? (
        <>
          <p className="text-sm font-semibold text-[#1F1A14]">
            สแกนแล้ว {scannedCount}/{total} หุ้น…
          </p>
          <div className="w-48 h-1.5 bg-[#E8E2D4] rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all"
              style={{ width: `${Math.round((scannedCount / total) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-[#8A8378]">ผลบางส่วนกำลังโหลด…</p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-[#1F1A14]">ยังไม่มีผลสแกน</p>
          <p className="text-xs text-[#8A8378] max-w-xs leading-relaxed">
            ผลสแกนจะอัพเดตทุก ~15 นาที ระหว่างตลาดเปิด
          </p>
          <p className="text-xs text-[#8A8378]">
            (US market: จ.–ศ. 21:30–04:00 น. ตามเวลาไทย)
          </p>
        </>
      )}
    </div>
  );
}

// ─── Heat indicator ───────────────────────────────────────────────────────────

function HeatIndicator({ stocks }: { stocks: StockMetrics[] }) {
  if (stocks.length === 0) return null;
  const bullPct = Math.round((stocks.filter(s => s.change1D > 0).length / stocks.length) * 100);
  const avgChg  = stocks.reduce((a, s) => a + s.change1D, 0) / stocks.length;

  const { label, cls } =
    avgChg >  1.5 && bullPct > 70 ? { label: "🔥 ร้อนแรงมาก",   cls: "bg-red-50 border-red-200 text-red-600" } :
    avgChg >  0.3 && bullPct > 55 ? { label: "📈 บวกโดยรวม",    cls: "bg-emerald-50 border-emerald-200 text-emerald-600" } :
    avgChg < -0.3 || bullPct < 35 ? { label: "📉 ลบโดยรวม",    cls: "bg-red-50 border-red-200 text-red-600" } :
                                    { label: "↔️ ผสมปนเป",      cls: "bg-slate-50 border-slate-200 text-slate-500" };

  return (
    <div className={`rounded-xl border px-3 py-2 flex items-center justify-between text-xs ${cls}`}>
      <span className="font-semibold">{label}</span>
      <span>
        บวก {bullPct}% · เฉลี่ย{" "}
        <span className={`font-bold ${avgChg >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          {fmtPct(avgChg)}
        </span>
      </span>
    </div>
  );
}

// ─── Main RadarPage ───────────────────────────────────────────────────────────

export function RadarPage() {
  // Core data
  const [scanData,  setScanData]  = useState<ScanResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // UI filters — applied client-side on the full cached set
  const [universe,  setUniverse]  = useState<Universe>("NASDAQ100");
  const [sector,    setSector]    = useState("ALL");
  const [category,  setCategory]  = useState<StockMetrics["category"] | "ALL">("ALL");
  const [minScore,  setMinScore]  = useState(0);
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir,   setSortDir]   = useState<"asc" | "desc">("asc");
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(1);

  // Detail
  const [selected,          setSelected]          = useState<StockMetrics | null>(null);
  const [detailOpen,        setDetailOpen]        = useState(false);
  const [refreshing,        setRefreshing]        = useState(false);

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const listRef   = useRef<HTMLDivElement>(null);
  const detailId  = useId();

  // ── Fetch (cache-only, instant) ─────────────────────────────────────────────

  const fetchScan = useCallback(async (univ: Universe) => {
    setError(null);
    try {
      const res  = await fetch(`/api/radar/scan?universe=${univ}&minScore=0&filterDead=false`);
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setError(b.error ?? "ไม่สามารถโหลดผลสแกนได้");
        return;
      }
      const data = (await res.json()) as ScanResponse;
      setScanData(data);
      if (data.results.length > 0 && !selected) setSelected(data.results[0]);
    } catch {
      setError("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setLoading(false);
    }
  }, [selected]);

  // Initial load + universe change
  useEffect(() => {
    setLoading(true);
    setScanData(null);
    setSelected(null);
    setPage(1);
    void fetchScan(universe);
  }, [universe, fetchScan]);

  // Auto-poll when building or refreshing
  useEffect(() => {
    const isBuilding = scanData?.building || scanData?.refreshing;
    if (!isBuilding) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    pollRef.current = setInterval(() => void fetchScan(universe), 20_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [scanData?.building, scanData?.refreshing, universe, fetchScan]);

  // Manual refresh — resets cursor so next cron tick starts a fresh cycle
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetch("/api/radar/trigger", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ universe }),
      });
    } catch { /* non-fatal */ }
    await fetchScan(universe);
    setRefreshing(false);
  }, [universe, fetchScan]);

  // ── Client-side filtering + sorting ─────────────────────────────────────────

  const allResults = scanData?.results ?? [];

  const filtered = useMemo(() => {
    let arr = allResults;

    if (sector !== "ALL")   arr = arr.filter(s => s.sector === sector);
    if (category !== "ALL") arr = arr.filter(s => s.category === category);
    if (minScore > 0)       arr = arr.filter(s => s.momentumScore >= minScore);
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      arr = arr.filter(s => s.ticker.includes(q) || s.companyName.toUpperCase().includes(q));
    }

    // Sort
    const mul = sortDir === "asc" ? 1 : -1;
    arr = [...arr].sort((a, b) => {
      switch (sortField) {
        case "change":  return mul * (b.change1D      - a.change1D);
        case "volume":  return mul * (b.volumeSurge   - a.volumeSurge);
        case "score":   return mul * (b.momentumScore - a.momentumScore);
        default:        return mul * (b.momentumScore - a.momentumScore); // rank = score desc
      }
    });

    return arr;
  }, [allResults, sector, category, minScore, search, sortField, sortDir]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore   = filtered.length > paginated.length;

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [sector, category, minScore, search, sortField, sortDir, universe]);

  // Keyboard shortcut: Escape to close detail
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setDetailOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────

  const isBuilding    = scanData?.building === true;
  const isRefreshing  = scanData?.refreshing === true;
  const scannedAt     = scanData?.scannedAt ?? null;
  const totalUniverse = scanData?.total ?? 0;
  const scannedCount  = scanData?.scannedCount ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 py-3">
        <div className="max-w-5xl mx-auto">
          {/* Title row */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h1 className="text-xs font-bold uppercase tracking-widest text-slate-800">
                📡 Radar — สัญญาณโมเมนตัม
              </h1>
              <p className="text-[10px] text-[#8A8378] mt-0.5">
                {loading
                  ? "กำลังโหลด…"
                  : isBuilding && scannedCount > 0
                  ? `สแกนแล้ว ${scannedCount}/${totalUniverse} หุ้น (กำลังอัพเดต)`
                  : isBuilding
                  ? "ผลสแกนจะอัพเดตทุก ~15 นาที"
                  : isRefreshing
                  ? `${allResults.length} หุ้น · กำลังรีเฟรช…`
                  : filtered.length > 0
                  ? `${filtered.length.toLocaleString()} จาก ${allResults.length.toLocaleString()} หุ้น · ${timeAgo(scannedAt)}`
                  : allResults.length > 0
                  ? "ไม่พบหุ้นตามเงื่อนไข · ลองลด minScore"
                  : "ยังไม่มีข้อมูล"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isRefreshing && <span className="text-[10px] text-violet-500 animate-pulse">⟳ อัพเดต</span>}
              <button
                onClick={() => void handleRefresh()}
                disabled={refreshing || isBuilding}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:border-violet-400 hover:text-violet-700 disabled:opacity-40 transition-colors"
                aria-label="รีเฟรชผลสแกน"
              >
                {refreshing ? "⟳ สแกน…" : "⟳ รีเฟรช"}
              </button>
            </div>
          </div>

          {/* Universe tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="เลือก Universe">
            {UNIVERSES.map(u => (
              <button
                key={u.value}
                role="tab"
                aria-selected={universe === u.value}
                onClick={() => setUniverse(u.value)}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  universe === u.value
                    ? "bg-violet-600 text-white border-violet-600"
                    : "border-slate-200 text-slate-600 hover:border-violet-300 bg-white"
                }`}
              >
                {u.label}
                <span className="ml-1 opacity-60 font-normal">{u.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      {!isBuilding && allResults.length > 0 && (
        <div className="flex-shrink-0 border-b border-slate-100 bg-white/60 px-4 py-2">
          <div className="max-w-5xl mx-auto flex flex-wrap gap-2 items-center">
            {/* Search */}
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหา ticker / ชื่อ"
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 w-36"
              aria-label="ค้นหาหุ้น"
            />

            {/* Min score */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 whitespace-nowrap">Score ≥</span>
              <input
                type="range" min={0} max={80} step={10} value={minScore}
                onChange={e => setMinScore(Number(e.target.value))}
                className="w-20 accent-violet-600"
                aria-label={`Minimum score: ${minScore}`}
              />
              <span className="text-xs font-mono text-slate-700 w-5">{minScore}</span>
            </div>

            {/* Sort */}
            <div className="flex gap-1">
              {SORT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => {
                    if (sortField === o.value) setSortDir(d => d === "asc" ? "desc" : "asc");
                    else { setSortField(o.value); setSortDir("desc"); }
                  }}
                  className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors ${
                    sortField === o.value
                      ? "bg-violet-100 border-violet-300 text-violet-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-400"
                  }`}
                >
                  {o.label}{sortField === o.value ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
                </button>
              ))}
            </div>

            {/* Category filter */}
            <select
              value={category}
              onChange={e => setCategory(e.target.value as StockMetrics["category"] | "ALL")}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
              aria-label="กรองตามหมวด"
            >
              <option value="ALL">ทุกหมวด</option>
              <option value="TOP100">🏆 Top 100</option>
              <option value="DARK_HORSE">🐎 Dark Horse</option>
              <option value="REVIVED">⚡ Revived</option>
              <option value="STRONG">💪 Strong</option>
            </select>

            {/* Sector filter */}
            <select
              value={sector}
              onChange={e => setSector(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
              aria-label="กรองตาม Sector"
            >
              <option value="ALL">ทุก Sector</option>
              {ALL_SECTORS.filter(s => s !== "Other" && s !== "ETF").map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Result count */}
            <span className="text-[10px] text-slate-400 ml-auto hidden sm:block" aria-live="polite" aria-atomic="true">
              {filtered.length.toLocaleString()} ผลลัพธ์
            </span>
          </div>
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: list */}
        <div
          ref={listRef}
          className="flex-1 min-w-0 overflow-y-auto"
          role="listbox"
          aria-label="ผลสแกน Radar"
        >
          <div className="max-w-5xl mx-auto">
            {/* Loading skeletons */}
            {loading && (
              <div>
                {Array.from({ length: 15 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="flex flex-col items-center py-12 gap-3 px-4 text-center">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={() => void fetchScan(universe)}
                  className="text-xs font-semibold text-violet-600 hover:underline"
                >
                  ลองใหม่
                </button>
              </div>
            )}

            {/* Building / partial / SET50 unavailable */}
            {!loading && !error && isBuilding && allResults.length === 0 && (
              <BuildingState universe={universe} scannedCount={scannedCount} total={totalUniverse} />
            )}

            {/* Results */}
            {!loading && !error && !isBuilding && (
              <>
                {allResults.length > 0 && (
                  <div className="px-4 py-2">
                    <HeatIndicator stocks={filtered} />
                  </div>
                )}

                {/* Column headers */}
                {paginated.length > 0 && (
                  <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    <span className="w-6 text-right">#</span>
                    <span className="w-16 sm:w-20">Ticker</span>
                    <span className="flex-1 hidden sm:block">บริษัท</span>
                    <span className="w-16 text-right hidden xs:block">ราคา</span>
                    <span className="w-14 text-right">% 1D</span>
                    <span className="w-10 text-right hidden md:block">Vol</span>
                    <span className="w-10">Score</span>
                    <span className="w-16 hidden lg:block">หมวด</span>
                  </div>
                )}

                {paginated.map((s, i) => (
                  <StockRow
                    key={s.ticker}
                    s={s}
                    rank={i + 1}
                    selected={selected?.ticker === s.ticker}
                    onSelect={() => {
                      setSelected(s);
                      setDetailOpen(true);
                    }}
                  />
                ))}

                {/* Load more */}
                {hasMore && (
                  <div className="py-4 text-center">
                    <button
                      onClick={() => setPage(p => p + 1)}
                      className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors border border-violet-300 rounded-lg px-4 py-2 hover:border-violet-500"
                    >
                      โหลดเพิ่ม ({filtered.length - paginated.length} รายการ)
                    </button>
                  </div>
                )}

                {/* Empty after filters */}
                {!isBuilding && allResults.length > 0 && filtered.length === 0 && (
                  <div className="flex flex-col items-center py-12 gap-2 text-center px-4">
                    <p className="text-sm text-slate-600">ไม่พบหุ้นตามเงื่อนไข</p>
                    <p className="text-xs text-slate-400">ลอง ลด minScore, เปลี่ยน sector, หรือล้างตัวกรอง</p>
                    <button
                      onClick={() => { setMinScore(0); setSector("ALL"); setCategory("ALL"); setSearch(""); }}
                      className="text-xs text-violet-600 hover:underline mt-1"
                    >
                      ล้างตัวกรองทั้งหมด
                    </button>
                  </div>
                )}

                {/* Disclaimer */}
                {allResults.length > 0 && (
                  <p className="text-[10px] text-slate-400 text-center px-4 py-3 border-t border-slate-100">
                    Radar แสดงสัญญาณโมเมนตัมจากข้อมูลจริง ·{" "}
                    <Link href="/learn/radar" className="underline hover:text-slate-600">วิธีคำนวณ score</Link>{" "}
                    · ไม่ใช่คำแนะนำการลงทุน
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: detail panel (desktop sidebar) */}
        {selected && (
          <aside
            id={detailId}
            className={`
              hidden lg:flex flex-col border-l border-slate-200 bg-white
              w-80 xl:w-96 flex-shrink-0 overflow-y-auto
            `}
            aria-label={`รายละเอียด ${selected.ticker}`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
              <div>
                <span className="text-sm font-bold text-slate-900">{selected.ticker}</span>
                <span className="text-xs text-slate-500 ml-2">{selected.companyName}</span>
              </div>
              <WhyHere s={selected} />
            </div>
            <div className="flex-1 overflow-y-auto">
              <StockDetailPanel stock={selected} timeframe="1D" />
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex flex-col gap-2 flex-shrink-0">
              <Link
                href={`/analyze?ticker=${selected.ticker}&timeframe=3M`}
                className="w-full text-center text-xs font-bold py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
              >
                ✦ Martin วิเคราะห์กราฟ
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/stock/${selected.ticker}`}
                  className="text-center text-xs font-semibold py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:border-violet-400 hover:text-violet-700 transition-colors"
                >
                  หน้าหุ้น →
                </Link>
                <Link
                  href={`/radar?ticker=${selected.ticker}`}
                  className="text-center text-xs font-semibold py-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  Paper Trade
                </Link>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Mobile detail sheet */}
      {detailOpen && selected && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setDetailOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl border-t border-slate-200 flex flex-col lg:hidden"
            style={{ maxHeight: "85vh" }}
            role="dialog"
            aria-modal="true"
            aria-label={`รายละเอียด ${selected.ticker}`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
              <div>
                <span className="text-sm font-bold">{selected.ticker}</span>
                <span className="text-xs text-slate-500 ml-2 truncate">{selected.companyName}</span>
              </div>
              <button
                onClick={() => setDetailOpen(false)}
                className="text-slate-400 hover:text-slate-700 w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100"
                aria-label="ปิด"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <StockDetailPanel stock={selected} timeframe="1D" />
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex flex-col gap-2 flex-shrink-0">
              <Link
                href={`/analyze?ticker=${selected.ticker}&timeframe=3M`}
                className="w-full text-center text-xs font-bold py-2.5 rounded-xl bg-violet-600 text-white"
                onClick={() => setDetailOpen(false)}
              >
                ✦ Martin วิเคราะห์กราฟ
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/stock/${selected.ticker}`} onClick={() => setDetailOpen(false)}
                  className="text-center text-xs font-semibold py-2 rounded-lg border border-slate-300 text-slate-700">
                  หน้าหุ้น →
                </Link>
                <Link href={`/radar?ticker=${selected.ticker}`} onClick={() => setDetailOpen(false)}
                  className="text-center text-xs font-semibold py-2 rounded-lg border border-emerald-300 text-emerald-700">
                  Paper Trade
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
