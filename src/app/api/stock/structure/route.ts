import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;
const CACHE_MS  = 15 * 60 * 1000;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Candle {
  time:   number;
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
  strength: number;
  kind:     "support" | "resistance";
  flipped:  boolean;
}

export interface Zone {
  priceHigh:  number;
  priceLow:   number;
  kind:       "demand" | "supply";
  fresh:      boolean;
  time:       number;
  strength:   number;
}

export interface MALine {
  kind:   "sma" | "ema";
  period: number;
  values: { time: number; value: number }[];
}

export interface FibLevel {
  price: number;
  ratio: number;
  label: string;
}

export interface AutoFib {
  swingHigh: number;
  swingLow:  number;
  direction: "up" | "down";
  levels:    FibLevel[];
}

export interface TrendLine {
  kind:   "support" | "resistance";
  points: { time: number; price: number }[];
  slope:  number;
  r2:     number;
}

export interface StructureLabel {
  time:  number;
  price: number;
  kind:  "BOS_UP" | "BOS_DOWN" | "CHoCH_UP" | "CHoCH_DOWN";
}

export interface VolumeNode {
  price:     number;
  volume:    number;
  pct:       number;
}

export interface VolumeProfile {
  nodes:    VolumeNode[];
  poc:      number;
  vahPrice: number;
  valPrice: number;
}

export interface Gap {
  time:      number;
  gapHigh:   number;
  gapLow:    number;
  filled:    boolean;
  direction: "up" | "down";
}

export interface ConflArea {
  priceHigh: number;
  priceLow:  number;
  score:     number;
  signals:   string[];
}

export interface StructureResult {
  ticker:        string;
  timeframe:     string;
  candles:       Candle[];
  swings:        SwingLevel[];
  srLevels:      SRLevel[];
  zones:         Zone[];
  mas:           MALine[];
  autoFib:       AutoFib | null;
  trendLines:    TrendLine[];
  structLabels:  StructureLabel[];
  trend:         "up" | "down" | "range";
  volumeProfile: VolumeProfile | null;
  gaps:          Gap[];
  confluence:    ConflArea[];
  atr:           number;
  computedAt:    string;
  source:        "yahoo";
  delayed:       boolean;
}

// ── Yahoo Finance ─────────────────────────────────────────────────────────────

const TF_MAP: Record<string, { range: string; interval: string }> = {
  "1h": { range: "5d",  interval: "1h"  },
  "4h": { range: "1mo", interval: "1h"  },
  "D":  { range: "1y",  interval: "1d"  },
  "W":  { range: "5y",  interval: "1wk" },
};

async function fetchCandles(symbol: string, tf: string): Promise<Candle[]> {
  const cfg = TF_MAP[tf] ?? TF_MAP["D"];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${cfg.interval}&range=${cfg.range}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000), headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      chart?: { result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ open?: (number|null)[]; high?: (number|null)[]; low?: (number|null)[]; close?: (number|null)[]; volume?: (number|null)[] }> };
      }> };
    };
    const result = json.chart?.result?.[0];
    if (!result?.timestamp) return [];
    const q = result.indicators?.quote?.[0];
    if (!q) return [];
    const candles: Candle[] = [];
    for (let i = 0; i < result.timestamp.length; i++) {
      const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({ time: result.timestamp[i], open: o, high: h, low: l, close: c, volume: q.volume?.[i] ?? 0 });
    }
    return tf === "4h" ? aggregate4h(candles) : candles;
  } catch { return []; }
}

function aggregate4h(candles: Candle[]): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < candles.length; i += 4) {
    const chunk = candles.slice(i, i + 4);
    if (!chunk.length) continue;
    out.push({ time: chunk[0].time, open: chunk[0].open, high: Math.max(...chunk.map(c => c.high)), low: Math.min(...chunk.map(c => c.low)), close: chunk[chunk.length-1].close, volume: chunk.reduce((s,c) => s+c.volume, 0) });
  }
  return out;
}

// ── ATR ───────────────────────────────────────────────────────────────────────

function calcATR(candles: Candle[], period = 14): number {
  if (candles.length < 2) return 1;
  const trs = candles.slice(1).map((c,i) => Math.max(c.high-c.low, Math.abs(c.high-candles[i].close), Math.abs(c.low-candles[i].close)));
  return trs.slice(-period).reduce((s,v) => s+v, 0) / Math.min(period, trs.length);
}

