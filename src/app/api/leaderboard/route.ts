import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FALLBACK_FX = 35.2;

interface PriceCache { price: number; ts: number }
const priceCache = new Map<string, PriceCache>();
const PRICE_TTL  = 5 * 60 * 1000; // 5 min

async function fetchLivePrice(ticker: string, apiKey: string): Promise<number | null> {
  const hit = priceCache.get(ticker);
  if (hit && Date.now() - hit.ts < PRICE_TTL) return hit.price;

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { c?: number };
    if (typeof data.c === "number" && data.c > 0) {
      priceCache.set(ticker, { price: data.c, ts: Date.now() });
      return data.c;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(): Promise<NextResponse> {
  const apiKey = process.env.FINNHUB_API_KEY;

  const users = await prisma.user.findMany({
    select: {
      id:       true,
      name:     true,
      username: true,
      cashThb:  true,
      cashUsd:  true,
      holdings: { select: { ticker: true, shares: true, avgCost: true, currency: true } },
      _count:   { select: { tradeHistory: true } },
    },
    orderBy: { createdAt: "asc" },
    take:    100,
  });

  // Collect unique tickers and fetch live prices in parallel
  const allTickers = [...new Set(users.flatMap((u) => u.holdings.map((h) => h.ticker)))];
  const livePrices = new Map<string, number>();

  if (apiKey && allTickers.length > 0) {
    // Batch with concurrency limit of 10 to avoid rate-limiting
    const CHUNK = 10;
    for (let i = 0; i < allTickers.length; i += CHUNK) {
      const chunk = allTickers.slice(i, i + CHUNK);
      const results = await Promise.all(chunk.map((t) => fetchLivePrice(t, apiKey)));
      chunk.forEach((t, idx) => {
        const p = results[idx];
        if (p !== null) livePrices.set(t, p);
      });
    }
  }

  const leaderboard = users
    .map((u) => {
      const holdingValue = u.holdings.reduce((sum, h) => {
        const livePrice = livePrices.get(h.ticker);
        const priceUsd  = livePrice ?? h.avgCost;
        return sum + h.shares * priceUsd * FALLBACK_FX;
      }, 0);
      const totalThb = u.cashThb + u.cashUsd * FALLBACK_FX + holdingValue;
      const pnl      = totalThb - 1_250_000;
      return {
        id:       u.id.slice(-6),
        name:     u.name ?? "นักลงทุน",
        username: u.username,
        totalThb,
        pnl,
        trades:   u._count.tradeHistory,
        holdings: u.holdings.length,
      };
    })
    .sort((a, b) => b.totalThb - a.totalThb)
    .map((u, i) => ({ ...u, rank: i + 1 }));

  const usesLivePrices = livePrices.size > 0;

  return NextResponse.json({
    leaderboard,
    note: usesLivePrices
      ? "มูลค่าคำนวณจากราคาตลาดปัจจุบัน + เงินสด"
      : "มูลค่าคำนวณจากราคาต้นทุน + เงินสด (ไม่พบราคาตลาด)",
  });
}
