export interface StockMetrics {
  ticker: string;
  price: number;
  change1D: number;        // % change vs prev close
  volume: number;
  avgVolume: number;
  marketCap: number;
  rsi: number;
  volumeSurge: number;     // volume / avgVolume
  breakoutScore: number;   // 0–100
  qualityScore: number;    // 0–100
  momentumScore: number;   // composite 0–100
  category: "TOP100" | "DARK_HORSE" | "REVIVED" | "STRONG";
  companyName: string;
  exchange: string;
  sector: string;
  isNew: boolean;
}

export type CapSize = "ALL" | "SMALL" | "MID" | "BIG";

const CAP_SMALL  = 300_000_000;
const CAP_MID    = 100_000_000_000;

export function filterByCapSize(metrics: StockMetrics, size: CapSize): boolean {
  if (size === "ALL") return true;
  if (size === "SMALL") return metrics.marketCap < CAP_SMALL;
  if (size === "MID")   return metrics.marketCap >= CAP_SMALL && metrics.marketCap < CAP_MID;
  if (size === "BIG")   return metrics.marketCap >= CAP_MID;
  return true;
}

export function computeScores(
  change1D: number,
  volume: number,
  avgVolume: number,
  rsi: number,
  marketCap: number,
  prevWeekChange?: number
): Pick<StockMetrics, "volumeSurge" | "breakoutScore" | "qualityScore" | "momentumScore" | "category"> {
  const volumeSurge = avgVolume > 0 ? volume / avgVolume : 1;

  // Breakout score: weighted mix of 1D move + volume surge
  const breakoutScore = Math.min(
    100,
    Math.round(
      Math.max(0, change1D) * 3 +
      Math.min(50, (volumeSurge - 1) * 10) +
      (rsi > 60 ? (rsi - 60) * 0.5 : 0)
    )
  );

  // Quality score: RSI in healthy range (45–75), decent market cap, not a dead penny
  const rsiQuality    = rsi >= 45 && rsi <= 75 ? 40 : rsi > 75 ? 20 : 10;
  const capQuality    = marketCap > CAP_MID ? 30 : marketCap > CAP_SMALL ? 20 : 5;
  const surgeQuality  = volumeSurge >= 1.5 ? 30 : volumeSurge >= 1 ? 15 : 0;
  const qualityScore  = Math.min(100, rsiQuality + capQuality + surgeQuality);

  // Composite momentum score
  const momentumScore = Math.round(
    breakoutScore * 0.5 + qualityScore * 0.3 + Math.min(20, volumeSurge * 2)
  );

  // Categorise
  let category: StockMetrics["category"] = "TOP100";
  if (marketCap < CAP_SMALL && volumeSurge > 2) {
    category = "DARK_HORSE";
  } else if (prevWeekChange !== undefined && prevWeekChange < -10 && change1D > 3) {
    category = "REVIVED";
  } else if (qualityScore >= 70 && change1D > 0) {
    category = "STRONG";
  }

  return { volumeSurge, breakoutScore, qualityScore, momentumScore, category };
}

export function computeRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}
