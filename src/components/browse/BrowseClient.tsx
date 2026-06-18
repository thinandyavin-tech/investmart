"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { StockLogo } from "@/components/StockLogo";
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

// ── Palette constants ─────────────────────────────────────────────────────────

const P = {
  bg:        "#fefae0",
  card:      "#faedcd",
  hover:     "#e9edc9",
  border:    "#ccd5ae",
  shadow:    "#d4a373",
  text:      "#1A1A1A",
  muted:     "#8A8378",
  accent:    "#8B5CF6",
} as const;

// Sector → subtle colour
const SECTOR_STYLE: Record<string, { bg: string; text: string }> = {
  Tech:    { bg: "#EDE9FE", text: "#5B21B6" },
  Finance: { bg: "#DBEAFE", text: "#1D4ED8" },
  Health:  { bg: "#DCFCE7", text: "#166534" },
  Consumer:{ bg: "#FEF3C7", text: "#B45309" },
  Staples: { bg: "#FEF9C3", text: "#854D0E" },
  Comm:    { bg: "#FCE7F3", text: "#9D174D" },
  Energy:  { bg: "#FEF3C7", text: "#92400E" },
  Indust:  { bg: "#e9edc9", text: "#3D3730" },
  Matls:   { bg: "#FEF2F2", text: "#991B1B" },
  RealEst: { bg: "#CCFBF1", text: "#0F766E" },
  Utility: { bg: "#E0F2FE", text: "#0369A1" },
  ETF:     { bg: "#EDE9FE", text: "#4338CA" },
};

type Tab = "index" | "sector";
const INDEX_TABS = Object.entries(INDEX_LABELS).concat([["SET50", "Thailand SET50"]]);

// ── Stock card ────────────────────────────────────────────────────────────────

function StockCard({ entry }: { entry: CatalogEntry }) {
  const s = SECTOR_STYLE[entry.sector] ?? { bg: "#e9edc9", text: "#3D3730" };
  return (
    <Link
      href={`/stock/${entry.ticker}`}
      className="flex items-center gap-2.5 px-3 py-2.5 transition-colors"
      style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8 }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = P.hover)}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = P.card)}
    >
      <StockLogo ticker={entry.ticker} name={entry.name} size={32} radius={6} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold" style={{ fontFamily: "var(--font-mono)", color: P.text }}>
            {entry.ticker}
          </span>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 flex-shrink-0"
            style={{ background: s.bg, color: s.text, borderRadius: 4 }}
          >
            {SECTOR_LABELS[entry.sector] ?? entry.sector}
          </span>
        </div>
        <p className="text-[10px] truncate mt-0.5" style={{ color: P.muted }}>
          {entry.name}
        </p>
      </div>
      <span className="text-[9px] font-bold flex-shrink-0" style={{ color: P.muted }}>{entry.exchange}</span>
    </Link>
  );
}

function SetCard({ ticker }: { ticker: string }) {
  const info = STOCK_INFO[ticker];
  return (
    <Link
      href={`/stock/${ticker}`}
      className="flex items-center gap-2.5 px-3 py-2.5 transition-colors"
      style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8 }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = P.hover)}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = P.card)}
    >
      <StockLogo ticker={ticker} name={info?.name ?? ticker} size={32} radius={6} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold" style={{ fontFamily: "var(--font-mono)", color: P.text }}>{ticker}</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 flex-shrink-0" style={{ background: "#FEF3C7", color: "#B45309", borderRadius: 4 }}>
            SET50
          </span>
        </div>
        <p className="text-[10px] truncate mt-0.5" style={{ color: P.muted }}>{info?.name ?? ticker}</p>
      </div>
      <span className="text-[9px] font-bold flex-shrink-0" style={{ color: P.muted }}>SET</span>
    </Link>
  );
}

// ── Pill tab (used in horizontal scroll strip) ────────────────────────────────