// ── Swing Pivots ──────────────────────────────────────────────────────────────

function detectSwings(candles: Candle[], n = 5, prominence = 0.5, atr = 1): SwingLevel[] {
  const swings: SwingLevel[] = [];
  for (let i = n; i < candles.length - n; i++) {
    const win = candles.slice(i - n, i + n + 1);
    if (candles[i].high === Math.max(...win.map(c => c.high))) {
      const leftMax  = Math.max(...candles.slice(Math.max(0,i-n*2), i).map(c => c.high));
      if (candles[i].high - Math.min(...win.map(c => c.low)) >= prominence * atr || candles[i].high >= leftMax) {
        swings.push({ time: candles[i].time, price: candles[i].high, kind: "high" });
      }
    }
    if (candles[i].low === Math.min(...win.map(c => c.low))) {
      const leftMin = Math.min(...candles.slice(Math.max(0,i-n*2), i).map(c => c.low));
      if (Math.max(...win.map(c => c.high)) - candles[i].low >= prominence * atr || candles[i].low <= leftMin) {
        swings.push({ time: candles[i].time, price: candles[i].low, kind: "low" });
      }
    }
  }
  return swings;
}

// ── S/R Levels ────────────────────────────────────────────────────────────────

function detectSR(candles: Candle[], swings: SwingLevel[], pct = 0.015): SRLevel[] {
  if (!swings.length) return [];
  const clusters: { price: number; count: number }[] = [];
  for (const s of swings) {
    const hit = clusters.find(c => Math.abs(c.price - s.price) / s.price < pct);
    if (hit) { hit.count++; hit.price = (hit.price + s.price) / 2; }
    else clusters.push({ price: s.price, count: 1 });
  }
  const cur = candles[candles.length-1]?.close ?? 0;
  return clusters.filter(c => c.count >= 2).map(c => ({
    price:    c.price,
    strength: Math.min(5, c.count),
    kind:     (c.price > cur ? "resistance" : "support") as "support" | "resistance",
    flipped:  false,
  })).sort((a,b) => Math.abs(a.price-cur) - Math.abs(b.price-cur)).slice(0, 10);
}

// ── Supply/Demand Zones ───────────────────────────────────────────────────────

function detectZones(candles: Candle[], atr: number, baseBars = 3, impMult = 1.5): Zone[] {
  const zones: Zone[] = [];
  const cur = candles[candles.length-1]?.close ?? 0;
  for (let i = baseBars; i < candles.length - 1; i++) {
    const base      = candles.slice(i - baseBars, i);
    const baseRange = base.reduce((mx, c) => Math.max(mx, c.high - c.low), 0);
    if (baseRange > atr * 0.8) continue;
    const imp      = candles[i];
    const impBody  = Math.abs(imp.close - imp.open);
    if (impBody < atr * impMult) continue;
    const zH = Math.max(...base.map(c => c.high));
    const zL = Math.min(...base.map(c => c.low));
    const isUp   = imp.close > imp.open;
    const kind   = isUp ? "demand" : "supply";
    const sub    = candles.slice(i + 1);
    const fresh  = !sub.some(c => kind === "demand" ? c.low < zL : c.high > zH);
    const tested = sub.filter(c => kind === "demand" ? c.low <= zH && c.high >= zL : c.low <= zH && c.high >= zL).length;
    if (Math.abs((zH+zL)/2 - cur) / cur > 0.35) continue;
    zones.push({ priceHigh: zH, priceLow: zL, kind, fresh, time: base[0].time, strength: Math.max(1, Math.min(5, Math.round(impBody / atr) - (tested * 1))) });
  }
  return zones.slice(-8);
}

// ── Moving Averages ───────────────────────────────────────────────────────────

function calcSMA(candles: Candle[], period: number): MALine {
  const values: { time: number; value: number }[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const avg = candles.slice(i - period + 1, i + 1).reduce((s, c) => s + c.close, 0) / period;
    values.push({ time: candles[i].time, value: avg });
  }
  return { kind: "sma", period, values };
}

function calcEMA(candles: Candle[], period: number): MALine {
  const k = 2 / (period + 1);
  const values: { time: number; value: number }[] = [];
  let ema = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    values.push({ time: candles[i].time, value: ema });
  }
  return { kind: "ema", period, values };
}

