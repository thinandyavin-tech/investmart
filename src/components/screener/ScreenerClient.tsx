"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ALL_SECTORS } from "@/lib/stockUniverse";
import type { ScreenerTicker } from "@/app/api/screener/route";
import type { MetricsRow } from "@/app/api/screener/metrics/route";
import type { Universe } from "@/lib/stockUniverse";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuoteRow {
  ticker:        string;
  name:          string;
  sector:        string;
  price:         number;
  change1D:      number;
  volume:        number;
  marketCap:     number;
  momentumScore: number;
  qualityScore:  number;
  breakoutScore: number;
  volumeSurge:   number;
  stale:         boolean;
}

type SortField = "ticker" | "change1D" | "price" | "marketCap" | "momentumScore" | "qualityScore" | "pe" | "beta";
type SortDir   = "asc" | "desc";
type CapSize   = "ALL" | "SMALL" | "MID" | "BIG";

const CAP_SMALL = 300_000_000;
const CAP_MID   = 100_000_000_000;
const PAGE_SIZE  = 25;

interface Filters {
  universe:  Universe;
  sectors:   Set<string>;
  capSize:   CapSize;
  minChange: string;
  maxChange: string;
  minScore:  string;
  minPE:     string;
  maxPE:     string;
  minBeta:   string;
  maxBeta:   string;
}

