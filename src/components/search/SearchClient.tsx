"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Link }      from "@/i18n/navigation";
import { Search }    from "lucide-react";
import { StockLogo } from "@/components/StockLogo";
import { StockDetailPanel } from "@/components/radar/StockDetailPanel";
import { useI18n }   from "@/lib/i18n";
import type { StockMetrics } from "@/lib/momentum";

interface QuoteData { c: number; pc: number; v: number; source?: string; }

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
  { ticker: "NVDA",  name: "NVIDIA Corporation" },
  { ticker: "AAPL",  name: "Apple Inc." },
  { ticker: "TSLA",  name: "Tesla, Inc." },
  { ticker: "MSFT",  name: "Microsoft Corp." },
  { ticker: "META",  name: "Meta Platforms" },
  { ticker: "AMZN",  name: "Amazon.com Inc." },
  { ticker: "GOOGL", name: "Alphabet Inc." },
  { ticker: "AMD",   name: "Advanced Micro Devices" },
  { ticker: "PLTR",  name: "Palantir Technologies" },
  { ticker: "NFLX",  name: "Netflix, Inc." },
  { ticker: "JPM",   name: "JPMorgan Chase" },
  { ticker: "V",     name: "Visa Inc." },
];

function ExchangeBadge({ exchange }: { exchange: string }) {
  const style =
    exchange === "SET"    ? { bg: "#DBEAFE", text: "#1D4ED8" } :
    exchange === "NASDAQ" ? { bg: "#EDE9FE", text: "#6D28D9" } :
    exchange === "NYSE"   ? { bg: "#FEF3C7", text: "#D97706" } :
                            { bg: "#e9edc9",  text: "#4B5563" };
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 flex-shrink-0"
      style={{ background: style.bg, color: style.text, borderRadius: 3 }}
    >
      {exchange}
    </span>
  );
}