// ── Auto-Fibonacci ────────────────────────────────────────────────────────────

function calcAutoFib(candles: Candle[], swings: SwingLevel[]): AutoFib | null {
  if (swings.length < 2) return null;
  const recent = swings.slice(-10);
  const highs  = recent.filter(s => s.kind === "high").sort((a,b) => b.time - a.time);
  const lows   = recent.filter(s => s.kind === "low").sort((a,b) => b.time - a.time);
  if (!highs[0] || !lows[0]) return null;

  const lastHigh = highs[0];
  const lastLow  = lows[0];
  const isUpswing = lastLow.time < lastHigh.time;
  const swingH = isUpswing ? lastHigh.price : Math.max(lastHigh.price, lastLow.price);
  const swingL = isUpswing ? lastLow.price  : Math.min(lastHigh.price, lastLow.price);
  const range  = swingH - swingL;
  if (range <= 0) return null;

  const RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.65, 0.786, 1];
  const levels: FibLevel[] = RATIOS.map(r => ({
    ratio: r,
    price: isUpswing ? swingH - r * range : swingL + r * range,
    label: r === 0.65 ? "0.618–0.65 Golden Pocket" : `${(r * 100).toFixed(1)}%`,
  }));
  return { swingHigh: swingH, swingLow: swingL, direction: isUpswing ? "up" : "down", levels };
}

// ── Trend & BOS/CHoCH ─────────────────────────────────────────────────────────

function detectTrendAndStructure(candles: Candle[], swings: SwingLevel[]): { trend: "up" | "down" | "range"; labels: StructureLabel[] } {
  const labels: StructureLabel[] = [];
  if (swings.length < 4) return { trend: "range", labels };

  const highs = swings.filter(s => s.kind === "high");
  const lows  = swings.filter(s => s.kind === "low");

  const hhCount = highs.slice(-4).filter((h, i, arr) => i === 0 || h.price > arr[i-1].price).length;
  const hlCount = lows.slice(-4).filter((l, i, arr)  => i === 0 || l.price > arr[i-1].price).length;
  const llCount = lows.slice(-4).filter((l, i, arr)  => i === 0 || l.price < arr[i-1].price).length;
  const lhCount = highs.slice(-4).filter((h, i, arr) => i === 0 || h.price < arr[i-1].price).length;

  const trend: "up" | "down" | "range" =
    hhCount >= 2 && hlCount >= 2 ? "up" :
    llCount >= 2 && lhCount >= 2 ? "down" : "range";

  // BOS / CHoCH on last few swings
  const cur = candles[candles.length-1]?.close ?? 0;
  for (let i = 1; i < swings.length; i++) {
    const prev = swings[i-1];
    const curr = swings[i];
    if (prev.kind === "high" && curr.kind === "high") {
      if (curr.price > prev.price && trend === "up") labels.push({ time: curr.time, price: curr.price, kind: "BOS_UP" });
      if (curr.price < prev.price && trend === "up") labels.push({ time: curr.time, price: curr.price, kind: "CHoCH_DOWN" });
    }
    if (prev.kind === "low" && curr.kind === "low") {
      if (curr.price < prev.price && trend === "down") labels.push({ time: curr.time, price: curr.price, kind: "BOS_DOWN" });
      if (curr.price > prev.price && trend === "down") labels.push({ time: curr.time, price: curr.price, kind: "CHoCH_UP" });
    }
  }

  void cur;
  return { trend, labels: labels.slice(-6) };
}

// ── Trendlines ────────────────────────────────────────────────────────────────

