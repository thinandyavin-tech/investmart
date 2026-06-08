"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
const MAX_RECENT = 8;

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[]; }
  catch { return []; }
}

function saveRecent(ticker: string): void {
  const prev = loadRecent().filter((t) => t !== ticker);
  localStorage.setItem(RECENT_KEY, JSON.stringify([ticker, ...prev].slice(0, MAX_RECENT)));
}

const POPULAR = [
  { ticker: "NVDA",  name: "NVIDIA",    change: null },
  { ticker: "AAPL",  name: "Apple",     change: null },
  { ticker: "TSLA",  name: "Tesla",     change: null },
  { ticker: "MSFT",  name: "Microsoft", change: null },
  { ticker: "META",  name: "Meta",      change: null },
  { ticker: "AMZN",  name: "Amazon",    change: null },
  { ticker: "GOOGL", name: "Alphabet",  change: null },
  { ticker: "AMD",   name: "AMD",       change: null },
  { ticker: "PLTR",  name: "Palantir",  change: null },
  { ticker: "NFLX",  name: "Netflix",   change: null },
  { ticker: "JPM",   name: "JPMorgan",  change: null },
  { ticker: "V",     name: "Visa",      change: null },
];

function ExchangeBadge({ exchange }: { exchange: string }) {
  const cls =
    exchange === "SET"    ? "bg-blue-100 text-blue-700" :
    exchange === "NASDAQ" ? "bg-violet-100 text-violet-700" :
    exchange === "NYSE"   ? "bg-orange-100 text-orange-700" :
                            "bg-slate-100 text-slate-500";
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cls} flex-shrink-0`}>
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

  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef      = useRef<HTMLUListElement>(null);

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
        ticker: t, price: quote.c, change1D,
        volume: quote.v, avgVolume: quote.v * 0.5,
        marketCap: (profRes.profile?.marketCapitalization ?? 0) * 1_000_000,
        rsi: 50, volumeSurge: 1, sector: "Other", isNew: false,
        breakoutScore: 50, qualityScore: 50, momentumScore: 50,
        category: "TOP100",
        companyName: profRes.profile?.name ?? t,
        exchange: profRes.profile?.exchange ?? "US",
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
    void openStock(active?.ticker ?? query.toUpperCase().trim());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSugg || suggestions.length === 0) return;
    if (e.key === "ArrowDown")  { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp")  { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Escape")   { setShowSugg(false); setActiveIdx(-1); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); void openStock(suggestions[activeIdx].ticker); }
  }

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    (listRef.current.children[activeIdx] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const showDropdown = showSugg && (suggestions.length > 0 || (query.length === 0 && recent.length > 0));

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto w-full">
      {/* Page title */}
      <h1 className="text-lg font-bold text-slate-800 mb-4">ค้นหาหุ้น</h1>

      {/* Search bar */}
      <div ref={containerRef} className="relative mb-6">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSugg(true); }}
              onFocus={() => setShowSugg(true)}
              onKeyDown={handleKeyDown}
              placeholder="ชื่อบริษัท หรือ ticker เช่น Apple, AAPL, NVDA..."
              maxLength={40}
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-white/70 backdrop-blur-md border border-white/40 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 transition shadow-sm"
              aria-label="ค้นหาหุ้น"
              aria-autocomplete="list"
              aria-controls="search-suggestions"
              aria-activedescendant={activeIdx >= 0 ? `sugg-${activeIdx}` : undefined}
              aria-expanded={showDropdown}
            />
            {suggLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-violet-400 animate-pulse">●</span>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition shadow-sm"
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
            className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white/90 backdrop-blur-md border border-white/40 rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto"
          >
            {query.length === 0 && recent.length > 0 && (
              <li className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                ค้นหาล่าสุด
              </li>
            )}
            {(query.length === 0
              ? recent.map((t) => ({ ticker: t, name: t, exchange: "", indices: [] as string[] }))
              : suggestions
            ).map((s, i) => (
              <li key={s.ticker} id={`sugg-${i}`} role="option" aria-selected={i === activeIdx}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); void openStock(s.ticker); }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === activeIdx ? "bg-violet-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="font-mono text-sm font-bold text-slate-900 w-20 flex-shrink-0">{s.ticker}</span>
                  <span className="text-sm text-slate-600 truncate flex-1">{s.name !== s.ticker ? s.name : ""}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {s.exchange && <ExchangeBadge exchange={s.exchange} />}
                    <span className="text-xs text-emerald-600 font-semibold">→</span>
                  </div>
                </button>
              </li>
            ))}
            {query.length > 0 && suggestions.length === 0 && !suggLoading && (
              <li className="px-4 py-4 text-sm text-slate-400 text-center">ไม่พบหุ้นที่ตรงกัน</li>
            )}
          </ul>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50/80 backdrop-blur-sm border border-red-200/60 rounded-xl">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Stock detail result */}
      {stock && (
        <div className="mb-6">
          <StockDetailPanel stock={stock} timeframe="1M" />
          <Link
            href={`/stock/${stock.ticker}`}
            className="mt-2 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition"
          >
            เปิดหน้าหุ้นเต็ม {stock.ticker} →
          </Link>
        </div>
      )}

      {/* Popular stocks grid — shown when no search active */}
      {!stock && !loading && query.length === 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">หุ้นยอดนิยม</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {POPULAR.map(({ ticker, name }) => (
              <button
                key={ticker}
                onClick={() => void openStock(ticker)}
                className="flex flex-col items-start gap-0.5 p-3 bg-white/60 backdrop-blur-md border border-white/30 rounded-xl hover:bg-white/80 hover:border-violet-300 transition-colors group text-left"
              >
                <span className="text-sm font-bold font-mono text-slate-900 group-hover:text-violet-700 transition-colors">{ticker}</span>
                <span className="text-xs text-slate-500 truncate w-full">{name}</span>
              </button>
            ))}
          </div>

          {/* Recent searches */}
          {recent.length > 0 && (
            <div className="mt-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">ค้นหาล่าสุด</h2>
              <div className="flex flex-wrap gap-2">
                {recent.map((t) => (
                  <button
                    key={t}
                    onClick={() => void openStock(t)}
                    className="px-3 py-1.5 bg-white/60 backdrop-blur-md border border-white/30 rounded-full text-sm font-mono font-semibold text-slate-700 hover:bg-white/80 hover:border-violet-300 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href="/radar" className="flex items-center gap-2 px-4 py-3 bg-white/60 backdrop-blur-md border border-white/30 rounded-xl hover:bg-white/80 transition-colors">
              <span className="text-lg">📡</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Radar</p>
                <p className="text-xs text-slate-500">สแกนหาโมเมนตัม</p>
              </div>
            </Link>
            <Link href="/screener" className="flex items-center gap-2 px-4 py-3 bg-white/60 backdrop-blur-md border border-white/30 rounded-xl hover:bg-white/80 transition-colors">
              <span className="text-lg">🔍</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Screener</p>
                <p className="text-xs text-slate-500">กรองตามเงื่อนไข</p>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
