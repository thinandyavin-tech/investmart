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