function defaultFilters(): Filters {
  return {
    universe:  "SP500",
    sectors:   new Set<string>(),
    capSize:   "ALL",
    minChange: "",
    maxChange: "",
    minScore:  "",
    minPE:     "",
    maxPE:     "",
    minBeta:   "",
    maxBeta:   "",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCap(m: number): string {
  if (m >= 1e12) return `$${(m / 1e12).toFixed(1)}T`;
  if (m >= 1e9)  return `$${(m / 1e9).toFixed(1)}B`;
  if (m >= 1e6)  return `$${(m / 1e6).toFixed(0)}M`;
  return `$${m.toFixed(0)}`;
}

function fmtVol(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

function scoreColor(s: number): string {
  if (s >= 70) return "#5B8A2A";
  if (s >= 40) return "#D97706";
  return "#8A8378";
}

function applyFilters(
  loaded: QuoteRow[],
  metrics: Map<string, MetricsRow>,
  f: Filters,
): QuoteRow[] {
  const minCh   = f.minChange !== "" ? parseFloat(f.minChange) : -Infinity;
  const maxCh   = f.maxChange !== "" ? parseFloat(f.maxChange) :  Infinity;
  const minSc   = f.minScore  !== "" ? parseInt(f.minScore, 10) : 0;
  const minPE   = f.minPE     !== "" ? parseFloat(f.minPE)     : -Infinity;
  const maxPE   = f.maxPE     !== "" ? parseFloat(f.maxPE)     :  Infinity;
  const minBeta = f.minBeta   !== "" ? parseFloat(f.minBeta)   : -Infinity;
  const maxBeta = f.maxBeta   !== "" ? parseFloat(f.maxBeta)   :  Infinity;

  return loaded.filter(r => {
    if (f.sectors.size > 0 && !f.sectors.has(r.sector)) return false;
    if (f.capSize === "SMALL" && r.marketCap >= CAP_SMALL)                          return false;
    if (f.capSize === "MID"   && (r.marketCap < CAP_SMALL || r.marketCap >= CAP_MID)) return false;
    if (f.capSize === "BIG"   && r.marketCap < CAP_MID)                             return false;
    if (r.change1D < minCh || r.change1D > maxCh) return false;
    if (r.momentumScore < minSc)                   return false;
    const m = metrics.get(r.ticker);
    if (m) {
      if (m.pe   !== null && (m.pe   < minPE   || m.pe   > maxPE))   return false;
      if (m.beta !== null && (m.beta < minBeta || m.beta > maxBeta)) return false;
    }
    return true;
  });
}

function applySort(rows: QuoteRow[], metrics: Map<string, MetricsRow>, field: SortField, dir: SortDir): QuoteRow[] {
  const mult = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (field === "ticker") return mult * a.ticker.localeCompare(b.ticker);
    if (field === "pe" || field === "beta") {
      const am = metrics.get(a.ticker);
      const bm = metrics.get(b.ticker);
      const av = (field === "pe" ? am?.pe : am?.beta) ?? -Infinity;
      const bv = (field === "pe" ? bm?.pe : bm?.beta) ?? -Infinity;
      return mult * (av - bv);
    }
    return mult * ((a[field] as number) - (b[field] as number));
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortHeader({
  label, field, current, dir, onClick,
}: { label: string; field: SortField; current: SortField; dir: SortDir; onClick: (f: SortField) => void }) {
  const active = current === field;
  return (
    <th
      className="px-2 py-1.5 text-left cursor-pointer select-none whitespace-nowrap hover:text-[#5B8A2A] transition-colors"
      onClick={() => onClick(field)}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}
      {active && <span className="ml-0.5 text-xs">{dir === "asc" ? "▲" : "▼"}</span>}
    </th>
  );
}

function SkeletonRow({ rank }: { rank: number }) {
  return (
    <tr className="border-b border-[#ccd5ae]">
      <td className="px-2 py-1.5 text-slate-400">{rank}</td>
      <td className="px-2 py-1.5"><div className="h-3 w-14 bg-[#e9edc9] animate-pulse rounded" /></td>
      <td className="px-2 py-1.5"><div className="h-3 w-16 bg-[#e9edc9] animate-pulse rounded" /></td>
      <td className="px-2 py-1.5"><div className="h-3 w-12 bg-[#e9edc9] animate-pulse rounded" /></td>
      <td className="px-2 py-1.5"><div className="h-3 w-10 bg-[#e9edc9] animate-pulse rounded" /></td>
      <td className="px-2 py-1.5"><div className="h-3 w-14 bg-[#e9edc9] animate-pulse rounded" /></td>
      <td className="px-2 py-1.5"><div className="h-3 w-8  bg-[#e9edc9] animate-pulse rounded" /></td>
      <td className="px-2 py-1.5"><div className="h-3 w-8  bg-[#e9edc9] animate-pulse rounded" /></td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ScreenerClient() {
  // Static ticker list — loaded once per universe switch (no Finnhub)
  const [tickerList,   setTickerList]   = useState<ScreenerTicker[]>([]);
  const [listLoading,  setListLoading]  = useState(true);
  const [listError,    setListError]    = useState(false);
  const [generatedAt,  setGeneratedAt]  = useState<string | null>(null);

  // Live quote map — populated page-by-page from /api/screener/quotes
  const [quotes,       setQuotes]       = useState<Map<string, QuoteRow>>(new Map());
  const [loadedUpTo,   setLoadedUpTo]   = useState(0);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [fetchedAt,    setFetchedAt]    = useState<string | null>(null);

  const [filters,    setFilters]    = useState<Filters>(defaultFilters);
  const [sortField,  setSortField]  = useState<SortField>("momentumScore");
  const [sortDir,    setSortDir]    = useState<SortDir>("desc");
  const [showFilters, setShowFilters] = useState(true);

  const [metrics,       setMetrics]       = useState<Map<string, MetricsRow>>(new Map());
  const [metricsLoading, setMetricsLoading] = useState(false);

  // ── Load ticker list (static, fast) ─────────────────────────────────────────

  const loadTickerList = useCallback((universe: Universe) => {
    setListLoading(true);
    setListError(false);
    setTickerList([]);
    setQuotes(new Map());
    setLoadedUpTo(0);
    setFetchedAt(null);

    fetch(`/api/screener?universe=${universe}`)
      .then(r => r.json())
      .then((d: { tickers?: ScreenerTicker[]; generatedAt?: string }) => {
        setTickerList(d.tickers ?? []);
        setGeneratedAt(d.generatedAt ?? null);
      })
      .catch(() => setListError(true))
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    loadTickerList(filters.universe);
  }, [filters.universe, loadTickerList]);

  // ── Auto-load first page of quotes once ticker list arrives ──────────────────

  useEffect(() => {
    if (tickerList.length === 0 || loadedUpTo > 0) return;
    void loadMoreQuotes(tickerList, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerList]);

  // ── Load next page of quotes ──────────────────────────────────────────────────

  const loadMoreQuotes = useCallback(async (list: ScreenerTicker[], from: number) => {
    const batch = list.slice(from, from + PAGE_SIZE);
    if (batch.length === 0) return;

    setQuotesLoading(true);
    try {
      const params = batch.map(t => t.ticker).join(",");
      const res = await fetch(`/api/screener/quotes?tickers=${encodeURIComponent(params)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { rows?: QuoteRow[]; fetchedAt?: string };
      setQuotes(prev => {
        const next = new Map(prev);
        for (const row of data.rows ?? []) next.set(row.ticker, row);
        return next;
      });
      setFetchedAt(data.fetchedAt ?? null);
      setLoadedUpTo(from + batch.length);
    } finally {
      setQuotesLoading(false);
    }
  }, []);

  function handleLoadMore() {
    void loadMoreQuotes(tickerList, loadedUpTo);
  }

  // ── Derived display data ──────────────────────────────────────────────────────

  // Loaded rows = tickers we have a quote for
  const loadedRows = useMemo<QuoteRow[]>(() => {
    const out: QuoteRow[] = [];
    for (let i = 0; i < loadedUpTo; i++) {
      const t = tickerList[i];
      if (!t) continue;
      const q = quotes.get(t.ticker);
      if (q) out.push(q);
    }
    return out;
  }, [tickerList, quotes, loadedUpTo]);

  // Pending rows = requested but no quote returned (filtered out by Finnhub as c=0)
  const pendingCount = Math.max(0, loadedUpTo - quotes.size);

  const filtered = useMemo(
    () => applySort(applyFilters(loadedRows, metrics, filters), metrics, sortField, sortDir),
    [loadedRows, metrics, filters, sortField, sortDir]
  );

  const hasMore = loadedUpTo < tickerList.length;
  const hasMetrics = metrics.size > 0;
  const hasMetricsFilters = filters.minPE !== "" || filters.maxPE !== "" ||
                            filters.minBeta !== "" || filters.maxBeta !== "";

  // ── Sort ──────────────────────────────────────────────────────────────────────

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  // ── Sector filter ─────────────────────────────────────────────────────────────

  function toggleSector(s: string) {
    setFilters(f => {
      const next = new Set(f.sectors);
      if (next.has(s)) next.delete(s); else next.add(s);
      return { ...f, sectors: next };
    });
  }

  function setFilter<K extends keyof Omit<Filters, "sectors" | "universe">>(
    key: K, val: Filters[K]
  ) {
    setFilters(f => ({ ...f, [key]: val }));
  }

  // ── Metrics (optional) ────────────────────────────────────────────────────────

  async function loadMetrics() {
    setMetricsLoading(true);
    const tickers = filtered.slice(0, 40).map(r => r.ticker);
    try {
      const res  = await fetch("/api/screener/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers }),
      });
      const data = (await res.json()) as { metrics?: MetricsRow[] };
      setMetrics(prev => {
        const next = new Map(prev);
        for (const m of data.metrics ?? []) next.set(m.ticker, m);
        return next;
      });
    } catch {
      // leave metrics unchanged
    } finally {
      setMetricsLoading(false);
    }
  }

  // ── Timestamp display ─────────────────────────────────────────────────────────

  function fmtTime(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit",
      timeZone: "America/New_York",
      hour12: false,
    }) + " ET";
  }

  // ─── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest">Stock Screener</h1>
          {fetchedAt && (
            <p className="text-xs text-slate-500">
              Live quotes as of {fmtTime(fetchedAt)} · matches stock page · {quotes.size} loaded
            </p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowFilters(v => !v)}
            className="text-xs font-bold px-2 py-1 border border-slate-700 hover:bg-slate-900 hover:text-white transition-colors"
          >
            {showFilters ? "ซ่อนตัวกรอง" : "แสดงตัวกรอง"}
          </button>
          <button
            onClick={() => loadTickerList(filters.universe)}
            disabled={listLoading || quotesLoading}
            className="text-xs font-bold px-2 py-1 border border-slate-700 bg-[#faedcd] hover:bg-slate-900 hover:text-white transition-colors disabled:opacity-40"
          >
            {listLoading ? "..." : "รีเฟรช"}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="border border-[#ccd5ae] bg-[#faedcd] p-3 flex flex-col gap-3">

          {/* Universe */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 w-16">Universe</span>
            {(["SP500", "NASDAQ100", "CEO"] as const).map(u => (
              <button
                key={u}
                onClick={() => setFilters(f => ({ ...f, universe: u }))}
                className="text-xs font-bold px-2 py-0.5 border transition-colors"
                style={{
                  background:  filters.universe === u ? "#1F1A14" : "#fefae0",
                  color:       filters.universe === u ? "#fff" : "#1F1A14",
                  borderColor: "#1F1A14",
                }}
              >
                {u}
              </button>
            ))}
          </div>

          {/* Sector */}
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 w-16 pt-0.5">Sector</span>
            <div className="flex gap-1 flex-wrap">
              {ALL_SECTORS.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSector(s)}
                  className="text-xs font-bold px-1.5 py-0.5 border transition-colors"
                  style={{
                    background:  filters.sectors.has(s) ? "#1F1A14" : "#fefae0",
                    color:       filters.sectors.has(s) ? "#fff" : "#8A8378",
                    borderColor: "#D0C8B8",
                  }}
                >
                  {s}
                </button>
              ))}
              {filters.sectors.size > 0 && (
                <button
                  onClick={() => setFilters(f => ({ ...f, sectors: new Set() }))}
                  className="text-xs text-[#DC2626] hover:underline"
                >
                  ล้าง
                </button>
              )}
            </div>
          </div>

          {/* Cap size */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 w-16">Cap</span>
            {([
              { v: "ALL",   l: "ทั้งหมด" },
              { v: "SMALL", l: "Small <$300M" },
              { v: "MID",   l: "Mid $300M–$100B" },
              { v: "BIG",   l: "Big $100B+" },
            ] as const).map(({ v, l }) => (
              <button
                key={v}
                onClick={() => setFilter("capSize", v)}
                className="text-xs font-bold px-2 py-0.5 border transition-colors"
                style={{
                  background:  filters.capSize === v ? "#1F1A14" : "#fefae0",
                  color:       filters.capSize === v ? "#fff" : "#1F1A14",
                  borderColor: "#1F1A14",
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Numeric filters */}
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Change %</span>
              <div className="flex gap-1 items-center">
                <input type="number" step="0.5" placeholder="min" value={filters.minChange}
                  onChange={e => setFilter("minChange", e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-xs border border-slate-300 bg-[#faedcd] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8A2A]"
                  aria-label="Change minimum %" />
                <span className="text-xs text-slate-500">–</span>
                <input type="number" step="0.5" placeholder="max" value={filters.maxChange}
                  onChange={e => setFilter("maxChange", e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-xs border border-slate-300 bg-[#faedcd] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8A2A]"
                  aria-label="Change maximum %" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Score min</span>
              <input type="number" min="0" max="100" step="5" placeholder="0" value={filters.minScore}
                onChange={e => setFilter("minScore", e.target.value)}
                className="w-16 px-1.5 py-0.5 text-xs border border-slate-300 bg-[#faedcd] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8A2A]"
                aria-label="Minimum momentum score" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">P/E</span>
              <div className="flex gap-1 items-center">
                <input type="number" step="1" placeholder="min" value={filters.minPE}
                  onChange={e => setFilter("minPE", e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-xs border border-slate-300 bg-[#faedcd] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8A2A]"
                  aria-label="P/E minimum" />
                <span className="text-xs text-slate-500">–</span>
                <input type="number" step="1" placeholder="max" value={filters.maxPE}
                  onChange={e => setFilter("maxPE", e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-xs border border-slate-300 bg-[#faedcd] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8A2A]"
                  aria-label="P/E maximum" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Beta</span>
              <div className="flex gap-1 items-center">
                <input type="number" step="0.1" placeholder="min" value={filters.minBeta}
                  onChange={e => setFilter("minBeta", e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-xs border border-slate-300 bg-[#faedcd] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8A2A]"
                  aria-label="Beta minimum" />
                <span className="text-xs text-slate-500">–</span>
                <input type="number" step="0.1" placeholder="max" value={filters.maxBeta}
                  onChange={e => setFilter("maxBeta", e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-xs border border-slate-300 bg-[#faedcd] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8A2A]"
                  aria-label="Beta maximum" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1 border-t border-[#ccd5ae]">
            <button
              onClick={() => void loadMetrics()}
              disabled={metricsLoading || listLoading || filtered.length === 0}
              className="text-xs font-bold px-2 py-1 border border-[#5B8A2A] text-[#5B8A2A] hover:bg-[#5B8A2A] hover:text-white transition-colors disabled:opacity-40"
            >
              {metricsLoading ? "กำลังโหลด..." : hasMetrics ? "รีโหลด P/E & Beta" : "โหลด P/E & Beta (top 40)"}
            </button>
            {hasMetricsFilters && !hasMetrics && (
              <span className="text-xs text-[#D97706]">โหลด P/E & Beta ก่อนกรองด้วยค่าเหล่านี้</span>
            )}
          </div>
        </div>
      )}

      {/* Results summary */}
      <div className="flex items-center justify-between flex-wrap gap-1">
        <p className="text-xs text-slate-500">
          {listLoading
            ? "กำลังโหลด..."
            : `${filtered.length} ผลลัพธ์ จาก ${quotes.size} โหลดแล้ว · รวม ${tickerList.length} หุ้น`}
          {pendingCount > 0 && ` · ${pendingCount} ไม่มีข้อมูลราคา`}
        </p>
        {(filters.sectors.size > 0 || filters.capSize !== "ALL" || filters.minScore || filters.minChange || filters.maxChange) && (
          <button
            onClick={() => setFilters(defaultFilters())}
            className="text-xs text-[#DC2626] hover:underline"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        )}
      </div>

      {/* Error state */}
      {listError && (
        <div className="text-center py-10">
          <p className="text-sm text-slate-600">โหลดข้อมูลไม่สำเร็จ</p>
          <button
            onClick={() => loadTickerList(filters.universe)}
            className="mt-2 text-xs text-[#5B8A2A] hover:underline"
          >
            ลองอีกครั้ง
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {listLoading && !listError && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 bg-[#e9edc9] animate-pulse rounded" style={{ opacity: 1 - i * 0.1 }} />
          ))}
          <p className="text-xs text-slate-500 text-center">กำลังโหลดรายชื่อหุ้น...</p>
        </div>
      )}

      {/* Empty state after load */}
      {!listLoading && !listError && filtered.length === 0 && quotes.size > 0 && (
        <div className="text-center py-12">
          <p className="text-xs text-slate-500">ไม่พบหุ้นที่ตรงกับตัวกรอง</p>
          <button
            onClick={() => setFilters(defaultFilters())}
            className="mt-2 text-xs text-[#5B8A2A] hover:underline"
          >
            ล้างตัวกรอง
          </button>
        </div>
      )}

      {/* Table */}
      {!listLoading && !listError && (filtered.length > 0 || quotesLoading) && (
        <>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs border-collapse" style={{ minWidth: "640px" }}>
              <thead>
                <tr className="border-b-2 border-slate-700 bg-[#faedcd] text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-1.5 text-left w-8">#</th>
                  <SortHeader label="Ticker"  field="ticker"        current={sortField} dir={sortDir} onClick={toggleSort} />
                  <th className="px-2 py-1.5 text-left">Sector</th>
                  <SortHeader label="ราคา"    field="price"         current={sortField} dir={sortDir} onClick={toggleSort} />
                  <SortHeader label="% 1D"    field="change1D"      current={sortField} dir={sortDir} onClick={toggleSort} />
                  <SortHeader label="Mkt Cap" field="marketCap"     current={sortField} dir={sortDir} onClick={toggleSort} />
                  <SortHeader label="Score"   field="momentumScore" current={sortField} dir={sortDir} onClick={toggleSort} />
                  <SortHeader label="Quality" field="qualityScore"  current={sortField} dir={sortDir} onClick={toggleSort} />
                  {hasMetrics && (
                    <>
                      <SortHeader label="P/E"  field="pe"   current={sortField} dir={sortDir} onClick={toggleSort} />
                      <SortHeader label="Beta" field="beta" current={sortField} dir={sortDir} onClick={toggleSort} />
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => {
                  const m        = metrics.get(row.ticker);
                  const positive = row.change1D >= 0;
                  return (
                    <tr key={row.ticker} className="border-b border-[#ccd5ae] hover:bg-[#faedcd] transition-colors">
                      <td className="px-2 py-1.5 text-slate-500">{idx + 1}</td>
                      <td className="px-2 py-1.5">
                        <Link
                          href={`/stock/${row.ticker}`}
                          className="font-bold text-slate-900 hover:text-[#5B8A2A] transition-colors"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {row.ticker}
                        </Link>
                        <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{row.name}</p>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="text-xs font-bold px-1 py-0.5" style={{ background: "#e9edc9", color: "#8A8378" }}>
                          {row.sector}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                        ${row.price.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 font-bold" style={{ color: positive ? "#5B8A2A" : "#DC2626", fontFamily: "var(--font-mono)" }}>
                        {positive ? "+" : ""}{row.change1D.toFixed(2)}%
                      </td>
                      <td className="px-2 py-1.5 text-slate-500">{fmtCap(row.marketCap)}</td>
                      <td className="px-2 py-1.5">
                        <span className="font-bold" style={{ color: scoreColor(row.momentumScore) }}>
                          {row.momentumScore}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="font-bold" style={{ color: scoreColor(row.qualityScore) }}>
                          {row.qualityScore}
                        </span>
                      </td>
                      {hasMetrics && (
                        <>
                          <td className="px-2 py-1.5 text-slate-500">{m?.pe   != null ? m.pe.toFixed(1)   : "—"}</td>
                          <td className="px-2 py-1.5 text-slate-500">{m?.beta != null ? m.beta.toFixed(2) : "—"}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
                {/* Skeleton rows for the current loading page */}
                {quotesLoading && Array.from({ length: Math.min(PAGE_SIZE, tickerList.length - loadedUpTo) }).map((_, i) => (
                  <SkeletonRow key={`sk-${i}`} rank={filtered.length + i + 1} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Load more / progress */}
          <div className="flex flex-col items-center gap-1">
            {hasMore && !quotesLoading && (
              <button
                onClick={handleLoadMore}
                className="text-xs font-bold px-4 py-1.5 border border-slate-700 hover:bg-slate-900 hover:text-white transition-colors"
              >
                โหลดเพิ่ม {Math.min(PAGE_SIZE, tickerList.length - loadedUpTo)} หุ้น
                ({tickerList.length - loadedUpTo} เหลือ)
              </button>
            )}
            {quotesLoading && (
              <p className="text-xs text-slate-400">กำลังโหลดราคาจาก Finnhub…</p>
            )}
            {!hasMore && quotes.size > 0 && (
              <p className="text-xs text-slate-400">โหลดครบ {quotes.size} หุ้นแล้ว</p>
            )}
          </div>
        </>
      )}

      <p className="text-xs text-slate-400 text-center pb-4">
        รายชื่อหุ้นจาก catalog · ราคาจาก Finnhub · Sort ใช้งานได้กับหุ้นที่โหลดแล้ว · ไม่ใช่คำแนะนำการลงทุน
      </p>
    </div>
  );
}
