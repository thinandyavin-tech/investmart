import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TICKER_RE   = /^[A-Z][A-Z.\-]{0,9}$/;
const CACHE_MS    = 15 * 60 * 1000; // 15 min

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Candle {
  time:   number; // unix seconds
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

export interface SwingLevel {
  time:  number;
  price: number;
  kind:  "high" | "low";
}

export interface SRLevel {
  price:    number;
  strength: number; // 1–5
  kind:     "support" | "resistance";
  flipped:  boolean;
}

export interface Zone {
  priceHigh: number;
  priceLow:  number;
  kind:      "demand" | "supply";
  fresh:     boolean;
  time:      number; // candle time when zone formed
}

export interface StructureResult {
  ticker:     string;
  timeframe:  string;
  candles:    Candle[];
  swings:     SwingLevel[];
  srLevels:   SRLevel[];
  zones:      Zone[];
  atr:        number;
  computedAt: string;
  source:     "yahoo";
  delayed:    boolean;
}

// ── Yahoo Finance OHLC ────────────────────────────────────────────────────────

const TF_MAP: Record<string, { range: string; interval: string; delayed: boolean }> = {
  "1h": { range: "5d",  interval: "1h",  delayed: false },
  "4h": { range: "1mo", interval: "1h",  delayed: false }, // aggregate to 4h client-side
  "D":  { range: "1y",  interval: "1d",  delayed: false },
  "W":  { range: "5y",  interval: "1wk", delayed: false },
};

async function fetchCandles(symbol: string, tf: string): Promise<Candle[]> {
  const cfg = TF_MAP[tf] ?? TF_MAP["D"];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${cfg.interval}&range=${cfg.range}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      chart?: { result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ open?: (number|null)[]; high?: (number|null)[]; low?: (number|null)[]; close?: (number|null)[]; volume?: (number|null)[] }> };
      }> };
    };
    const result = json.chart?.result?.[0];
    if (!result?.timestamp) return [];
    const ts = result.timestamp;
    const q  = result.indicators?.quote?.[0];
    if (!q) return [];
    const candles: Candle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i], v = q.volume?.[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({ time: ts[i], open: o, high: h, low: l, close: c, volume: v ?? 0 });
    }
    // Aggregate to 4h if needed
    if (tf === "4h") return aggregate4h(candles);
    return candles;
  } catch { return []; }
}

function aggregate4h(candles: Candle[]): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < candles.length; i += 4) {
    const chunk = candles.slice(i, i + 4);
    if (chunk.length === 0) continue;
    out.push({
      time:   chunk[0].time,
      open:   chunk[0].open,
      high:   Math.max(...chunk.map(c => c.high)),
      low:    Math.min(...chunk.map(c => c.low)),
      close:  chunk[chunk.length - 1].close,
      volume: chunk.reduce((s, c) => s + c.volume, 0),
    });
  }
  return out;
}

// ── ATR ────────────────────────────────────────────────────────────────────────

function calcATR(candles: Candle[], period = 14): number {
  if (candles.length < 2) return 1;
  const trs = candles.slice(1).map((c, i) => {
    const prev = candles[i];
    return Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close));
  });
  const slice = trs.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

// ── Swing Pivot Detection ──────────────────────────────────────────────────────

function detectSwings(candles: Candle[], n = 5): SwingLevel[] {
  const swings: SwingLevel[] = [];
  for (let i = n; i < candles.length - n; i++) {
    const window = candles.slice(i - n, i + n + 1);
    const maxH   = Math.max(...window.map(c => c.high));
    const minL   = Math.min(...window.map(c => c.low));
    if (candles[i].high === maxH) {
      swings.push({ time: candles[i].time, price: candles[i].high, kind: "high" });
    }
    if (candles[i].low === minL) {
      swings.push({ time: candles[i].time, price: candles[i].low, kind: "low" });
    }
  }
  return swings;
}

// ── S/R Level Detection ────────────────────────────────────────────────────────