function Pill({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 text-xs font-bold px-3 py-1.5 transition-colors whitespace-nowrap"
      style={{
        background:  active ? P.text   : P.card,
        color:       active ? "#fff"   : P.muted,
        border:      `1px solid ${active ? P.text : P.border}`,
        borderRadius: 20,
      }}
    >
      {label}{count !== undefined && <span className="ml-1 opacity-60">({count})</span>}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function BrowseClient() {
  const [tab,          setTab]          = useState<Tab>("index");
  const [activeIndex,  setActiveIndex]  = useState("SP500");
  const [activeSector, setActiveSector] = useState("Tech");
  const [search,       setSearch]       = useState("");

  const currentEntries: CatalogEntry[] = useMemo(() => {
    if (tab === "index") return activeIndex === "SET50" ? [] : getByIndex(activeIndex);
    return getBySector(activeSector);
  }, [tab, activeIndex, activeSector]);

  const filtered = useMemo(() => {
    if (!search.trim()) return currentEntries;
    const upper = search.toUpperCase();
    return currentEntries.filter(e => e.ticker.includes(upper) || e.name.toUpperCase().includes(upper));
  }, [currentEntries, search]);

  const isSet50 = tab === "index" && activeIndex === "SET50";

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 flex flex-col gap-4">

      {/* ── Header ── */}
      <div>
        <h1 className="text-sm font-bold uppercase tracking-widest mb-0.5" style={{ color: P.text }}>
          Browse Stocks — เรียกดูหุ้นทั้งหมด
        </h1>
        <p className="text-xs" style={{ color: P.muted }}>
          {CATALOG_SIZE.toLocaleString()} รายการ · S&P 500, Nasdaq 100, Dow 30, ETFs, ADRs, SET50
        </p>
      </div>

      {/* ── Main tab: Index vs Sector ── */}
      <div className="flex gap-2">
        {(["index", "sector"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="text-xs font-bold px-5 py-2 transition-colors"
            style={{
              background:  tab === t ? P.accent : P.card,
              color:       tab === t ? "#fff"   : P.muted,
              border:      `1px solid ${tab === t ? P.accent : P.border}`,
              borderRadius: 8,
              boxShadow:    tab === t ? `2px 2px 0 ${P.shadow}` : "none",
            }}
          >
            {t === "index" ? "ตาม Index" : "ตาม Sector"}
          </button>
        ))}
      </div>

      {/* ── Sub-tab: horizontal scroll strip (all screen sizes) ── */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {tab === "index"
          ? INDEX_TABS.map(([key, label]) => (
              <Pill
                key={key}
                label={label}
                count={key === "SET50" ? SET50_TICKERS.length : getByIndex(key).length}
                active={activeIndex === key}
                onClick={() => setActiveIndex(key)}
              />
            ))
          : ALL_SECTOR_KEYS.map(key => (
              <Pill
                key={key}
                label={SECTOR_LABELS[key] ?? key}
                count={getBySector(key).length}
                active={activeSector === key}
                onClick={() => setActiveSector(key)}
              />
            ))
        }
      </div>

      {/* ── Search within current view ── */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value.toUpperCase())}
        placeholder="กรองในหมวดนี้ ..."
        className="w-full px-3 py-2.5 text-xs focus:outline-none focus:ring-2 transition"
        style={{
          background: P.bg,
          border: `1.5px solid ${P.border}`,
          borderRadius: 8,
          color: P.text,
          fontFamily: "var(--font-mono)",
        }}
      />

      {/* ── Count label ── */}
      {!isSet50 && (
        <p className="text-xs" style={{ color: P.muted }}>
          {filtered.length} รายการ{search && ` · ค้นหา "${search}"`}
        </p>
      )}

      {/* ── SET50 notice ── */}
      {isSet50 && (
        <div className="px-3 py-2.5 text-xs" style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, color: "#B45309" }}>
          ⚠️ หุ้น SET50 ต้องการ Finnhub Growth/Premium plan สำหรับราคาจริง · ฟรีเทียร์ไม่รองรับ SET
        </div>
      )}

      {/* ── Stock list ── */}
      {isSet50 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SET50_TICKERS.map(t => <SetCard key={t} ticker={t} />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-center py-8" style={{ color: P.muted }}>ไม่พบรายการ</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map(e => <StockCard key={e.ticker} entry={e} />)}
        </div>
      )}

      {/* ── Footer note ── */}
      <p className="text-[10px] text-center" style={{ color: P.muted }}>
        Catalog ฟรี · ราคาจริงโหลดเมื่อเปิดหน้าหุ้น · SET50 ต้องการ Finnhub paid plan
      </p>
    </div>
  );
}
