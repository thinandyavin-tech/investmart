import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  const [profileRes, metricsRes] = await Promise.all([
    fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { next: { revalidate: 3600 } }
    ),
    fetch(
      `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${apiKey}`,
      { next: { revalidate: 3600 } }
    ),
  ]);

  const [profile, metrics] = await Promise.all([
    profileRes.json(),
    metricsRes.json(),
  ]) as [unknown, unknown];

  return NextResponse.json({ profile, metrics });
}
