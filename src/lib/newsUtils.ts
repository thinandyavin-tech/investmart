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

// Topics that appear in company-news feeds but are not about the stock or its business
const OFFSIDE_KEYWORDS = [
  // sports leagues
  "premier league", "champions league", "la liga", "bundesliga", "serie a", "ligue 1",
  "europa league", "fa cup", "world cup", "euro 2024", "euro 2025", "euro 2026",
  "nfl", "nba", "mlb", "nhl", "mls", "ncaa", "march madness",
  "wimbledon", "us open", "french open", "australian open", "olympic", "olympics",
  "super bowl", "superbowl", "nascar", "formula 1", "f1 race",
  "cricket", "rugby", "golf tournament", "pga tour",
  // entertainment / celebrity
  "box office", "emmy", "grammy", "oscar", "golden globe",
  "taylor swift", "beyoncé", "kardashian",
  // unrelated business but recurring false positives
  "real madrid", "manchester", "arsenal fc", "chelsea fc", "liverpool fc",
  "barcelona fc", "juventus", "inter milan",
];

/**
 * Returns false for articles whose headline or summary are clearly not
 * about stocks, companies, or financial markets.
 */
export function isStockRelated(headline: string, summary: string): boolean {
  const text = `${headline} ${summary}`.toLowerCase();
  return !OFFSIDE_KEYWORDS.some(kw => text.includes(kw));
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
