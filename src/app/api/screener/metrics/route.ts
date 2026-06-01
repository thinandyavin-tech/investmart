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
        if (!res.ok) return { ticker, beta: null, pe: null };
        const data = (await res.json()) as { metric?: { beta?: number; peBasicExclExtraTTM?: number } };
        return {
          ticker,
          beta: data.metric?.beta           ?? null,
          pe:   data.metric?.peBasicExclExtraTTM ?? null,
        };
      } catch {
        return { ticker, beta: null, pe: null };
      }
    })
  );

  return NextResponse.json({ metrics: results });
}
