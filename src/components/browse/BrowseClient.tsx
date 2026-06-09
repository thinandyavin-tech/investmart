"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CATALOG,
  getByIndex,
  getBySector,
  INDEX_LABELS,
  SECTOR_LABELS,
  ALL_SECTOR_KEYS,
  CATALOG_SIZE,
  type CatalogEntry,
} from "@/lib/stockCatalog";
import { SET50_TICKERS } from "@/lib/stockUniverse";
import { STOCK_INFO } from "@/lib/stockNames";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "index" | "sector";

const INDEX_TABS = Object.entries(INDEX_LABELS).concat([["SET50", "Thailand SET50"]]);

// ─── Stock card (no price — just browse metadata) ─────────────────────────────

function StockCard({ entry }: { entry: CatalogEntry }) {
  const badgeColor: Record<string, string> = {
    Tech: "bg-violet-100 text-violet-700",
    Finance: "bg-blue-100 text-blue-700",
    Health: "bg-green-100 text-green-700",
    Consumer: "bg-orange-100 text-orange-700",
    Staples: "bg-yellow-100 text-yellow-800",
    Comm: "bg-pink-100 text-pink-700",
    Energy: "bg-amber-100 text-amber-800",
    Indust: "bg-slate-100 text-slate-700",
    Matls: "bg-stone-100 text-stone-700",
    RealEst: "bg-teal-100 text-teal-700",
    Utility: "bg-cyan-100 text-cyan-700",
    ETF: "bg-indigo-100 text-indigo-700",
  };
  const badge = badgeColor[entry.sector] ?? "bg-slate-100 text-slate-600";

  return (
    <Link
      href={`/stock/${entry.ticker}`}
      className="flex items-start gap-2 p-2.5 rounded-xl bg-white/60 border border-white/40 hover:bg-white/80 hover:border-violet-200 transition-all group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-bold font-mono text-slate-900 group-hover:text-violet-700 transition-colors">
            {entry.ticker}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge}`}>
            {SECTOR_LABELS[entry.sector] ?? entry.sector}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-none">
          {entry.name}
        </p>
      </div>
      <span className="text-[10px] text-slate-400 flex-shrink-0">{entry.exchange}</span>
    </Link>
  );
}

// For SET50 (not in catalog)
function SetCard({ ticker }: { ticker: string }) {
  const info = STOCK_INFO[ticker];
  return (
    <Link
      href={`/stock/${ticker}`}
      className="flex items-start gap-2 p-2.5 rounded-xl bg-white/60 border border-white/40 hover:bg-white/80 hover:border-violet-200 transition-all group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-bold font-mono text-slate-900 group-hover:text-violet-700 transition-colors">
            {ticker}
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
            Thailand SET
          </span>
        </div>
        <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-none">
          {info?.name ?? ticker}
        </p>
      </div>
      <span className="text-[10px] text-slate-400 flex-shrink-0">SET</span>
    </Link>
  );
}

// ─── Main browse client ────────────────────────────────────────────────────────

export function BrowseClient() {
  const [tab,          setTab]          = useState<Tab>("index");
  const [activeIndex,  setActiveIndex]  = useState("SP500");
  const [activeSector, setActiveSector] = useState("Tech");
  const [search,       setSearch]       = useState("");

  const currentEntries: CatalogEntry[] = useMemo(() => {
    if (tab === "index") {
      return activeIndex === "SET50" ? [] : getByIndex(activeIndex);
    }
    return getBySector(activeSector);
  }, [tab, activeIndex, activeSector]);

  const filtered = useMemo(() => {
    if (!search.trim()) return currentEntries;
    const upper = search.toUpperCase();
    return currentEntries.filter(e =>
      e.ticker.includes(upper) || e.name.toUpperCase().includes(upper)
    );
  }, [currentEntries, search]);

  const isSet50 = tab === "index" && activeIndex === "SET50";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-sm font-bold uppercase tracking-widest text-slate-800 mb-1">
          Browse Stocks — เรียกดูหุ้นทั้งหมด
        </h1>
        <p className="text-xs text-slate-500">
          {CATALOG_SIZE.toLocaleString()} รายการ · S&P 500, Nasdaq 100, Dow 30, ETFs, ADRs, SET50
          · กดดูรายละเอียดหุ้นและราคาจริงได้เลย
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("index")}
          className={`text-xs font-bold px-4 py-2 rounded-xl border transition-colors ${
            tab === "index"
              ? "bg-violet-600 text-white border-violet-600"
              : "border-slate-200 text-slate-600 hover:border-violet-300"
          }`}
        >
          ตาม Index
        </button>
        <button
          onClick={() => setTab("sector")}
          className={`text-xs font-bold px-4 py-2 rounded-xl border transition-colors ${
            tab === "sector"
              ? "bg-violet-600 text-white border-violet-600"
              : "border-slate-200 text-slate-600 hover:border-violet-300"
          }`}
        >
          ตาม Sector
        </button>
      </div>

      <div className="flex gap-4">
        {/* Left: sub-tab selector */}
        <aside className="w-44 flex-shrink-0 space-y-1">
          {tab === "index" ? (
            INDEX_TABS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveIndex(key)}
                className={`w-full text-left text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                  activeIndex === key
                    ? "bg-violet-100 text-violet-800"
                    : "text-slate-600 hover:bg-white/60"
                }`}
              >
                {label}
                {key !== "SET50" && (
                  <span className="ml-1 text-slate-400 font-normal">
                    ({key === "SET50" ? SET50_TICKERS.length : getByIndex(key).length})
                  </span>
                )}
              </button>
            ))
          ) : (
            ALL_SECTOR_KEYS.map(key => (
              <button
                key={key}
                onClick={() => setActiveSector(key)}
                className={`w-full text-left text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                  activeSector === key
                    ? "bg-violet-100 text-violet-800"
                    : "text-slate-600 hover:bg-white/60"
                }`}
              >
                {SECTOR_LABELS[key]}
                <span className="ml-1 text-slate-400 font-normal">({getBySector(key).length})</span>
              </button>
            ))
          )}
        </aside>

        {/* Right: stock grid */}
        <section className="flex-1 min-w-0">
          {/* Search within current view */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value.toUpperCase())}
            placeholder="กรองในหมวดนี้..."
            className="w-full mb-3 border border-slate-200 bg-white/70 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-400"
          />

          {isSet50 ? (
            <>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                ⚠️ หุ้น SET50 ต้องการ Finnhub Growth/Premium plan สำหรับราคาจริง · ฟรีเทียร์ไม่รองรับ SET
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {SET50_TICKERS.map(t => <SetCard key={t} ticker={t} />)}
              </div>
            </>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">ไม่พบรายการ</p>
          ) : (
            <>
              <p className="text-xs text-slate-400 mb-2">{filtered.length} รายการ</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {filtered.map(e => <StockCard key={e.ticker} entry={e} />)}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Data note */}
      <p className="text-xs text-slate-400 text-center pt-2">
        Catalog ฟรี · ราคาจริงโหลดเมื่อเปิดหน้าหุ้น · SET50 ต้องการ Finnhub paid plan
      </p>
    </div>
  );
}
