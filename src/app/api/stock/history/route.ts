import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rateLimit";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;

interface YahooRange {
  range:    string;
  interval: string;
}

const TIMEFRAME_MAP: Record<string, YahooRange> = {
  "1min": { range: "1d",  interval: "1m"  },
  "5min": { range: "1d",  interval: "5m"  },
  "1D":   { range: "1d",  interval: "5m"  },
  "5D":   { range: "5d",  interval: "15m" },
  "1M":   { range: "1mo", interval: "1d"  },
  "3M":   { range: "3mo", interval: "1d"  },
  "6M":   { range: "6mo", interval: "1d"  },
  "1Y":   { range: "1y",  interval: "1d"  },
  "5Y":   { range: "5y",  interval: "1wk" },
  "Max":  { range: "max", interval: "1wk" },
};

const CACHE_SECS: Record<string, number> = {
  "1min": 30, "5min": 60,
  "1D": 60, "5D": 300, "1M": 3600, "3M": 3600, "6M": 3600, "1Y": 3600, "5Y": 86400, "Max": 86400,
};

interface YahooChartResult {
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?:   (number | null)[];
      high?:   (number | null)[];
      low?:    (number | null)[];
      close?:  (number | null)[];
      volume?: (number | null)[];
    }>;
  };
}

interface YahooResponse {
  chart?: {
    result?: YahooChartResult[];
    error?:  { code: string; description: string } | null;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "default");
  if (limited) return limited;
  const symbol    = (request.nextUrl.searchParams.get("symbol") ?? "").toUpperCase();
  const timeframe = request.nextUrl.searchParams.get("timeframe") ?? "1M";

  if (!TICKER_RE.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  const tf = TIMEFRAME_MAP[timeframe] ?? TIMEFRAME_MAP["1M"];
  const cacheSecs = CACHE_SECS[timeframe] ?? 3600;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${tf.interval}&range=${tf.range}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next:    { revalidate: cacheSecs },
      signal:  AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return NextResponse.json({ candles: [], simulated: true });
    }

    const data  = (await res.json()) as YahooResponse;
    const result = data.chart?.result?.[0];

    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      return NextResponse.json({ candles: [], simulated: true });
    }

    const timestamps = result.timestamp;
    const q          = result.indicators.quote[0];
    const opens      = q.open   ?? [];
    const highs      = q.high   ?? [];
    const lows       = q.low    ?? [];
    const closes     = q.close  ?? [];
    const volumes    = q.volume ?? [];

    const candles = timestamps
      .map((t, i) => ({
        time:   t,
        open:   opens[i]   ?? 0,
        high:   highs[i]   ?? 0,
        low:    lows[i]    ?? 0,
        close:  closes[i]  ?? 0,
        volume: volumes[i] ?? 0,
      }))
      .filter((c) => c.close > 0 && c.time > 0);

    return NextResponse.json(
      { candles, simulated: false },
      { headers: { "Cache-Control": `public, s-maxage=${cacheSecs}, stale-while-revalidate=${cacheSecs * 2}` } }
    );
  } catch {
    return NextResponse.json({ candles: [], simulated: true });
  }
}
