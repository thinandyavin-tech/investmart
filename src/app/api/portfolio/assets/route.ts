import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";

export const dynamic = "force-dynamic";

interface FinnhubQuote {
  c:  number; // current price
  d:  number; // change
  dp: number; // percent change
  pc: number; // previous close
}

interface FinnhubProfile {
  name?: string;
  logo?: string;
  finnhubIndustry?: string;
}

export interface EnrichedHolding {
  ticker:            string;
  shares:            number;
  avgCost:           number;   // cost per share (USD)
  totalCostUsd:      number;   // shares × avgCost
  currentPrice:      number;
  prevClose:         number;
  change1D:          number;   // % day change
  holdingValueUsd:   number;
  holdingValueThb:   number;
  unrealizedPnlUsd:  number;
  unrealizedPnlThb:  number;
  unrealizedPnlPct:  number;
  weight:            number;   // % of total portfolio
  companyName:       string;
  logoUrl:           string | null;
  sector:            string | null;
}

export interface AssetsPayload {
  holdings:          EnrichedHolding[];
  cashUsd:           number;
  cashThb:           number;
  fxRate:            number;
  totalValueThb:     number;
  totalValueUsd:     number;
  totalCostUsd:      number;
  unrealizedPnlUsd:  number;
  unrealizedPnlThb:  number;
  unrealizedPnlPct:  number;
  change1DUsd:       number;
  change1DThb:       number;
  change1DPct:       number;
  asOf:              string;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000), next: { revalidate: 60 } });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

async function getFxRate(apiKey: string | undefined): Promise<number> {
  if (!apiKey) return 35.2;
  try {
    const r = await fetch(
      `https://finnhub.io/api/v1/forex/rates?base=USD&token=${apiKey}`,
      { next: { revalidate: 300 } },
    );
    if (!r.ok) return 35.2;
    const data = (await r.json()) as { quote?: Record<string, number> };
    return data.quote?.THB ?? 35.2;
  } catch { return 35.2; }
}

export async function GET(): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      cashUsd:  true,
      cashThb:  true,
      holdings: {
        select:  { ticker: true, shares: true, avgCost: true },
        orderBy: { ticker: "asc" },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });

  const apiKey = process.env.FINNHUB_API_KEY;
  const fxRate = await getFxRate(apiKey);

  const empty: AssetsPayload = {
    holdings: [], cashUsd: user.cashUsd, cashThb: user.cashThb, fxRate,
    totalValueThb: user.cashThb + user.cashUsd * fxRate, totalValueUsd: user.cashUsd,
    totalCostUsd: 0, unrealizedPnlUsd: 0, unrealizedPnlThb: 0, unrealizedPnlPct: 0,
    change1DUsd: 0, change1DThb: 0, change1DPct: 0, asOf: new Date().toISOString(),
  };

  if (user.holdings.length === 0 || !apiKey) {
    return NextResponse.json(empty);
  }

  const tickers = user.holdings.map((h) => h.ticker);

  // Fetch quotes and profiles concurrently for all holdings
  const [quotes, profiles] = await Promise.all([
    Promise.all(tickers.map((t) =>
      fetchJson<FinnhubQuote>(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(t)}&token=${apiKey}`,
      ),
    )),
    Promise.all(tickers.map((t) =>
      fetchJson<FinnhubProfile>(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(t)}&token=${apiKey}`,
      ),
    )),
  ]);

  const enriched: EnrichedHolding[] = [];
  let totalHoldingsValueUsd = 0;
  let totalCostUsd          = 0;
  let change1DUsd           = 0;
  let prevHoldingsValueUsd  = 0;

  for (let i = 0; i < user.holdings.length; i++) {
    const h = user.holdings[i];
    const q = quotes[i];
    const p = profiles[i];

    if (!q || q.c <= 0) continue;

    const currentPrice    = q.c;
    const prevClose       = q.pc || q.c;
    const change1DPct     = q.dp ?? ((prevClose > 0 ? (currentPrice - prevClose) / prevClose : 0) * 100);
    const totalCostUsdPos = h.shares * h.avgCost;
    const holdingValueUsd = h.shares * currentPrice;

    totalHoldingsValueUsd += holdingValueUsd;
    totalCostUsd          += totalCostUsdPos;
    change1DUsd           += h.shares * (currentPrice - prevClose);
    prevHoldingsValueUsd  += h.shares * prevClose;

    enriched.push({
      ticker:           h.ticker,
      shares:           h.shares,
      avgCost:          h.avgCost,
      totalCostUsd:     totalCostUsdPos,
      currentPrice,
      prevClose,
      change1D:         change1DPct,
      holdingValueUsd,
      holdingValueThb:       holdingValueUsd   * fxRate,
      unrealizedPnlUsd:      holdingValueUsd   - totalCostUsdPos,
      unrealizedPnlThb:     (holdingValueUsd   - totalCostUsdPos) * fxRate,
      unrealizedPnlPct: totalCostUsdPos > 0
        ? ((holdingValueUsd - totalCostUsdPos) / totalCostUsdPos) * 100
        : 0,
      weight:      0, // filled below once totals are known
      companyName: p?.name || h.ticker,
      logoUrl:     p?.logo || null,
      sector:      p?.finnhubIndustry || null,
    });
  }

  const totalPortfolioValueUsd = totalHoldingsValueUsd + user.cashUsd;
  const totalPortfolioValueThb = totalPortfolioValueUsd * fxRate + user.cashThb;
  const prevPortfolioValueUsd  = prevHoldingsValueUsd  + user.cashUsd;

  for (const e of enriched) {
    e.weight = totalPortfolioValueUsd > 0 ? (e.holdingValueUsd / totalPortfolioValueUsd) * 100 : 0;
  }

  const unrealizedPnlUsd = totalHoldingsValueUsd - totalCostUsd;
  const unrealizedPnlPct = totalCostUsd > 0 ? (unrealizedPnlUsd / totalCostUsd) * 100 : 0;
  const change1DPct      = prevPortfolioValueUsd > 0 ? (change1DUsd / prevPortfolioValueUsd) * 100 : 0;

  return NextResponse.json({
    holdings:          enriched,
    cashUsd:           user.cashUsd,
    cashThb:           user.cashThb,
    fxRate,
    totalValueThb:     totalPortfolioValueThb,
    totalValueUsd:     totalPortfolioValueUsd,
    totalCostUsd,
    unrealizedPnlUsd,
    unrealizedPnlThb:  unrealizedPnlUsd * fxRate,
    unrealizedPnlPct,
    change1DUsd,
    change1DThb:       change1DUsd * fxRate,
    change1DPct,
    asOf:              new Date().toISOString(),
  } satisfies AssetsPayload);
}
