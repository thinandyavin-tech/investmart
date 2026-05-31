import { NextResponse } from "next/server";

// Fallback rates — updated via Finnhub forex quotes
const FALLBACK_RATES: Record<string, number> = {
  THBUSD: 0.0284,
  USDTHB: 35.2,
  USDEUR: 0.92,
  USDGBP: 0.79,
  USDJPY: 149.5,
};

export async function GET() {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ rates: FALLBACK_RATES, source: "fallback" });
  }

  try {
    const pairs = ["OANDA:USD_THB", "OANDA:THB_USD"];
    const results = await Promise.all(
      pairs.map((p) =>
        fetch(`https://finnhub.io/api/v1/forex/rates?base=USD&token=${apiKey}`, {
          next: { revalidate: 300 },
        }).then((r) => r.json())
      )
    );
    const first = results[0] as { quote?: Record<string, number> };
    const rates: Record<string, number> = {};
    if (first?.quote) {
      for (const [k, v] of Object.entries(first.quote)) {
        rates[`USD${k}`] = v as number;
      }
    }
    return NextResponse.json({
      rates: Object.keys(rates).length > 0 ? rates : FALLBACK_RATES,
      source: Object.keys(rates).length > 0 ? "finnhub" : "fallback",
    });
  } catch {
    return NextResponse.json({ rates: FALLBACK_RATES, source: "fallback" });
  }
}
