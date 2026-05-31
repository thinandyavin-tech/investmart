import { NextResponse } from "next/server";

export const revalidate = 3600;

interface FinnhubSector {
  sector: string;
  changesPercent: string;
}

export async function GET(): Promise<NextResponse> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/sector-performance?token=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) {
      return NextResponse.json({ sectors: [] });
    }
    const raw = (await res.json()) as FinnhubSector[];
    const sectors = raw
      .map((s) => ({ name: s.sector, change: parseFloat(s.changesPercent) }))
      .filter((s) => !isNaN(s.change))
      .sort((a, b) => b.change - a.change);
    return NextResponse.json(
      { sectors },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } }
    );
  } catch {
    return NextResponse.json({ sectors: [] });
  }
}
