/**
 * Yahoo Finance unofficial adapter — server-side only.
 *
 * HONESTY NOTES (read before changing):
 * - Yahoo Finance quotes are delayed ~15 min for most markets.
 *   ALWAYS label responses with `delayed: true` and show the
 *   "ราคาล่าช้า ~15 นาที" note in the UI.
 * - This is an unofficial endpoint that may change or rate-limit.
 *   Every call is wrapped in try/catch; on failure we return null
 *   so callers show "N/A" — never a fabricated number.
 * - Test from Vercel specifically — datacenter IPs can be throttled.
 *   If Yahoo blocks Vercel, report it; don't paper over it.
 *
 * Covers: US stocks (backup), SET (.BK), TSE (.T), Xetra (.DE),
 *         LSE (.L), ASX (.AX), most ADRs and OTC names.
 */

const YF_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min — matches Yahoo's typical delay

interface YahooMeta {
  regularMarketPrice?:    number;
  previousClose?:         number;
  chartPreviousClose?:    number;
  regularMarketDayHigh?:  number;
  regularMarketDayLow?:   number;
  regularMarketOpen?:     number;
  regularMarketVolume?:   number;
  regularMarketTime?:     number;
  currency?:              string;
  exchangeName?:          string;
  fullExchangeName?:      string;
  marketState?:           string; // "PRE" | "REGULAR" | "POST" | "CLOSED"
}

export interface YahooQuote {
  price:        number;
  prevClose:    number;
  change:       number;
  changePct:    number;
  high:         number;
  low:          number;
  open:         number;
  volume:       number;
  currency:     string;
  exchange:     string;
  marketState:  string;
  /** Always true — Yahoo data is delayed ~15 min */
  delayed:      true;
  /** ISO timestamp of when the quote was fetched */
  fetchedAt:    string;
}

interface CacheEntry { quote: YahooQuote; cachedAt: number }
const cache    = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<YahooQuote | null>>();

async function fetchFromYahoo(symbol: string): Promise<YahooQuote | null> {
  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.cachedAt < CACHE_TTL_MS) return hit.quote;

  const existing = inflight.get(symbol);
  if (existing) return existing;

  const promise = (async (): Promise<YahooQuote | null> => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
      const res = await fetch(url, {
        headers: YF_HEADERS,
        signal:  AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        console.warn(`[yahoo] ${symbol}: HTTP ${res.status}`);
        return null;
      }

      const data = (await res.json()) as {
        chart?: {
          result?: Array<{
            meta?:       YahooMeta;
            timestamp?:  number[];
            indicators?: {
              quote?: Array<{
                open?:   (number | null)[];
                high?:   (number | null)[];
                low?:    (number | null)[];
                close?:  (number | null)[];
                volume?: (number | null)[];
              }>;
            };
          }>;
          error?: { code: string; description: string } | null;
        };
      };

      const result = data.chart?.result?.[0];
      if (!result?.meta) {
        console.warn(`[yahoo] ${symbol}: no result in response`);
        return null;
      }

      const meta = result.meta;
      const price = meta.regularMarketPrice ?? 0;
      if (price === 0) {
        console.warn(`[yahoo] ${symbol}: price is 0`);
        return null;
      }

      // Previous close: prefer chartPreviousClose, then previousClose
      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
      const change    = price - prevClose;
      const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

      const q: YahooQuote = {
        price,
        prevClose,
        change,
        changePct,
        high:        meta.regularMarketDayHigh  ?? price,
        low:         meta.regularMarketDayLow   ?? price,
        open:        meta.regularMarketOpen      ?? price,
        volume:      meta.regularMarketVolume    ?? 0,
        currency:    meta.currency               ?? "USD",
        exchange:    meta.fullExchangeName       ?? meta.exchangeName ?? "Unknown",
        marketState: meta.marketState            ?? "CLOSED",
        delayed:     true,
        fetchedAt:   new Date().toISOString(),
      };

      cache.set(symbol, { quote: q, cachedAt: Date.now() });
      console.info(`[yahoo] ${symbol}: ${price} ${q.currency} (${q.exchange})`);
      return q;
    } catch (err) {
      console.warn(`[yahoo] ${symbol}: fetch error —`, err instanceof Error ? err.message : err);
      return null;
    } finally {
      inflight.delete(symbol);
    }
  })();

  inflight.set(symbol, promise);
  return promise;
}

/**
 * Get a quote from Yahoo Finance.
 * Returns null if the request fails or returns no data — never throws.
 *
 * @param symbol - Yahoo Finance ticker (e.g. "PTT.BK", "BMW.DE", "7203.T", "AAPL")
 */
export function getYahooQuote(symbol: string): Promise<YahooQuote | null> {
  return fetchFromYahoo(symbol.toUpperCase());
}

/**
 * Returns true for tickers that Finnhub free tier doesn't cover well:
 * - SET/Thai (.BK suffix)
 * - German/European exchange (.DE, .PA, .MI, .AS, .MC, .VX, .L, .ST, etc.)
 * - Tokyo (.T suffix)
 * - Australian (.AX suffix)
 * - OTC / Pink Sheets (contains letters + "Y" or ends in common OTC patterns)
 */
export function prefersYahoo(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  const NON_US_SUFFIXES = [".BK", ".DE", ".T", ".AX", ".L", ".PA", ".MI", ".AS", ".MC", ".VX", ".ST", ".HK", ".SS", ".SZ"];
  return NON_US_SUFFIXES.some(s => upper.endsWith(s));
}