function detectSR(candles: Candle[], swings: SwingLevel[], proximityPct = 0.015): SRLevel[] {
  if (swings.length === 0) return [];
  const prices = swings.map(s => s.price);
  const clusters: { price: number; count: number; times: number[] }[] = [];

  for (const p of prices) {
    const hit = clusters.find(c => Math.abs(c.price - p) / p < proximityPct);
    if (hit) {
      hit.count++;
      hit.price = (hit.price * (hit.count - 1) + p) / hit.count; // running avg
    } else {
      const sw = swings.find(s => s.price === p);
      clusters.push({ price: p, count: 1, times: sw ? [sw.time] : [] });
    }
  }

  const currentPrice = candles[candles.length - 1]?.close ?? 0;
  return clusters
    .filter(c => c.count >= 2)
    .map(c => {
      const strength   = Math.min(5, c.count);
      const isAbove    = c.price > currentPrice;
      const kind       = isAbove ? "resistance" : "support";
      // Flip detection: was it previously on the other side?
      const flipped    = false; // simplified
      return { price: c.price, strength, kind, flipped } as SRLevel;
    })
    .sort((a, b) => Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice))
    .slice(0, 8);
}

// ── Supply / Demand Zone Detection ────────────────────────────────────────────

function detectZones(candles: Candle[], atr: number, baseBars = 3, impulseMult = 1.5): Zone[] {
  const zones: Zone[] = [];
  const currentPrice = candles[candles.length - 1]?.close ?? 0;

  for (let i = baseBars; i < candles.length - 1; i++) {
    // Check if the candles before i form a base (small range vs ATR)
    const base = candles.slice(i - baseBars, i);
    const baseRange = base.reduce((max, c) => Math.max(max, c.high - c.low), 0);
    if (baseRange > atr * 0.8) continue; // not a tight base

    // Check if candle i is impulsive
    const impulse     = candles[i];
    const impulseBody = Math.abs(impulse.close - impulse.open);
    if (impulseBody < atr * impulseMult) continue;

    const zoneHigh = Math.max(...base.map(c => c.high));
    const zoneLow  = Math.min(...base.map(c => c.low));

    const isImpulseUp = impulse.close > impulse.open;
    const kind        = isImpulseUp ? "demand" : "supply";

    // Check freshness: has price traded back through the zone since it formed?
    const subsequent = candles.slice(i + 1);
    const fresh      = !subsequent.some(c =>
      kind === "demand" ? c.low < zoneLow : c.high > zoneHigh
    );

    // Only include zones relevant to current price (within 30% range)
    const midZone = (zoneHigh + zoneLow) / 2;
    if (Math.abs(midZone - currentPrice) / currentPrice > 0.30) continue;

    zones.push({ priceHigh: zoneHigh, priceLow: zoneLow, kind, fresh, time: base[0].time });
  }

  return zones.slice(-6); // latest 6 zones
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params    = request.nextUrl.searchParams;
  const ticker    = params.get("ticker")?.toUpperCase() ?? "";
  const timeframe = params.get("tf") ?? "D";

  if (!TICKER_RE.test(ticker)) return NextResponse.json({ error: "invalid ticker" }, { status: 400 });
  if (!TF_MAP[timeframe])      return NextResponse.json({ error: "invalid timeframe" }, { status: 400 });

  const cacheKey = `structure:${ticker}:${timeframe}`;

  // Check DB cache
  try {
    const row = await prisma.siteCache.findUnique({ where: { key: cacheKey } });
    if (row) {
      const stored = row.value as unknown as { data: StructureResult; cachedAt: number };
      if (stored?.data && Date.now() - stored.cachedAt < CACHE_MS) {
        return NextResponse.json({ ...stored.data, fromCache: true });
      }
    }
  } catch { /* DB miss — compute */ }

  const candles = await fetchCandles(ticker, timeframe);
  if (candles.length < 20) {
    return NextResponse.json({
      ticker, timeframe, candles: [], swings: [], srLevels: [], zones: [],
      atr: 0, computedAt: new Date().toISOString(), source: "yahoo", delayed: false,
      error: "Not enough candle data for this ticker/timeframe",
    });
  }

  const atr      = calcATR(candles);
  const lookback = timeframe === "1h" ? 3 : timeframe === "4h" ? 4 : 5;
  const swings   = detectSwings(candles, lookback);
  const srLevels = detectSR(candles, swings);
  const zones    = detectZones(candles, atr);

  const result: StructureResult = {
    ticker, timeframe, candles, swings, srLevels, zones, atr,
    computedAt: new Date().toISOString(),
    source: "yahoo", delayed: false,
  };

  // Persist to cache (fire-and-forget)
  const payload = { data: result, cachedAt: Date.now() } as unknown as import("@prisma/client").Prisma.InputJsonValue;
  prisma.siteCache.upsert({
    where: { key: cacheKey }, update: { value: payload }, create: { key: cacheKey, value: payload },
  }).catch(() => {});

  return NextResponse.json(result);
}