function fitTrendLines(swings: SwingLevel[]): TrendLine[] {
  const lines: TrendLine[] = [];
  const highs = swings.filter(s => s.kind === "high").slice(-8);
  const lows  = swings.filter(s => s.kind === "low").slice(-8);

  function fitLine(points: SwingLevel[], kind: "support" | "resistance"): TrendLine | null {
    if (points.length < 3) return null;
    const n   = points.length;
    const xs  = points.map(p => p.time);
    const ys  = points.map(p => p.price);
    const mx  = xs.reduce((s,v) => s+v, 0) / n;
    const my  = ys.reduce((s,v) => s+v, 0) / n;
    const num = xs.reduce((s,x,i) => s + (x-mx)*(ys[i]-my), 0);
    const den = xs.reduce((s,x) => s + (x-mx)**2, 0);
    if (den === 0) return null;
    const slope = num / den;
    const inter = my - slope * mx;
    const r2    = (() => {
      const ssRes = ys.reduce((s,y,i) => s + (y - (slope*xs[i]+inter))**2, 0);
      const ssTot = ys.reduce((s,y) => s + (y-my)**2, 0);
      return ssTot === 0 ? 1 : 1 - ssRes/ssTot;
    })();
    if (r2 < 0.7) return null;
    return { kind, points: points.map(p => ({ time: p.time, price: p.price })), slope, r2 };
  }

  const supLine = fitLine(lows,  "support");
  const resLine = fitLine(highs, "resistance");
  if (supLine) lines.push(supLine);
  if (resLine) lines.push(resLine);
  return lines;
}

// ── Volume Profile ────────────────────────────────────────────────────────────

function calcVolumeProfile(candles: Candle[], bins = 24): VolumeProfile | null {
  const withVol = candles.filter(c => c.volume > 0);
  if (withVol.length < 10) return null;
  const lo    = Math.min(...candles.map(c => c.low));
  const hi    = Math.max(...candles.map(c => c.high));
  const range = hi - lo;
  if (range === 0) return null;
  const volBins = Array(bins).fill(0) as number[];
  for (const c of candles) {
    const bin = Math.min(bins - 1, Math.floor(((c.close - lo) / range) * bins));
    volBins[bin] += c.volume;
  }
  const totalVol = volBins.reduce((s,v) => s+v, 0);
  const nodes: VolumeNode[] = volBins.map((vol, i) => ({
    price:  lo + (i + 0.5) * (range / bins),
    volume: vol,
    pct:    totalVol > 0 ? vol / totalVol : 0,
  }));
  const poc      = nodes.reduce((mx, n) => n.volume > mx.volume ? n : mx, nodes[0]).price;
  const sorted   = [...nodes].sort((a, b) => b.volume - a.volume);
  let   cumPct   = 0;
  const valueArea: VolumeNode[] = [];
  for (const n of sorted) { cumPct += n.pct; valueArea.push(n); if (cumPct >= 0.70) break; }
  return {
    nodes,
    poc,
    vahPrice: Math.max(...valueArea.map(n => n.price)),
    valPrice: Math.min(...valueArea.map(n => n.price)),
  };
}

// ── Gaps ──────────────────────────────────────────────────────────────────────

function detectGaps(candles: Candle[], atr: number): Gap[] {
  const gaps: Gap[] = [];
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i-1], cur = candles[i];
    if (cur.open > prev.high && cur.open - prev.high > atr * 0.5) {
      const sub   = candles.slice(i+1);
      const filled = sub.some(c => c.low <= prev.high);
      gaps.push({ time: cur.time, gapHigh: cur.open, gapLow: prev.high, filled, direction: "up" });
    } else if (cur.open < prev.low && prev.low - cur.open > atr * 0.5) {
      const sub   = candles.slice(i+1);
      const filled = sub.some(c => c.high >= prev.low);
      gaps.push({ time: cur.time, gapHigh: prev.low, gapLow: cur.open, filled, direction: "down" });
    }
  }
  return gaps.filter(g => !g.filled).slice(-5);
}

// ── Confluence Engine ─────────────────────────────────────────────────────────

