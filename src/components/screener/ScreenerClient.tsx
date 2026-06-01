"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ALL_SECTORS } from "@/lib/stockUniverse";
import type { ScreenerRow } from "@/app/api/screener/route";
import type { MetricsRow } from "@/app/api/screener/metrics/route";
import type { Universe } from "@/lib/stockUniverse";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField = "ticker" | "change1D" | "price" | "marketCap" | "momentumScore" | "qualityScore" | "pe" | "beta";
type SortDir   = "asc" | "desc";
type CapSize   = "ALL" | "SMALL" | "MID" | "BIG";

const CAP_SMALL = 300_000_000;
const CAP_MID   = 100_000_000_000;

interface Filters {
  universe:     Universe;
  sectors:      Set<string>;
  capSize:      CapSize;
  minChange:    string;
  maxChange:    string;
  minScore:     string;
  minPE:        string;
  maxPE:        string;
  minBeta:      string;
  maxBeta:      string;
}

function defaultFilters(): Filters {
  return {
    universe: "SP500",
    sectors:  new Set<string>(),
    capSize:  "ALL",
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

// ─── Filter/Sort logic ────────────────────────────────────────────────────────

function applyFilters(
  rows:    ScreenerRow[],
  metrics: Map<string, MetricsRow>,
  f:       Filters
): ScreenerRow[] {
  const minCh   = f.minChange !== "" ? parseFloat(f.minChange) : -Infinity;
  const maxCh   = f.maxChange !== "" ? parseFloat(f.maxChange) :  Infinity;
  const minSc   = f.minScore  !== "" ? parseInt(f.minScore, 10) : 0;
  const minPE   = f.minPE     !== "" ? parseFloat(f.minPE)   : -Infinity;
  const maxPE   = f.maxPE     !== "" ? parseFloat(f.maxPE)   :  Infinity;
  const minBeta = f.minBeta   !== "" ? parseFloat(f.minBeta) : -Infinity;
  const maxBeta = f.maxBeta   !== "" ? parseFloat(f.maxBeta) :  Infinity;

  return rows.filter((r) => {
    if (f.sectors.size > 0 && !f.sectors.has(r.sector)) return false;
    if (f.capSize === "SMALL" && r.marketCap >= CAP_SMALL)               return false;
    if (f.capSize === "MID"   && (r.marketCap < CAP_SMALL || r.marketCap >= CAP_MID)) return false;
    if (f.capSize === "BIG"   && r.marketCap < CAP_MID)                  return false;
    if (r.change1D < minCh || r.change1D > maxCh)          return false;
    if (r.momentumScore < minSc)                            return false;

    const m = metrics.get(r.ticker);
    if (m) {
      if (m.pe   !== null && (m.pe   < minPE   || m.pe   > maxPE))   return false;
      if (m.beta !== null && (m.beta < minBeta || m.beta > maxBeta)) return false;
    }

    return true;
  });
}

function applySort(rows: ScreenerRow[], metrics: Map<string, MetricsRow>, field: SortField, dir: SortDir): ScreenerRow[] {
  const mult = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let av: number, bv: number;
    if (field === "pe" || field === "beta") {
      const am = metrics.get(a.ticker);
      const bm = metrics.get(b.ticker);
      av = (field === "pe" ? am?.pe : am?.beta) ?? -Infinity;
      bv = (field === "pe" ? bm?.pe : bm?.beta) ?? -Infinity;
    } else if (field === "ticker") {
      return mult * a.ticker.localeCompare(b.ticker);
    } else {
      av = a[field] as number;
      bv = b[field] as number;
    }
    return mult * (av - bv);
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortHeader({
  label, field, current, dir, onClick,
}: {
  label:   string;
  field:   SortField;
  current: SortField;
  dir:     SortDir;
  onClick: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <th
      className="px-2 py-1.5 text-left cursor-pointer select-none whitespace-nowrap hover:text-[#5B8A2A] transition-colors"
      onClick={() => onClick(field)}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}
      {active && <span className="ml-0.5 text-[8px]">{dir === "asc" ? "▲" : "▼"}</span>}
    </th>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ScreenerClient() {
  const [rows, setRows]         = useState<ScreenerRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [filters, setFilters]   = useState<Filters>(defaultFilters);
  const [sortField, setSortField] = useState<SortField>("momentumScore");
  const [sortDir, setSortDir]   = useState<SortDir>("desc");

  const [metrics, setMetrics]   = useState<Map<string, MetricsRow>>(new Map());
  const [metricsLoading, setMetricsLoading] = useState(false);

  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 50;

  const fetchRows = useCallback((universe: Universe) => {
    setLoading(true);
    fetch(`/api/screener?universe=${universe}`)
      .then((r) => r.json())
      .then((d: { rows?: ScreenerRow[]; scannedAt?: string; refreshing?: boolean }) => {
        setRows(d.rows ?? []);
        setScannedAt(d.scannedAt ?? null);
        setRefreshing(d.refreshing ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRows(filters.universe);
  }, [filters.universe, fetchRows]);

  const filtered = useMemo(
    () => applySort(applyFilters(rows, metrics, filters), metrics, sortField, sortDir),
    [rows, metrics, filters, sortField, sortDir]
  );

  const pageRows  = filtered.slice(0, page * PAGE_SIZE);
  const hasMore   = filtered.length > pageRows.length;

  const hasMetricsFilters = filters.minPE !== "" || filters.maxPE !== "" ||
                            filters.minBeta !== "" || filters.maxBeta !== "";

  async function loadMetrics() {
    setMetricsLoading(true);
    const tickers = filtered.slice(0, 40).map((r) => r.ticker);
    try {
      const res  = await fetch("/api/screener/metrics", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tickers }),
      });
      const data = (await res.json()) as { metrics?: MetricsRow[] };
      setMetrics((prev) => {
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

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  }

  function toggleSector(s: string) {
    setFilters((f) => {
      const next = new Set(f.sectors);
      if (next.has(s)) next.delete(s); else next.add(s);
      return { ...f, sectors: next };
    });
    setPage(1);
  }

  function setFilter<K extends keyof Omit<Filters, "sectors" | "universe">>(
    key: K, val: Filters[K]
  ) {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  }

  const hasMetrics = metrics.size > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest">Stock Screener</h1>
          {scannedAt && (
            <p className="text-[9px] text-[#8A8378]">
              {refreshing ? "กำลังอัพเดท..." : `อัพเดทเมื่อ ${new Date(scannedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`}
            </p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="text-[10px] font-bold px-2 py-1 border border-[#1F1A14] hover:bg-[#1F1A14] hover:text-white transition-colors"
          >
            {showFilters ? "ซ่อนตัวกรอง" : "แสดงตัวกรอง"}
          </button>
          <button
            onClick={() => fetchRows(filters.universe)}
            disabled={loading}
            className="text-[10px] font-bold px-2 py-1 border border-[#1F1A14] bg-[#F3EDE0] hover:bg-[#1F1A14] hover:text-white transition-colors disabled:opacity-40"
          >
            {loading ? "..." : "รีเฟรช"}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="border border-[#E8E2D4] bg-[#F8F5EF] p-3 flex flex-col gap-3">

          {/* Universe */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378] w-16">Universe</span>
            {(["SP500", "NASDAQ100", "CEO"] as const).map((u) => (
              <button
                key={u}
                onClick={() => { setFilters((f) => ({ ...f, universe: u })); setPage(1); }}
                className="text-[10px] font-bold px-2 py-0.5 border transition-colors"
                style={{
                  background:   filters.universe === u ? "#1F1A14" : "#FBF7ED",
                  color:        filters.universe === u ? "#fff" : "#1F1A14",
                  borderColor:  "#1F1A14",
                }}
              >
                {u}
              </button>
            ))}
          </div>

          {/* Sector */}
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378] w-16 pt-0.5">Sector</span>
            <div className="flex gap-1 flex-wrap">
              {ALL_SECTORS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSector(s)}
                  className="text-[9px] font-bold px-1.5 py-0.5 border transition-colors"
                  style={{
                    background:  filters.sectors.has(s) ? "#1F1A14" : "#FBF7ED",
                    color:       filters.sectors.has(s) ? "#fff" : "#8A8378",
                    borderColor: "#D0C8B8",
                  }}
                >
                  {s}
                </button>
              ))}
              {filters.sectors.size > 0 && (
                <button
                  onClick={() => { setFilters((f) => ({ ...f, sectors: new Set() })); setPage(1); }}
                  className="text-[9px] text-[#DC2626] hover:underline"
                >
                  ล้าง
                </button>
              )}
            </div>
          </div>

          {/* Cap size */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378] w-16">Cap</span>
            {([
              { v: "ALL", l: "ทั้งหมด" },
              { v: "SMALL", l: "Small <$300M" },
              { v: "MID",   l: "Mid $300M–$100B" },
              { v: "BIG",   l: "Big $100B+" },
            ] as const).map(({ v, l }) => (
              <button
                key={v}
                onClick={() => { setFilter("capSize", v); }}
                className="text-[10px] font-bold px-2 py-0.5 border transition-colors"
                style={{
                  background:  filters.capSize === v ? "#1F1A14" : "#FBF7ED",
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
            {/* Change % */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378]">Change %</span>
              <div className="flex gap-1 items-center">
                <input
                  type="number" step="0.5"
                  placeholder="min"
                  value={filters.minChange}
                  onChange={(e) => setFilter("minChange", e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-[10px] border border-[#D0C8B8] bg-[#FBF7ED] outline-none focus:border-[#5B8A2A]"
                  aria-label="Change minimum %"
                />
                <span className="text-[9px] text-[#8A8378]">–</span>
                <input
                  type="number" step="0.5"
                  placeholder="max"
                  value={filters.maxChange}
                  onChange={(e) => setFilter("maxChange", e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-[10px] border border-[#D0C8B8] bg-[#FBF7ED] outline-none focus:border-[#5B8A2A]"
                  aria-label="Change maximum %"
                />
              </div>
            </div>

            {/* Min score */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378]">Score min</span>
              <input
                type="number" min="0" max="100" step="5"
                placeholder="0"
                value={filters.minScore}
                onChange={(e) => setFilter("minScore", e.target.value)}
                className="w-16 px-1.5 py-0.5 text-[10px] border border-[#D0C8B8] bg-[#FBF7ED] outline-none focus:border-[#5B8A2A]"
                aria-label="Minimum momentum score"
              />
            </div>

            {/* P/E */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378]">P/E</span>
              <div className="flex gap-1 items-center">
                <input
                  type="number" step="1"
                  placeholder="min"
                  value={filters.minPE}
                  onChange={(e) => setFilter("minPE", e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-[10px] border border-[#D0C8B8] bg-[#FBF7ED] outline-none focus:border-[#5B8A2A]"
                  aria-label="P/E minimum"
                />
                <span className="text-[9px] text-[#8A8378]">–</span>
                <input
                  type="number" step="1"
                  placeholder="max"
                  value={filters.maxPE}
                  onChange={(e) => setFilter("maxPE", e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-[10px] border border-[#D0C8B8] bg-[#FBF7ED] outline-none focus:border-[#5B8A2A]"
                  aria-label="P/E maximum"
                />
              </div>
            </div>

            {/* Beta */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378]">Beta</span>
              <div className="flex gap-1 items-center">
                <input
                  type="number" step="0.1"
                  placeholder="min"
                  value={filters.minBeta}
                  onChange={(e) => setFilter("minBeta", e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-[10px] border border-[#D0C8B8] bg-[#FBF7ED] outline-none focus:border-[#5B8A2A]"
                  aria-label="Beta minimum"
                />
                <span className="text-[9px] text-[#8A8378]">–</span>
                <input
                  type="number" step="0.1"
                  placeholder="max"
                  value={filters.maxBeta}
                  onChange={(e) => setFilter("maxBeta", e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-[10px] border border-[#D0C8B8] bg-[#FBF7ED] outline-none focus:border-[#5B8A2A]"
                  aria-label="Beta maximum"
                />
              </div>
            </div>
          </div>

          {/* Metrics load */}
          <div className="flex items-center gap-3 pt-1 border-t border-[#E8E2D4]">
            <button
              onClick={() => void loadMetrics()}
              disabled={metricsLoading || loading}
              className="text-[10px] font-bold px-2 py-1 border border-[#5B8A2A] text-[#5B8A2A] hover:bg-[#5B8A2A] hover:text-white transition-colors disabled:opacity-40"
            >
              {metricsLoading ? "กำลังโหลด..." : hasMetrics ? "รีโหลด P/E & Beta" : "โหลด P/E & Beta (top 40)"}
            </button>
            {hasMetricsFilters && !hasMetrics && (
              <span className="text-[9px] text-[#D97706]">โหลด P/E & Beta ก่อนกรองด้วยค่าเหล่านี้</span>
            )}
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-[#8A8378]">
          {loading ? "กำลังสแกน..." : `${filtered.length.toLocaleString()} หุ้น จาก ${rows.length.toLocaleString()}`}
        </p>
        {filters.sectors.size > 0 || filters.capSize !== "ALL" || filters.minScore || filters.minChange || filters.maxChange ? (
          <button
            onClick={() => { setFilters(defaultFilters()); setPage(1); }}
            className="text-[9px] text-[#DC2626] hover:underline"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        ) : null}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 bg-[#E8E2D4] animate-pulse rounded" style={{ opacity: 1 - i * 0.1 }} />
          ))}
          <p className="text-[9px] text-[#8A8378] text-center">กำลังดึงข้อมูลจาก Finnhub (~10 วินาที)</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xs text-[#8A8378]">ไม่พบหุ้นที่ตรงกับตัวกรอง</p>
          <button
            onClick={() => { setFilters(defaultFilters()); setPage(1); }}
            className="mt-2 text-[10px] text-[#5B8A2A] hover:underline"
          >
            ล้างตัวกรอง
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-[10px] border-collapse" style={{ minWidth: "640px" }}>
              <thead>
                <tr className="border-b-2 border-[#1F1A14] bg-[#F3EDE0] text-[9px] font-bold uppercase tracking-wide text-[#8A8378]">
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
                      <SortHeader label="P/E" field="pe"   current={sortField} dir={sortDir} onClick={toggleSort} />
                      <SortHeader label="Beta" field="beta" current={sortField} dir={sortDir} onClick={toggleSort} />
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, idx) => {
                  const m        = metrics.get(row.ticker);
                  const positive = row.change1D >= 0;
                  return (
                    <tr
                      key={row.ticker}
                      className="border-b border-[#E8E2D4] hover:bg-[#F3EDE0] transition-colors"
                    >
                      <td className="px-2 py-1.5 text-[#8A8378]">{idx + 1}</td>
                      <td className="px-2 py-1.5">
                        <Link
                          href={`/stock/${row.ticker}`}
                          className="font-bold text-[#1F1A14] hover:text-[#5B8A2A] transition-colors"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {row.ticker}
                        </Link>
                      </td>
                      <td className="px-2 py-1.5">
                        <span
                          className="text-[8px] font-bold px-1 py-0.5"
                          style={{ background: "#E8E2D4", color: "#8A8378" }}
                        >
                          {row.sector}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                        ${row.price.toFixed(2)}
                      </td>
                      <td
                        className="px-2 py-1.5 font-bold"
                        style={{ color: positive ? "#5B8A2A" : "#DC2626", fontFamily: "var(--font-mono)" }}
                      >
                        {positive ? "+" : ""}{row.change1D.toFixed(2)}%
                      </td>
                      <td className="px-2 py-1.5 text-[#8A8378]">{fmtCap(row.marketCap)}</td>
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
                          <td className="px-2 py-1.5 text-[#8A8378]">
                            {m?.pe   != null ? m.pe.toFixed(1)   : "—"}
                          </td>
                          <td className="px-2 py-1.5 text-[#8A8378]">
                            {m?.beta != null ? m.beta.toFixed(2) : "—"}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="self-center text-[10px] font-bold px-4 py-1.5 border border-[#1F1A14] hover:bg-[#1F1A14] hover:text-white transition-colors"
            >
              โหลดเพิ่ม ({filtered.length - pageRows.length} รายการ)
            </button>
          )}
        </>
      )}

      <p className="text-[9px] text-[#8A8378] text-center pb-4">
        ข้อมูลราคาจาก Finnhub · จำลองเท่านั้น · ไม่ใช่คำแนะนำการลงทุน
      </p>
    </div>
  );
}
