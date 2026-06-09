/** Pure, server-safe technical indicator computations. */

export interface OHLCV {
  time:   number;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

export interface FibLevel {
  label: string;
  price: number;
  pct:   number; // 0–100
}

export interface SwingLevel {
  price:    number;
  strength: number; // number of candles it held as a pivot
}

export interface CandlePattern {
  name:      string;
  direction: "bullish" | "bearish" | "neutral";
}

export interface Indicators {
  // Moving averages
  ma20:  number | null;
  ma50:  number | null;
  ma200: number | null;
  // Momentum
  rsi14: number | null;
  // Volatility
  atr14: number | null;
  // Trend strength
  adx14:   number | null;
  plusDI:  number | null;
  minusDI: number | null;
  // Volume
  avgVolume20: number | null;
  lastVolume:  number | null;
  volumeRatio: number | null;
  // Structure
  trend:      "uptrend" | "downtrend" | "sideways";
  support:    SwingLevel[];
  resistance: SwingLevel[];
  fibLevels:  FibLevel[] | null;
  lastPattern: CandlePattern | null;
  // % distance from key MAs
  pctFromMa20:  number | null;
  pctFromMa50:  number | null;
  pctFromMa200: number | null;
  dataPoints:   number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sma(arr: number[], period: number): number | null {
  if (arr.length < period) return null;
  const slice = arr.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function pctDiff(a: number, b: number): number {
  return ((a - b) / b) * 100;
}

// ── RSI-14 (Wilder's EMA) ──────────────────────────────────────────────────

function computeRSI(closes: number[], period = 14): number | null {
  if (closes.length <= period) return null;
  const changes = closes.slice(1).map((c, i) => c - closes[i]);

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    avgGain += Math.max(0, changes[i]!);
    avgLoss += Math.max(0, -(changes[i]!));
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + Math.max(0,  changes[i]!)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -(changes[i]!))) / period;
  }

  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

// ── ATR-14 (Wilder's EMA) ─────────────────────────────────────────────────

function computeATR(candles: OHLCV[], period = 14): number | null {
  if (candles.length < period + 1) return null;

  const trs = candles.slice(1).map((c, i) => {
    const prev = candles[i]!;
    return Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low  - prev.close),
    );
  });

  // Initial ATR = SMA of first `period` TRs
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Wilder's EMA forward
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]!) / period;
  }

  return atr;
}

// ── ADX / +DI / -DI (Wilder's EMA) ─────────────────────────────────────────

function computeADX(
  candles: OHLCV[],
  period = 14,
): { adx: number; plusDI: number; minusDI: number } | null {
  if (candles.length < period * 2 + 1) return null;

  const n     = candles.length;
  const trs:   number[] = [];
  const plusDMs:  number[] = [];
  const minusDMs: number[] = [];

  for (let i = 1; i < n; i++) {
    const cur  = candles[i]!;
    const prev = candles[i - 1]!;

    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low  - prev.close),
    );

    const upMove   = cur.high - prev.high;
    const downMove = prev.low - cur.low;

    const pdm = upMove   > downMove && upMove   > 0 ? upMove   : 0;
    const ndm = downMove > upMove   && downMove > 0 ? downMove : 0;

    trs.push(tr);
    plusDMs.push(pdm);
    minusDMs.push(ndm);
  }

  // Wilder's smoothed sums for first period
  let smTR   = trs.slice(0, period).reduce((a, b) => a + b, 0);
  let smPDM  = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
  let smNDM  = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);

  const dxArr: number[] = [];

  function calcDX(tr: number, pdm: number, ndm: number): number {
    if (tr === 0) return 0;
    const pdi = (pdm / tr) * 100;
    const ndi = (ndm / tr) * 100;
    const sum = pdi + ndi;
    if (sum === 0) return 0;
    return (Math.abs(pdi - ndi) / sum) * 100;
  }

  dxArr.push(calcDX(smTR, smPDM, smNDM));

  for (let i = period; i < trs.length; i++) {
    smTR  = smTR  - smTR  / period + trs[i]!;
    smPDM = smPDM - smPDM / period + plusDMs[i]!;
    smNDM = smNDM - smNDM / period + minusDMs[i]!;
    dxArr.push(calcDX(smTR, smPDM, smNDM));
  }

  // ADX = SMA of last `period` DX values then Wilder forward
  if (dxArr.length < period) return null;

  let adx = dxArr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dxArr.length; i++) {
    adx = (adx * (period - 1) + dxArr[i]!) / period;
  }

  // Final +DI / -DI from last smoothed values
  const plusDI  = smTR > 0 ? (smPDM / smTR) * 100 : 0;
  const minusDI = smTR > 0 ? (smNDM / smTR) * 100 : 0;

  return { adx, plusDI, minusDI };
}

// ── Support / Resistance (swing pivots) ─────────────────────────────────────

