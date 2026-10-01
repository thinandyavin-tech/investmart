import { prisma } from "@/lib/prisma";
import { CATALOG } from "@/lib/stockCatalog";

// ─── Company names → tickers ───────────────────────────────────────────────────
// Lets people write "nvidia", "Apple" or "แอปเปิล" instead of $NVDA / AAPL.

const ALIASES: Record<string, string> = {
  google: "GOOGL", alphabet: "GOOGL", facebook: "META", meta: "META", amazon: "AMZN",
  microsoft: "MSFT", apple: "AAPL", nvidia: "NVDA", tesla: "TSLA", netflix: "NFLX",
  broadcom: "AVGO", berkshire: "BRK.B", "coca-cola": "KO", coke: "KO", disney: "DIS",
  walmart: "WMT", costco: "COST", intel: "INTC", amd: "AMD", palantir: "PLTR", tsmc: "TSM",
  "แอปเปิล": "AAPL", "แอปเปิ้ล": "AAPL", "เอ็นวิเดีย": "NVDA", "เทสลา": "TSLA", "ไมโครซอฟท์": "MSFT",
  "กูเกิล": "GOOGL", "กูเกิ้ล": "GOOGL", "อเมซอน": "AMZN", "แอมะซอน": "AMZN", "เมตา": "META",
  "เน็ตฟลิกซ์": "NFLX", "อินเทล": "INTC", "ดิสนีย์": "DIS", "โคคาโคล่า": "KO", "พาแลนเทียร์": "PLTR",
};

// Generic first words that must never resolve to a company on their own.
const STOP = new Set(["the", "first", "general", "american", "united", "international", "global",
  "national", "southern", "western", "eastern", "public", "american", "bank", "capital", "digital",
  "energy", "health", "financial", "data", "realty", "royal", "news", "match", "target", "visa",
  "best", "booking", "public", "service", "advanced", "applied", "texas", "marathon", "baker"]);

let nameIndex: Map<string, string> | null = null;

function getNameIndex(): Map<string, string> {
  if (nameIndex) return nameIndex;
  const counts = new Map<string, number>();
  const first  = new Map<string, string>();
  for (const e of CATALOG.values()) {
    const w = e.name.toLowerCase().split(/[\s.,&]+/)[0] ?? "";
    if (w.length < 4 || STOP.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
    if (!first.has(w)) first.set(w, e.ticker);
  }
  nameIndex = new Map([...first].filter(([w]) => counts.get(w) === 1));
  return nameIndex;
}

/** Tickers named in free text by company name (English or common Thai names). */
export function tickersFromNames(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [alias, ticker] of Object.entries(ALIASES)) {
    const isThai = /[฀-๿]/.test(alias);
    const hit = isThai ? lower.includes(alias) : new RegExp(`\\b${alias.replace(/[-.]/g, "\\$&")}\\b`).test(lower);
    if (hit && !found.includes(ticker)) found.push(ticker);
  }
  const idx = getNameIndex();
  for (const word of lower.match(/[a-z][a-z-]{3,}/g) ?? []) {
    const t = idx.get(word);
    if (t && !found.includes(t)) found.push(t);
  }
  return found;
}

// ─── The signed-in user's own account ──────────────────────────────────────────

interface Quote { c: number; pc: number }

async function quote(ticker: string, apiKey: string): Promise<Quote | null> {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(3000), next: { revalidate: 0 } });
    if (!res.ok) return null;
    const q = (await res.json()) as Quote;
    return q.c > 0 ? q : null;
  } catch { return null; }
}

const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });

/** A plain-text block describing ONLY this user's paper account, for Martin's system prompt. */
export async function buildUserBlock(userId: string, apiKey: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      name: true, username: true, cashThb: true, cashUsd: true,
      holdings:    { select: { ticker: true, shares: true, avgCost: true, currency: true } },
      watchlist:   { select: { ticker: true }, take: 30 },
      priceAlerts: { where: { triggered: false }, select: { ticker: true, condition: true, threshold: true }, take: 20 },
    },
  }).catch(() => null);
  if (!user) return "";

  const lines = ["=== THIS USER'S PAPER-TRADING ACCOUNT (private to them — only discuss with this user) ==="];
  lines.push(`Name: ${user.username ?? user.name ?? "Investor"}`);
  lines.push(`Cash: $${fmt(user.cashUsd)} USD · ฿${fmt(user.cashThb)} THB (USD is needed to buy US stocks; they can convert on the Exchange page)`);

  if (user.holdings.length === 0) {
    lines.push("Holdings: none yet.");
  } else {
    const held = user.holdings.slice(0, 15);
    const quotes = await Promise.all(held.map(h => quote(h.ticker, apiKey)));
    let value = 0, cost = 0;
    lines.push("Holdings (ticker · shares · avg cost · live price · P&L):");
    held.forEach((h, i) => {
      const q = quotes[i];
      const c = h.shares * h.avgCost;
      cost += c;
      if (q) {
        const v = h.shares * q.c;
        value += v;
        lines.push(`  ${h.ticker} · ${fmt(h.shares, 4)} · $${fmt(h.avgCost)} · $${fmt(q.c)} (${fmt(((q.c - q.pc) / q.pc) * 100)}% today) · ${v - c >= 0 ? "+" : ""}$${fmt(v - c)} (${fmt(((v - c) / c) * 100)}%)`);
      } else {
        value += c;
        lines.push(`  ${h.ticker} · ${fmt(h.shares, 4)} · $${fmt(h.avgCost)} · price unavailable`);
      }
    });
    lines.push(`Holdings total: value ≈ $${fmt(value)} vs cost $${fmt(cost)} → ${value - cost >= 0 ? "+" : ""}$${fmt(value - cost)}`);
  }

  lines.push(`Watchlist: ${user.watchlist.length ? user.watchlist.map(w => w.ticker).join(", ") : "empty"}`);
  lines.push(`Active price alerts: ${user.priceAlerts.length
    ? user.priceAlerts.map(a => `${a.ticker} ${a.condition} $${fmt(a.threshold)}`).join(" | ")
    : "none"}`);
  lines.push("=== end account ===");
  return lines.join("\n");
}

/** Tickers the user holds — so "how is my portfolio?" pulls their data without naming stocks. */
export async function heldTickers(userId: string): Promise<string[]> {
  const rows = await prisma.holding.findMany({ where: { userId }, select: { ticker: true }, take: 15 }).catch(() => []);
  return rows.map(r => r.ticker);
}
