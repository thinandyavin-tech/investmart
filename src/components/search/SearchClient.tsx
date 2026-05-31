"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { StockDetailPanel } from "@/components/radar/StockDetailPanel";
import type { StockMetrics } from "@/lib/momentum";

interface QuoteData {
  c: number;
  pc: number;
  v: number;
}

export function SearchClient() {
  const [query, setQuery]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [stock, setStock]       = useState<StockMetrics | null>(null);
  const [error, setError]       = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const ticker = query.toUpperCase().trim();
    if (!ticker) return;

    setLoading(true);
    setError("");
    setStock(null);

    try {
      const [quoteRes, profileRes] = await Promise.all([
        fetch(`/api/stock/quote?symbol=${ticker}`),
        fetch(`/api/stock/profile?symbol=${ticker}`),
      ]);

      const quote   = (await quoteRes.json())   as QuoteData;
      const profRes = (await profileRes.json()) as {
        profile: { name?: string; exchange?: string; marketCapitalization?: number };
        metrics: unknown;
      };

      if (!quote.c) {
        setError(`ไม่พบหุ้น ${ticker}`);
        return;
      }

      const price    = quote.c;
      const prevClose = quote.pc;
      const change1D  = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
      const marketCap = (profRes.profile?.marketCapitalization ?? 0) * 1_000_000;

      setStock({
        ticker,
        price,
        change1D,
        volume:       quote.v,
        avgVolume:    quote.v * 0.5,
        marketCap,
        rsi:          50,
        volumeSurge:  1,
        breakoutScore: 50,
        qualityScore:  50,
        momentumScore: 50,
        category:     "TOP100",
        companyName:  profRes.profile?.name ?? ticker,
        exchange:     profRes.profile?.exchange ?? "US",
      });
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xs font-bold uppercase tracking-widest mb-3">ค้นหาหุ้น</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="เช่น AAPL, MSFT, NVDA"
          className="flex-1 border border-[#1F1A14] bg-[#FBF7ED] px-3 py-2 text-sm placeholder:text-[#8A8378]"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-[#1F1A14] text-white text-xs font-bold uppercase tracking-wide shadow-offset-lime disabled:opacity-50"
        >
          {loading ? "กำลังค้นหา..." : "ค้นหา"}
        </button>
      </form>

      {error && (
        <Card className="p-3 mb-4">
          <p className="text-xs text-[#E5484D]">{error}</p>
        </Card>
      )}

      {stock && <StockDetailPanel stock={stock} timeframe="1M" />}
    </div>
  );
}
