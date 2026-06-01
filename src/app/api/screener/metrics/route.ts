import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  tickers: z.array(z.string().regex(/^[A-Z][A-Z.\-]{0,9}$/)).max(40),
});

export interface MetricsRow {
  ticker: string;
  beta:   number | null;
  pe:     number | null;
  peg:    number | null;
}

interface FinnhubMetric {
  beta?:                     number;
  peBasicExclExtraTTM?:      number;
  epsGrowth3Y?:              number;
  epsGrowth5Y?:              number;
  revenueGrowthQuarterlyYoy?: number;
}

function computePeg(pe: number | null | undefined, epsGrowth3Y: number | null | undefined, epsGrowth5Y: number | null | undefined): number | null {
  const pe_ = pe ?? null;
  const growth = epsGrowth3Y ?? epsGrowth5Y ?? null;
  if (pe_ === null || growth === null || growth <= 0) return null;
  return pe_ / growth;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API not configured" }, { status: 500 });

  const body   = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 422 });

  const { tickers } = parsed.data;

  const results = await Promise.all(
    tickers.map(async (ticker): Promise<MetricsRow> => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all&token=${apiKey}`,
          { signal: AbortSignal.timeout(3000), next: { revalidate: 3600 } }
        );
        if (!res.ok) return { ticker, beta: null, pe: null, peg: null };
        const data = (await res.json()) as { metric?: FinnhubMetric };
        const m = data.metric;
        const pe = m?.peBasicExclExtraTTM ?? null;
        return {
          ticker,
          beta: m?.beta ?? null,
          pe,
          peg:  computePeg(pe, m?.epsGrowth3Y, m?.epsGrowth5Y),
        };
      } catch {
        return { ticker, beta: null, pe: null, peg: null };
      }
    })
  );

  return NextResponse.json({ metrics: results });
}
