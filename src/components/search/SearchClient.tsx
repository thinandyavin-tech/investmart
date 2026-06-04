"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { StockDetailPanel } from "@/components/radar/StockDetailPanel";
import type { StockMetrics } from "@/lib/momentum";

interface QuoteData { c: number; pc: number; v: number; }

interface Suggestion {
  ticker:   string;
  name:     string;
  exchange: string;
  indices:  string[];
}

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

const RECENT_KEY = "recent_searches";
const MAX_RECENT = 5;

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[]; }
  catch { return []; }
}

function saveRecent(ticker: string): void {
  const prev = loadRecent().filter((t) => t !== ticker);
  localStorage.setItem(RECENT_KEY, JSON.stringify([ticker, ...prev].slice(0, MAX_RECENT)));
}

function ExchangeBadge({ exchange }: { exchange: string }) {
  const cls =
    exchange === "SET"    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" :
    exchange === "NASDAQ" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" :
    exchange === "NYSE"   ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300" :
                            "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400";
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${cls} flex-shrink-0`}>
      {exchange}
    </span>
  );
}

export function SearchClient() {
  const router                           = useRouter();
  const [query, setQuery]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [stock, setStock]               = useState<StockMetrics | null>(null);
  const [error, setError]               = useState("");
  const [suggestions, setSuggestions]   = useState<Suggestion[]>([]);
  const [showSugg, setShowSugg]         = useState(false);
  const [suggLoading, setSuggLoading]   = useState(false);
  const [activeIdx, setActiveIdx]       = useState(-1);
  const [recent, setRecent]             = useState<string[]>([]);
  const inputRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef     = useRef<HTMLUListElement>(null);

  const debouncedQuery = useDebounce(query, 180);

  useEffect(() => { setRecent(loadRecent()); }, []);

  useEffect(() => {
    setActiveIdx(-1);
    if (debouncedQuery.length < 1) {
      setSuggestions([]);
      setShowSugg(false);
      return;
    }
    setSuggLoading(true);
    fetch(`/api/search/suggest?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((d: { results?: Suggestion[] }) => {
        setSuggestions(d.results ?? []);
        setShowSugg(true);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setSuggLoading(false));
  }, [debouncedQuery]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSugg(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openStock = useCallback(async (ticker: string) => {
    const t = ticker.toUpperCase().trim();
    if (!t) return;
    setQuery(t);
    setShowSugg(false);
    setLoading(true);
    setError("");
    setStock(null);
    saveRecent(t);
    setRecent(loadRecent());

    try {
      const [quoteRes, profileRes] = await Promise.all([
        fetch(`/api/stock/quote?symbol=${encodeURIComponent(t)}`),
        fetch(`/api/stock/profile?symbol=${encodeURIComponent(t)}`),
      ]);
      const quote   = (await quoteRes.json())   as QuoteData;
      const profRes = (await profileRes.json()) as {
        profile?: { name?: string; exchange?: string; marketCapitalization?: number };
      };

      if (!quote.c) { setError(`ไม่พบหุ้น ${t}`); return; }

      const change1D = quote.pc > 0 ? ((quote.c - quote.pc) / quote.pc) * 100 : 0;
      setStock({
        ticker: t,
        price: quote.c,
        change1D,
        volume:      quote.v,
        avgVolume:   quote.v * 0.5,
        marketCap:   (profRes.profile?.marketCapitalization ?? 0) * 1_000_000,
        rsi:         50,
        volumeSurge: 1,
        sector:      "Other",
        isNew:       false,
        breakoutScore: 50,
        qualityScore:  50,
        momentumScore: 50,
        category:    "TOP100",
        companyName: profRes.profile?.name ?? t,
        exchange:    profRes.profile?.exchange ?? "US",
      });
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const active = activeIdx >= 0 ? suggestions[activeIdx] : suggestions[0];
    if (active) {
      void openStock(active.ticker);
    } else {
      void openStock(query.toUpperCase().trim());
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSugg || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setShowSugg(false);
      setActiveIdx(-1);
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      void openStock(suggestions[activeIdx].ticker);
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const showDropdown = showSugg && (suggestions.length > 0 || (query.length === 0 && recent.length > 0));

  return (
    <div className="p-4 max-w-lg mx-auto w-full overflow-x-hidden">
      <h1 className="text-xs font-bold uppercase tracking-widest mb-3 dark:text-slate-300">ค้นหาหุ้น</h1>

      <div ref={containerRef} className="relative mb-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSugg(true); }}
              onFocus={() => setShowSugg(true)}
              onKeyDown={handleKeyDown}
              placeholder="เช่น Apple, AAPL, PTT.BK, KBANK..."
              maxLength={40}
              autoComplete="off"
              spellCheck={false}
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 transition"
              aria-label="ค้นหาหุ้นด้วยชื่อบริษัทหรือ ticker"
              aria-autocomplete="list"
              aria-controls="search-suggestions"
              aria-activedescendant={activeIdx >= 0 ? `sugg-${activeIdx}` : undefined}
              aria-expanded={showDropdown}
            />
            {suggLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 dark:text-slate-500">
                ●
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm disabled:opacity-40 transition"
          >
            {loading ? "…" : "ค้นหา"}
          </button>
        </form>

        {/* Suggestions dropdown */}
        {showDropdown && (
          <ul
            id="search-suggestions"
            ref={listRef}
            role="listbox"
            aria-label="ผลการค้นหา"
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto"
          >
            {query.length === 0 && recent.length > 0 && (
              <li className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                ค้นหาล่าสุด
              </li>
            )}
            {(query.length === 0 ? recent.map((t) => ({ ticker: t, name: t, exchange: "", indices: [] as string[] })) : suggestions).map((s, i) => (
              <li
                key={s.ticker}
                id={`sugg-${i}`}
                role="option"
                aria-selected={i === activeIdx}
              >
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); void openStock(s.ticker); }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    i === activeIdx
                      ? "bg-emerald-50 dark:bg-emerald-900/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 w-16 flex-shrink-0 truncate">
                    {s.ticker}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1 min-w-0">
                    {s.name !== s.ticker ? s.name : ""}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {s.exchange && <ExchangeBadge exchange={s.exchange} />}
                    <button
                      type="button"
                      onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); router.push(`/compare?tickers=${s.ticker}`); }}
                      className="text-[9px] text-violet-500 dark:text-violet-400 hover:underline"
                      aria-label={`เทียบหุ้น ${s.ticker}`}
                      tabIndex={-1}
                    >
                      เทียบ
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); router.push(`/stock/${s.ticker}`); }}
                      className="text-[9px] text-emerald-600 dark:text-emerald-400 hover:underline"
                      aria-label={`เปิดหน้าหุ้น ${s.ticker}`}
                      tabIndex={-1}
                    >
                      →
                    </button>
                  </div>
                </button>
              </li>
            ))}
            {query.length > 0 && suggestions.length === 0 && !suggLoading && (
              <li className="px-3 py-3 text-xs text-slate-400 dark:text-slate-500 text-center">
                ไม่พบหุ้นที่ตรงกัน
              </li>
            )}
          </ul>
        )}
      </div>

      {error && (
        <Card className="p-3 mb-4">
          <p className="text-xs text-red-500">{error}</p>
        </Card>
      )}

      {stock && <StockDetailPanel stock={stock} timeframe="1M" />}
    </div>
  );
}
