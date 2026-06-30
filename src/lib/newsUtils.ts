// HTML entities to decode — covers the most common ones in news feeds
const HTML_ENTITIES: Record<string, string> = {
  "&amp;":   "&",
  "&lt;":    "<",
  "&gt;":    ">",
  "&quot;":  '"',
  "&#39;":   "'",
  "&apos;":  "'",
  "&nbsp;":  " ",
  "&ndash;": "–",
  "&mdash;": "—",
  "&lsquo;": "'",
  "&rsquo;": "'",
  "&ldquo;": '"',
  "&rdquo;": '"',
  "&hellip;":"…",
  "&bull;":  "•",
  "&copy;":  "©",
  "&reg;":   "®",
  "&trade;": "™",
};

function decodeEntities(text: string): string {
  // Named entities
  let result = text.replace(/&[a-z]+;/gi, (e) => HTML_ENTITIES[e.toLowerCase()] ?? e);
  // Numeric entities (decimal and hex)
  result = result.replace(/&#(\d+);/g, (_, n: string) =>
    String.fromCharCode(parseInt(n, 10))
  );
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, h: string) =>
    String.fromCharCode(parseInt(h, 16))
  );
  return result;
}

/**
 * Strip all HTML tags from a string, decode entities, collapse whitespace.
 * Safe to call on untrusted news feed content.
 */
export function stripHtml(raw: string): string {
  if (!raw) return "";
  return decodeEntities(
    raw
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")   // drop <style> blocks
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ") // drop <script> blocks
      .replace(/<[^>]+>/g, " ")                           // remove remaining tags
  )
    .replace(/\s+/g, " ")
    .trim();
}

// Topics that appear in company-news feeds but are not about a company's business
const OFFSIDE_KEYWORDS = [
  // sports competitions
  "premier league", "champions league", "la liga", "bundesliga", "serie a", "ligue 1",
  "europa league", "conference league", "fa cup", "carabao cup",
  "world cup", "fifa world cup", "copa america", "africa cup",
  "euro 2024", "euro 2025", "euro 2026", "euro 2027",
  "nfl draft", "nba draft", "mlb draft", "nfl game", "nba game",
  "nhl game", "mls cup", "ncaa tournament", "march madness",
  "wimbledon", "us open tennis", "french open", "australian open",
  "super bowl", "superbowl", "nascar race", "formula 1 grand prix", "f1 grand prix",
  "cricket match", "cricket world cup", "rugby world cup", "rugby match",
  "golf tournament", "pga tour", "masters tournament",
  "olympic games", "olympics 2024", "olympics 2026",
  "world athletics", "tour de france",
  // entertainment / celebrity
  "box office", "emmy award", "grammy award", "oscar award", "golden globe",
  "academy award", "billboard chart", "music video",
  "taylor swift", "beyoncé", "kardashian", "celebrity",
  // football clubs (often tagged as sponsors)
  "real madrid", "manchester united", "manchester city",
  "arsenal fc", "chelsea fc", "liverpool fc", "tottenham",
  "barcelona fc", "atletico madrid", "juventus", "inter milan", "ac milan",
  "paris saint-germain", "psg fc", "borussia dortmund", "rb leipzig",
  "elimination round", "knockout round", "group stage", "semifinal match", "final match",
  "vs.", "versus", // sport score/matchup headlines (e.g. "Brazil vs. Argentina")
];

// At least one of these must appear in a stock-news article
const FINANCIAL_KEYWORDS = [
  "stock", "share", "equity", "market", "trading", "investor", "investment",
  "earnings", "revenue", "profit", "loss", "income", "ebitda", "margin",
  "quarterly", "annual", "fiscal", "q1", "q2", "q3", "q4",
  "ceo", "cfo", "board", "acquisition", "merger", "ipo", "buyback", "dividend",
  "analyst", "upgrade", "downgrade", "price target", "rating", "outlook",
  "guidance", "forecast", "valuation", "pe ratio", "eps",
  "billion", "million", "fund", "portfolio", "hedge", "etf",
  "nasdaq", "nyse", "s&p", "dow jones", "russell",
  "rally", "decline", "surge", "plunge", "soar", "tumble", "gain", "fell",
  "inflation", "interest rate", "fed", "federal reserve", "treasury",
  "crypto", "bitcoin", "blockchain", "defi",
  "sales", "growth", "layoff", "hire", "contract", "deal", "partnership",
];

/**
 * Returns false for articles that are clearly not about stocks or financial markets.
 * Two-stage filter: blocklist for obvious non-stock content, then require at least
 * one financial keyword so sponsored-content leakage is caught even without a matching block term.
 */
export function isStockRelated(headline: string, summary: string): boolean {
  const text = `${headline} ${summary}`.toLowerCase();
  if (OFFSIDE_KEYWORDS.some(kw => text.includes(kw))) return false;
  return FINANCIAL_KEYWORDS.some(kw => text.includes(kw));
}

const TEASER_MAX = 180;

/**
 * Return a short plain-text teaser from provider HTML/text.
 * - Strips HTML, decodes entities
 * - Truncates to the first ~180 chars, cutting at a sentence boundary if possible
 */
export function newsTeaser(raw: string, maxLen = TEASER_MAX): string {
  const clean = stripHtml(raw);
  if (!clean) return "";
  if (clean.length <= maxLen) return clean;

  const chunk = clean.slice(0, maxLen);
  // Prefer a sentence boundary (. ! ?)
  const sentenceEnd = Math.max(
    chunk.lastIndexOf(". "),
    chunk.lastIndexOf("! "),
    chunk.lastIndexOf("? "),
  );
  const cutAt = sentenceEnd > maxLen * 0.6 ? sentenceEnd + 1 : chunk.lastIndexOf(" ");
  return clean.slice(0, cutAt > 0 ? cutAt : maxLen).trimEnd() + "…";
}
