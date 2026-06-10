/**
 * THB/USD FX rate service.
 *
 * Source priority:
 *  1. Frankfurter.app — ECB daily rate, free, no API key required.
 *     Note: ECB publishes rates daily at ~16:00 CET. Updates once per day.
 *  2. Open Exchange Rates public API — hourly, free, no key.
 *  3. Finnhub forex (existing path) — if FINNHUB_API_KEY is set.
 *  4. Hardcoded fallback: 34.0 THB/USD (clearly labeled as approximate).
 *
 * BoT (Bank of Thailand) API: requires registration at bot.or.th/en/statistics.
 * Set BOT_API_KEY env var to enable. Until then, Frankfurter is used instead.
 * Both are daily rates; for paper-trading purposes the difference is immaterial.
 *
 * All results cached for 4 hours — rate doesn't change intra-day.
 */

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

interface FxCacheEntry {
  rate:      number;
  source:    string;
  fetchedAt: string;
}

let fxCache: FxCacheEntry | null = null;

async function fetchFrankfurter(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=THB",
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: { THB?: number } };
    const rate = data.rates?.THB;
    return rate && rate > 25 ? rate : null;
  } catch { return null; }
}

async function fetchOpenER(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://open.er-api.com/v6/latest/USD",
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: { THB?: number } };
    const rate = data.rates?.THB;
    return rate && rate > 25 ? rate : null;
  } catch { return null; }
}

async function fetchFinnhub(): Promise<number | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/forex/rates?base=USD&token=${key}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { quote?: { THB?: number } };
    const rate = data.quote?.THB;
    return rate && rate > 25 ? rate : null;
  } catch { return null; }
}

async function fetchBoT(): Promise<number | null> {
  const key = process.env.BOT_API_KEY;
  if (!key) return null;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(
      `https://apigw1.bot.or.th/bot/public/Stat-ExchangeRate/v2/DAILY_AVG_EXG_RATE/?start_period=${today}&end_period=${today}&currency=USD`,
      {
        headers: { "X-IBM-Client-Id": key },
        signal:  AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      result?: { data?: Array<{ mid_rate?: number }> };
    };
    const rate = data.result?.data?.[0]?.mid_rate;
    return rate && rate > 25 ? rate : null;
  } catch { return null; }
}

export interface FxRateResult {
  rate:      number;   // THB per USD
  source:    string;   // human-readable source name
  fetchedAt: string;   // ISO timestamp
  official:  boolean;  // true = BoT; false = market rate
}

/**
 * Get the current THB/USD rate.
 * Never throws — always returns a result (with a fallback if all sources fail).
 */
export async function getTHBRate(): Promise<FxRateResult> {
  // Check cache
  if (fxCache && Date.now() - new Date(fxCache.fetchedAt).getTime() < CACHE_TTL_MS) {
    return {
      rate:      fxCache.rate,
      source:    fxCache.source,
      fetchedAt: fxCache.fetchedAt,
      official:  fxCache.source.includes("BoT"),
    };
  }

  const fetchedAt = new Date().toISOString();

  // 1. BoT (official, requires BOT_API_KEY)
  const botRate = await fetchBoT();
  if (botRate) {
    const entry: FxCacheEntry = { rate: botRate, source: "Bank of Thailand (official)", fetchedAt };
    fxCache = entry;
    return { ...entry, official: true };
  }

  // 2. Frankfurter.app (ECB daily, free, no key)
  const frankfurterRate = await fetchFrankfurter();
  if (frankfurterRate) {
    const entry: FxCacheEntry = { rate: frankfurterRate, source: "Frankfurter.app (ECB)", fetchedAt };
    fxCache = entry;
    return { ...entry, official: false };
  }

  // 3. Open Exchange Rates
  const openERRate = await fetchOpenER();
  if (openERRate) {
    const entry: FxCacheEntry = { rate: openERRate, source: "Open Exchange Rates", fetchedAt };
    fxCache = entry;
    return { ...entry, official: false };
  }

  // 4. Finnhub forex
  const finnhubRate = await fetchFinnhub();
  if (finnhubRate) {
    const entry: FxCacheEntry = { rate: finnhubRate, source: "Finnhub Forex", fetchedAt };
    fxCache = entry;
    return { ...entry, official: false };
  }

  // 5. Hardcoded fallback
  const fallback: FxCacheEntry = { rate: 34.0, source: "fallback (approximate)", fetchedAt };
  fxCache = fallback;
  return { ...fallback, official: false };
}