function calcConfluence(
  candles:  Candle[],
  srLevels: SRLevel[],
  zones:    Zone[],
  mas:      MALine[],
  fib:      AutoFib | null,
  vp:       VolumeProfile | null,
): ConflArea[] {
  const cur   = candles[candles.length-1]?.close ?? 0;
  const range = cur * 0.03; // 3% proximity window

  interface PriceSignal { price: number; label: string; weight: number }
  const signals: PriceSignal[] = [];

  for (const l of srLevels) signals.push({ price: l.price, label: `${l.kind} (S/R)`, weight: l.strength });
  for (const z of zones) signals.push({ price: (z.priceLow+z.priceHigh)/2, label: `${z.kind} zone`, weight: z.fresh ? 3 : 1 });
  for (const ma of mas) {
    const last = ma.values[ma.values.length-1];
    if (last) signals.push({ price: last.value, label: `${ma.kind.toUpperCase()}${ma.period}`, weight: ma.period >= 100 ? 3 : 2 });
  }
  if (fib) {
    for (const l of fib.levels.filter(l => l.ratio >= 0.382 && l.ratio <= 0.786)) {
      signals.push({ price: l.price, label: `Fib ${l.label}`, weight: l.ratio === 0.618 || l.ratio === 0.65 ? 3 : 2 });
    }
  }
  if (vp) {
    signals.push({ price: vp.poc,      label: "Volume POC",  weight: 4 });
    signals.push({ price: vp.vahPrice, label: "Value Area H", weight: 2 });
    signals.push({ price: vp.valPrice, label: "Value Area L", weight: 2 });
  }

  // Cluster signals within range
  const areas: ConflArea[] = [];
  for (const sig of signals) {
    const hit = areas.find(a => Math.abs((a.priceHigh+a.priceLow)/2 - sig.price) < range);
    if (hit) {
      hit.score += sig.weight;
      if (!hit.signals.includes(sig.label)) hit.signals.push(sig.label);
      hit.priceHigh = Math.max(hit.priceHigh, sig.price + range*0.3);
      hit.priceLow  = Math.min(hit.priceLow,  sig.price - range*0.3);
    } else {
      areas.push({ priceHigh: sig.price + range*0.3, priceLow: sig.price - range*0.3, score: sig.weight, signals: [sig.label] });
    }
  }

  return areas.filter(a => a.score >= 4).sort((a,b) => b.score - a.score).slice(0, 5);
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params    = request.nextUrl.searchParams;
  const ticker    = params.get("ticker")?.toUpperCase() ?? "";
  const timeframe = params.get("tf") ?? "D";

  if (!TICKER_RE.test(ticker)) return NextResponse.json({ error: "invalid ticker" }, { status: 400 });
  if (!TF_MAP[timeframe])      return NextResponse.json({ error: "invalid timeframe" }, { status: 400 });

  const cacheKey = `structure2:${ticker}:${timeframe}`;
  try {
    const row = await prisma.siteCache.findUnique({ where: { key: cacheKey } });
    if (row) {
      const stored = row.value as unknown as { data: StructureResult; cachedAt: number };
      if (stored?.data && Date.now() - stored.cachedAt < CACHE_MS) {
        return NextResponse.json({ ...stored.data, fromCache: true });
      }
    }
  } catch { /* compute */ }

  const candles = await fetchCandles(ticker, timeframe);
  if (candles.length < 20) {
    return NextResponse.json({ ticker, timeframe, candles: [], swings: [], srLevels: [], zones: [], mas: [], autoFib: null, trendLines: [], structLabels: [], trend: "range", volumeProfile: null, gaps: [], confluence: [], atr: 0, computedAt: new Date().toISOString(), source: "yahoo", delayed: false, error: "Insufficient candle data" });
  }

  const atr      = calcATR(candles);
  const lookback = timeframe === "1h" ? 3 : timeframe === "4h" ? 4 : 5;
  const swings   = detectSwings(candles, lookback, 0.5, atr);
  const srLevels = detectSR(candles, swings);
  const zones    = detectZones(candles, atr);
  const mas      = [calcSMA(candles, 20), calcEMA(candles, 50), calcSMA(candles, 200)];
  const autoFib  = calcAutoFib(candles, swings);
  const trendLines  = fitTrendLines(swings);
  const { trend, labels: structLabels } = detectTrendAndStructure(candles, swings);
  const volumeProfile = calcVolumeProfile(candles);
  const gaps     = detectGaps(candles, atr);
  const confluence = calcConfluence(candles, srLevels, zones, mas, autoFib, volumeProfile);

  const result: StructureResult = { ticker, timeframe, candles, swings, srLevels, zones, mas, autoFib, trendLines, structLabels, trend, volumeProfile, gaps, confluence, atr, computedAt: new Date().toISOString(), source: "yahoo", delayed: false };

  const payload = { data: result, cachedAt: Date.now() } as unknown as import("@prisma/client").Prisma.InputJsonValue;
  prisma.siteCache.upsert({ where: { key: cacheKey }, update: { value: payload }, create: { key: cacheKey, value: payload } }).catch(() => {});

  return NextResponse.json(result);
}