function computeSwingLevels(
  candles: OHLCV[],
  lookback = 5,
  maxLevels = 4,
): { support: SwingLevel[]; resistance: SwingLevel[] } {
  const price = candles[candles.length - 1]!.close;
  const pivotHighs: number[] = [];
  const pivotLows:  number[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i]!;
    let isHigh = true;
    let isLow  = true;

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      const n = candles[j]!;
      if (n.high >= c.high) isHigh = false;
      if (n.low  <= c.low ) isLow  = false;
    }

    if (isHigh) pivotHighs.push(c.high);
    if (isLow)  pivotLows.push(c.low);
  }

  // Cluster nearby levels within 0.5%
  function cluster(levels: number[]): number[] {
    const sorted = [...levels].sort((a, b) => a - b);
    const out: number[] = [];
    for (const v of sorted) {
      const last = out[out.length - 1];
      if (last === undefined || Math.abs(v - last) / last > 0.005) {
        out.push(v);
      } else {
        // replace with average
        out[out.length - 1] = (last + v) / 2;
      }
    }
    return out;
  }

  const resistance = cluster(pivotHighs)
    .filter(v => v > price)
    .slice(0, maxLevels)
    .map(p => ({ price: p, strength: 1 }));

  const support = cluster(pivotLows)
    .filter(v => v < price)
    .sort((a, b) => b - a)
    .slice(0, maxLevels)
    .map(p => ({ price: p, strength: 1 }));

  return { support, resistance };
}

// ── Fibonacci retracement ────────────────────────────────────────────────────

const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];

function computeFibLevels(candles: OHLCV[]): FibLevel[] | null {
  if (candles.length < 20) return null;

  const recent = candles.slice(-Math.min(120, candles.length));
  const high   = Math.max(...recent.map(c => c.high));
  const low    = Math.min(...recent.map(c => c.low));
  const range  = high - low;

  if (range === 0) return null;

  // Retracement levels from high → low (support zones when in downtrend)
  // and low → high (resistance zones when in uptrend)
  // We present as "distance from high" retracement: level = high - ratio × range
  return FIB_RATIOS.map(r => ({
    label: `${(r * 100).toFixed(1)}%`,
    price: high - r * range,
    pct:   r * 100,
  }));
}

// ── Candle patterns ──────────────────────────────────────────────────────────

function detectPattern(candles: OHLCV[]): CandlePattern | null {
  if (candles.length < 2) return null;

  const cur  = candles[candles.length - 1]!;
  const prev = candles[candles.length - 2]!;

  const body     = Math.abs(cur.close - cur.open);
  const range    = cur.high - cur.low;
  const upper    = cur.high - Math.max(cur.open, cur.close);
  const lower    = Math.min(cur.open, cur.close) - cur.low;
  const prevBody = Math.abs(prev.close - prev.open);

  if (range === 0) return null;

  // Doji
  if (body < range * 0.1) {
    return { name: "Doji", direction: "neutral" };
  }

  // Hammer (bullish): small body at top, long lower shadow, in downtrend
  if (lower > body * 2 && upper < body && prev.close < prev.open) {
    return { name: "Hammer", direction: "bullish" };
  }

  // Shooting Star (bearish): small body at bottom, long upper shadow, in uptrend
  if (upper > body * 2 && lower < body && prev.close > prev.open) {
    return { name: "Shooting Star", direction: "bearish" };
  }

  // Bullish Engulfing
  if (
    prev.close < prev.open &&
    cur.close > cur.open &&
    cur.close > prev.open &&
    cur.open  < prev.close &&
    body > prevBody
  ) {
    return { name: "Bullish Engulfing", direction: "bullish" };
  }

  // Bearish Engulfing
  if (
    prev.close > prev.open &&
    cur.close < cur.open &&
    cur.open  > prev.close &&
    cur.close < prev.open &&
    body > prevBody
  ) {
    return { name: "Bearish Engulfing", direction: "bearish" };
  }

  return null;
}

// ── Trend structure ──────────────────────────────────────────────────────────

function detectTrend(
  price: number,
  ma20: number | null,
  ma50: number | null,
): "uptrend" | "downtrend" | "sideways" {
  if (ma20 !== null && ma50 !== null) {
    if (price > ma20 && ma20 > ma50)  return "uptrend";
    if (price < ma20 && ma20 < ma50)  return "downtrend";
    return "sideways";
  }
  if (ma20 !== null) {
    if (price > ma20 * 1.02) return "uptrend";
    if (price < ma20 * 0.98) return "downtrend";
    return "sideways";
  }
  return "sideways";
}

// ── Main compute function ────────────────────────────────────────────────────

export function computeIndicators(candles: OHLCV[]): Indicators {
  const closes  = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  const price   = closes[closes.length - 1] ?? 0;

  const ma20  = sma(closes, 20);
  const ma50  = sma(closes, 50);
  const ma200 = sma(closes, 200);
  const rsi14 = computeRSI(closes, 14);
  const atr14 = computeATR(candles, 14);
  const adxResult = computeADX(candles, 14);

  const avgVolume20 = sma(volumes, 20);
  const lastVolume  = volumes[volumes.length - 1] ?? null;
  const volumeRatio = avgVolume20 && lastVolume ? lastVolume / avgVolume20 : null;

  const trend = detectTrend(price, ma20, ma50);

  const { support, resistance } = computeSwingLevels(candles);
  const fibLevels  = computeFibLevels(candles);
  const lastPattern = detectPattern(candles);

  const pctFromMa20  = ma20  && price ? pctDiff(price, ma20)  : null;
  const pctFromMa50  = ma50  && price ? pctDiff(price, ma50)  : null;
  const pctFromMa200 = ma200 && price ? pctDiff(price, ma200) : null;

  return {
    ma20,
    ma50,
    ma200,
    rsi14,
    atr14,
    adx14:   adxResult?.adx    ?? null,
    plusDI:  adxResult?.plusDI  ?? null,
    minusDI: adxResult?.minusDI ?? null,
    avgVolume20,
    lastVolume:  lastVolume ?? null,
    volumeRatio,
    trend,
    support,
    resistance,
    fibLevels,
    lastPattern,
    pctFromMa20,
    pctFromMa50,
    pctFromMa200,
    dataPoints: candles.length,
  };
}
