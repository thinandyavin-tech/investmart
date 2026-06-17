const STARTING_THB = 1_250_000;

export type TierKey = "SEED" | "TRADER" | "SMART" | "PRO" | "LEGEND";

export interface Tier {
  key:    TierKey;
  label:  string;       // Thai label
  en:     string;       // English short label
  color:  string;       // Tailwind bg-compatible hex
  text:   string;       // Text color hex
  border: string;       // Border color hex
  next:   string | null; // Description of what unlocks next tier
}

const TIERS: Record<TierKey, Tier> = {
  SEED: {
    key:    "SEED",
    label:  "เมล็ดพันธุ์",
    en:     "SEED",
    color:  "#e9edc9",
    text:   "#5A4E42",
    border: "#ccd5ae",
    next:   "เทรด 5 ครั้งเพื่อขึ้นเป็น TRADER",
  },
  TRADER: {
    key:    "TRADER",
    label:  "นักเทรด",
    en:     "TRADER",
    color:  "#DBEAFE",
    text:   "#1E40AF",
    border: "#BFDBFE",
    next:   "เทรด 20 ครั้ง + กำไร > 0% เพื่อขึ้นเป็น SMART",
  },
  SMART: {
    key:    "SMART",
    label:  "สมาร์ทมันนี่",
    en:     "SMART",
    color:  "#F0FDF4",
    text:   "#166534",
    border: "#BBF7D0",
    next:   "เทรด 50 ครั้ง + กำไร > 10% เพื่อขึ้นเป็น PRO",
  },
  PRO: {
    key:    "PRO",
    label:  "มือโปร",
    en:     "PRO",
    color:  "#FEF9C3",
    text:   "#854D0E",
    border: "#FDE047",
    next:   "เทรด 100 ครั้ง + กำไร > 25% เพื่อขึ้นเป็น LEGEND",
  },
  LEGEND: {
    key:    "LEGEND",
    label:  "ตำนาน",
    en:     "LEGEND",
    color:  "#1F1A14",
    text:   "#faedcd",
    border: "#5B8A2A",
    next:   null,
  },
};

export function getTierInfo(key: TierKey): Tier {
  return TIERS[key];
}

export interface TierInput {
  pnlPct:     number;
  tradeCount: number;
}

export function computeTier({ pnlPct, tradeCount }: TierInput): TierKey {
  if (tradeCount >= 100 && pnlPct >= 25) return "LEGEND";
  if (tradeCount >= 50  && pnlPct >= 10) return "PRO";
  if (tradeCount >= 20  && pnlPct >= 0)  return "SMART";
  if (tradeCount >= 5)                   return "TRADER";
  return "SEED";
}

export type BadgeKey =
  | "FIRST_TRADE"
  | "TEN_TRADES"
  | "FIFTY_TRADES"
  | "HUNDRED_TRADES"
  | "DIVERSIFIED"
  | "IN_PROFIT"
  | "BIG_PROFIT"
  | "MARKET_BEATER";

export interface Badge {
  key:   BadgeKey;
  label: string;
  desc:  string;
  icon:  string;
}

const BADGE_DEFS: Record<BadgeKey, Badge> = {
  FIRST_TRADE:    { key: "FIRST_TRADE",    icon: "⚡", label: "ซื้อครั้งแรก",   desc: "ทำธุรกรรมแรกสำเร็จ" },
  TEN_TRADES:     { key: "TEN_TRADES",     icon: "🔟", label: "10 เทรด",         desc: "ทำธุรกรรมครบ 10 ครั้ง" },
  FIFTY_TRADES:   { key: "FIFTY_TRADES",   icon: "🔥", label: "50 เทรด",         desc: "ทำธุรกรรมครบ 50 ครั้ง" },
  HUNDRED_TRADES: { key: "HUNDRED_TRADES", icon: "💯", label: "100 เทรด",        desc: "ทำธุรกรรมครบ 100 ครั้ง" },
  DIVERSIFIED:    { key: "DIVERSIFIED",    icon: "🌐", label: "กระจายความเสี่ยง", desc: "ถือหุ้นอย่างน้อย 5 ตัว" },
  IN_PROFIT:      { key: "IN_PROFIT",      icon: "📈", label: "พอร์ตกำไร",       desc: "พอร์ตรวมเป็นบวก" },
  BIG_PROFIT:     { key: "BIG_PROFIT",     icon: "🏆", label: "กำไร 10%+",       desc: "ผลตอบแทน +10% ขึ้นไป" },
  MARKET_BEATER:  { key: "MARKET_BEATER",  icon: "🚀", label: "ชนะตลาด",        desc: "ผลตอบแทน +25% ขึ้นไป" },
};

export function getBadgeDef(key: BadgeKey): Badge {
  return BADGE_DEFS[key];
}

export interface BadgeInput {
  tradeCount:  number;
  holdingCount: number;
  pnlPct:      number;
}

export function computeBadges({ tradeCount, holdingCount, pnlPct }: BadgeInput): BadgeKey[] {
  const earned: BadgeKey[] = [];
  if (tradeCount >= 1)   earned.push("FIRST_TRADE");
  if (tradeCount >= 10)  earned.push("TEN_TRADES");
  if (tradeCount >= 50)  earned.push("FIFTY_TRADES");
  if (tradeCount >= 100) earned.push("HUNDRED_TRADES");
  if (holdingCount >= 5) earned.push("DIVERSIFIED");
  if (pnlPct > 0)        earned.push("IN_PROFIT");
  if (pnlPct >= 10)      earned.push("BIG_PROFIT");
  if (pnlPct >= 25)      earned.push("MARKET_BEATER");
  return earned;
}

export function computePnlPct(
  cashThb: number,
  cashUsd: number,
  holdings: { shares: number; avgCost: number }[],
  fxRate = 35.2,
): number {
  const holdingValue = holdings.reduce((s, h) => s + h.shares * h.avgCost * fxRate, 0);
  const totalThb     = cashThb + cashUsd * fxRate + holdingValue;
  return ((totalThb - STARTING_THB) / STARTING_THB) * 100;
}
