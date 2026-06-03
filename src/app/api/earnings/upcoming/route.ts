import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface EarningsEvent {
  symbol:          string;
  date:            string;
  hour:            string; // "bmo" | "amc" | "dmh"
  epsEstimate:     number | null;
  revenueEstimate: number | null;
}

interface FinnhubEarningsItem {
  symbol:          string;
  date:            string;
  hour:            string;
  epsActual:       number | null;
  epsEstimate:     number | null;
  revenueActual:   number | null;
  revenueEstimate: number | null;
}

interface FinnhubEarningsResponse {
  earningsCalendar: FinnhubEarningsItem[];
}

let cache: { data: EarningsEvent[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_RESULTS  = 30;

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(): Promise<NextResponse> {
  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json({ events: cache.data });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ events: [] });
  }

  const from = toIsoDate(new Date());
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 7);
  const to = toIsoDate(toDate);

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${apiKey}`,
      { next: { revalidate: 0 } },
    );

    if (!res.ok) {
      return NextResponse.json({ events: [] });
    }

    const json = (await res.json()) as FinnhubEarningsResponse;
    const raw  = json.earningsCalendar ?? [];

    const events: EarningsEvent[] = raw
      .filter((e) => e.symbol && e.date)
      .sort((a, b) => {
        const revDiff = (b.revenueEstimate ?? 0) - (a.revenueEstimate ?? 0);
        return revDiff !== 0 ? revDiff : a.symbol.localeCompare(b.symbol);
      })
      .slice(0, MAX_RESULTS)
      .map((e) => ({
        symbol:          e.symbol,
        date:            e.date,
        hour:            e.hour ?? "",
        epsEstimate:     e.epsEstimate ?? null,
        revenueEstimate: e.revenueEstimate ?? null,
      }));

    cache = { data: events, expiresAt: Date.now() + CACHE_TTL_MS };
    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
