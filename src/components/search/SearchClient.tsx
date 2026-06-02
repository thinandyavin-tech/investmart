"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { StockDetailPanel } from "@/components/radar/StockDetailPanel";
import type { StockMetrics } from "@/lib/momentum";

interface QuoteData { c: number; pc: number; v: number; }
interface Suggestion { ticker: string; name: string; type?: string; }

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function SearchClient() {
  const [query, setQuery]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [stock, setStock]             = useState<StockMetrics | null>(null);
  const [error, setError]             = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSugg, setShowSugg]       = useState(false);
  const [suggLoading, setSuggLoading] = useState(false);
  const inputRef   = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 250);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (debouncedQuery.length < 1) {
      setSuggestions([]);
      return;
    }
    setSuggLoading(true);
    fetch(`/api/stock/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((d: { results?: Suggestion[] }) => {
        setSuggestions(d.results ?? []);
        setShowSugg(true);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setSuggLoading(false));
  }, [debouncedQuery]);

  // Close suggestions on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSugg(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (ticker: string) => {
    const t = ticker.toUpperCase().trim();
    if (!t) return;
    setQuery(t);
    setShowSugg(false);
    setLoading(true);
    setError("");
    setStock(null);

    try {
      const [quoteRes, profileRes] = await Promise.all([
        fetch(`/api/stock/quote?symbol=${t}`),
        fetch(`/api/stock/profile?symbol=${t}`),
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
    // If there's a suggestion available, use the first one (handles "Apple" → "AAPL")
    if (suggestions.length > 0) {
      void search(suggestions[0].ticker);
    } else {
      void search(query.toUpperCase().trim());
    }
  }

  function handleSuggestionClick(ticker: string) {
    void search(ticker);
    inputRef.current?.blur();
  }

  return (
    <div className="p-4 max-w-lg mx-auto w-full overflow-x-hidden">
      <h1 className="text-xs font-bold uppercase tracking-widest mb-3">ค้นหาหุ้น</h1>

      <div ref={containerRef} className="relative mb-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSugg(true);
              }}
              onFocus={() => suggestions.length > 0 && setShowSugg(true)}
              placeholder="พิมพ์ชื่อหุ้น หรือ ticker เช่น Apple, AAPL..."
              maxLength={40}
              autoComplete="off"
              className="w-full border border-[#1F1A14] bg-[#FBF7ED] px-3 py-2 text-sm placeholder:text-[#8A8378] focus:outline-none focus:ring-1 focus:ring-[#1F1A14]"
              aria-label="ค้นหาหุ้นด้วยชื่อบริษัทหรือ ticker"
              aria-autocomplete="list"
              aria-expanded={showSugg && suggestions.length > 0}
            />
            {suggLoading && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#8A8378]">
                ...
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !query}
            className="px-4 py-2 bg-[#1F1A14] text-white text-xs font-bold uppercase tracking-wide shadow-offset-lime disabled:opacity-40"
          >
            {loading ? "..." : "ค้นหา"}
          </button>
        </form>

        {/* Autocomplete dropdown */}
        {showSugg && suggestions.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 z-50 border border-[#1F1A14] bg-[#F3EDE0] mt-0.5"
            style={{ boxShadow: "2px 2px 0 #1F1A14" }}
            role="listbox"
          >
            {suggestions.map((s) => (
              <button
                key={s.ticker}
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before click fires
                  handleSuggestionClick(s.ticker);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#1F1A14] hover:text-white transition-colors group"
              >
                <span
                  className="text-[11px] font-bold w-14 flex-shrink-0"
                  style={{ fontFamily: "var(--font-mono)", color: "inherit" }}
                >
                  {s.ticker}
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[11px] text-[#1F1A14] truncate group-hover:text-white leading-tight">
                    {s.name}
                  </span>
                  {s.type && s.type !== "Common Stock" && (
                    <span className="text-[8px] text-[#8A8378] group-hover:text-[#aaa]">{s.type}</span>
                  )}
                </div>
                <Link
                  href={`/stock/${s.ticker}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="ml-auto text-[9px] text-[#5B8A2A] hover:underline flex-shrink-0 group-hover:text-[#9BE15D]"
                >
                  ดูหน้าหุ้น →
                </Link>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <Card className="p-3 mb-4">
          <p className="text-xs text-[#E5484D]">{error}</p>
        </Card>
      )}

      {stock && <StockDetailPanel stock={stock} timeframe="1M" />}
    </div>
  );
}