export function SearchClient() {
  const router  = useRouter();
  const { t }   = useI18n();
  const sc      = t.search;

  const [query,       setQuery]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [stock,       setStock]       = useState<StockMetrics | null>(null);
  const [error,       setError]       = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSugg,    setShowSugg]    = useState(false);
  const [suggLoading, setSuggLoading] = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(-1);
  const [recent,      setRecent]      = useState<string[]>([]);

  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef      = useRef<HTMLUListElement>(null);

  const debouncedQuery = useDebounce(query, 180);

  useEffect(() => { setRecent(loadRecent()); }, []);

  // Live price refresh for the inline stock panel — polls every 5s while a stock is shown
  useEffect(() => {
    if (!stock) return;
    const ticker = stock.ticker;
    const id = setInterval(() => {
      fetch(`/api/stock/quote?symbol=${encodeURIComponent(ticker)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((q: QuoteData | null) => {
          if (!q?.c) return;
          const change1D = q.pc > 0 ? ((q.c - q.pc) / q.pc) * 100 : 0;
          setStock((prev) => prev?.ticker === ticker ? { ...prev, price: q.c, change1D } : prev);
        })
        .catch(() => {});
    }, 5_000);
    return () => clearInterval(id);
  }, [stock?.ticker]);

  useEffect(() => {
    setActiveIdx(-1);
    if (debouncedQuery.length < 1) { setSuggestions([]); setShowSugg(false); return; }
    setSuggLoading(true);
    fetch(`/api/search/suggest?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((d: { results?: Suggestion[] }) => { setSuggestions(d.results ?? []); setShowSugg(true); })
      .catch(() => setSuggestions([]))
      .finally(() => setSuggLoading(false));
  }, [debouncedQuery]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowSugg(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openStock = useCallback(async (ticker: string) => {
    const t = ticker.toUpperCase().trim();
    if (!t) return;
    setQuery(t); setShowSugg(false); setLoading(true); setError(""); setStock(null);
    saveRecent(t); setRecent(loadRecent());
    try {
      const [quoteRes, profileRes] = await Promise.all([
        fetch(`/api/stock/quote?symbol=${encodeURIComponent(t)}`),
        fetch(`/api/stock/profile?symbol=${encodeURIComponent(t)}`),
      ]);
      // On any API failure (rate limit, upstream error) go straight to the stock page
      if (!quoteRes.ok) { router.push(`/stock/${t}`); return; }
      const quote   = (await quoteRes.json()) as QuoteData;
      const profRes = (await profileRes.json()) as { profile?: { name?: string; exchange?: string; marketCapitalization?: number } };
      // No price AND no profile → stock page (TradingView fallback covers it)
      if (!quote.c && !profRes.profile?.name) { router.push(`/stock/${t}`); return; }
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
    } catch { router.push(`/stock/${t}`); }
    finally { setLoading(false); }
  }, [sc]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const active = activeIdx >= 0 ? suggestions[activeIdx] : suggestions[0];
    void openStock(active?.ticker ?? query.toUpperCase().trim());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSugg || suggestions.length === 0) return;
    if (e.key === "ArrowDown")  { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Escape")    { setShowSugg(false); setActiveIdx(-1); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); void openStock(suggestions[activeIdx].ticker); }
  }

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    (listRef.current.children[activeIdx] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const showDropdown = showSugg && (suggestions.length > 0 || (query.length === 0 && recent.length > 0));

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto w-full">
      <h1 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#1A1A1A" }}>{sc.title}</h1>

      {/* ── Search bar ── */}
      <div ref={containerRef} className="relative mb-6">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#8A8378" }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSugg(true); }}
              onFocus={() => setShowSugg(true)}
              onKeyDown={handleKeyDown}
              placeholder={sc.placeholder}
              maxLength={40}
              autoComplete="off"
              spellCheck={false}
              className="w-full pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 transition"
              style={{
                background: "#fefae0",
                border: "1.5px solid #ccd5ae",
                borderRadius: 8,
                color: "#1A1A1A",
              }}
              aria-label={sc.searchAria}
              aria-autocomplete="list"
              aria-controls="search-suggestions"
              aria-activedescendant={activeIdx >= 0 ? `sugg-${activeIdx}` : undefined}
              aria-expanded={showDropdown}
            />
            {suggLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs animate-pulse" style={{ color: "#8B5CF6" }}>●</span>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-3 text-sm font-bold text-white disabled:opacity-40 transition"
            style={{ background: "#8B5CF6", borderRadius: 8, boxShadow: "2px 2px 0 #d4a373" }}
          >
            {loading ? "…" : sc.searchBtn}
          </button>
        </form>

        {/* ── Dropdown ── */}
        {showDropdown && (
          <ul
            id="search-suggestions"
            ref={listRef}
            role="listbox"
            className="absolute top-full left-0 right-0 z-50 mt-1.5 overflow-hidden overflow-y-auto max-h-80"
            style={{ background: "#fefae0", border: "1.5px solid #ccd5ae", borderRadius: 8, boxShadow: "4px 4px 0 #d4a373" }}
          >
            {query.length === 0 && recent.length > 0 && (
              <li className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: "#8A8378", borderBottom: "1px solid #e9edc9" }}>
                {sc.recentDropdown}
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
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                  style={{ background: i === activeIdx ? "#e9edc9" : "transparent" }}
                >
                  <StockLogo ticker={s.ticker} name={s.name !== s.ticker ? s.name : undefined} size={28} radius={6} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ fontFamily: "var(--font-mono)", color: "#1A1A1A" }}>{s.ticker}</span>
                      {s.exchange && <ExchangeBadge exchange={s.exchange} />}
                    </div>
                    {s.name && s.name !== s.ticker && (
                      <p className="text-[11px] truncate" style={{ color: "#8A8378" }}>{s.name}</p>
                    )}
                  </div>
                  <span className="text-sm flex-shrink-0" style={{ color: "#8B5CF6" }}>→</span>
                </button>
              </li>
            ))}
            {query.length > 0 && suggestions.length === 0 && !suggLoading && (
              <li className="px-4 py-4 text-sm text-center" style={{ color: "#8A8378" }}>{sc.noMatch}</li>
            )}
          </ul>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-4 px-4 py-3" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8 }}>
          <p className="text-sm" style={{ color: "#DC2626" }}>{error}</p>
        </div>
      )}

      {/* ── Stock result ── */}
      {stock && (
        <div className="mb-6">
          <StockDetailPanel stock={stock} timeframe="1M" />
          <Link
            href={`/stock/${stock.ticker}`}
            className="mt-2 flex items-center justify-center gap-1.5 w-full py-2.5 text-sm font-bold text-white transition"
            style={{ background: "#8B5CF6", borderRadius: 8 }}
          >
            {sc.openFull(stock.ticker)}
          </Link>
        </div>
      )}

      {/* ── Popular stocks ── */}
      {!stock && !loading && query.length === 0 && (
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#8A8378" }}>{sc.popularTitle}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {POPULAR.map(({ ticker, name }) => (
              <button
                key={ticker}
                onClick={() => void openStock(ticker)}
                className="flex flex-col items-center gap-2 p-3 text-left transition-colors group"
                style={{ background: "#faedcd", border: "1px solid #ccd5ae", borderRadius: 10 }}
                onMouseEnter={e => (e.currentTarget.style.background = "#e9edc9")}
                onMouseLeave={e => (e.currentTarget.style.background = "#faedcd")}
              >
                <StockLogo ticker={ticker} name={name} size={36} radius={8} />
                <div className="w-full text-center min-w-0">
                  <p className="text-xs font-bold" style={{ fontFamily: "var(--font-mono)", color: "#1A1A1A" }}>{ticker}</p>
                  <p className="text-[9px] truncate" style={{ color: "#8A8378" }}>{name.split(" ")[0]}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Recent searches */}
          {recent.length > 0 && (
            <div className="mt-5">
              <h2 className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#8A8378" }}>{sc.recent}</h2>
              <div className="flex flex-wrap gap-2">
                {recent.map((t) => (
                  <button
                    key={t}
                    onClick={() => void openStock(t)}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-sm font-bold transition-colors"
                    style={{ background: "#faedcd", border: "1px solid #ccd5ae", borderRadius: 20, fontFamily: "var(--font-mono)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#e9edc9")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#faedcd")}
                  >
                    <StockLogo ticker={t} size={18} radius={4} />
                    <span style={{ color: "#1A1A1A" }}>{t}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            {[
              { href: "/radar", icon: "📡", title: "Radar", desc: sc.radarDesc },
              { href: "/screener", icon: "🔍", title: "Screener", desc: sc.screenerDesc },
            ].map(({ href, icon, title, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-4 py-3 transition-colors"
                style={{ background: "#faedcd", border: "1px solid #ccd5ae", borderRadius: 10 }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#e9edc9")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#faedcd")}
              >
                <span className="text-xl">{icon}</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#1A1A1A" }}>{title}</p>
                  <p className="text-[10px]" style={{ color: "#8A8378" }}>{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
