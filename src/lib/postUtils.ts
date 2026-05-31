const CASHTAG_RE = /\$([A-Z][A-Z.\-]{0,9})/g;
const MAX_CONTENT_LENGTH = 500;

export function validateContent(content: unknown): string | null {
  if (typeof content !== "string") return null;
  const trimmed = content.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_CONTENT_LENGTH) return null;
  return trimmed;
}

export function extractCashtags(content: string): string[] {
  const matches = [...content.matchAll(CASHTAG_RE)];
  return [...new Set(matches.map((m) => m[1]))];
}

export function relativeTime(date: Date): string {
  const diffMs  = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return "ไม่กี่วินาที";
  if (diffMin < 60) return `${diffMin} นาที`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH} ชั่วโมง`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)    return `${diffD} วัน`;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export const MAX_CONTENT = MAX_CONTENT_LENGTH;
