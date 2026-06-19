/**
 * Asset-type detection for branching analysis logic.
 *
 * Finnhub profile2 returns {} for ETFs/ETPs and a full object for stocks.
 * We use this as the primary detection signal, with a ticker-pattern heuristic
 * as a secondary check.
 */

export type AssetType = "stock" | "etf" | "reit" | "adr" | "unknown";

const REIT_KEYWORDS = /\breit\b|real estate investment/i;

export function detectAssetType(profile: { name?: string | null; finnhubIndustry?: string | null; exchange?: string | null } | null): AssetType {
  if (!profile || !profile.name) return "etf";

  const industry = (profile.finnhubIndustry ?? "").toLowerCase();
  const name     = (profile.name ?? "").toLowerCase();

  if (REIT_KEYWORDS.test(industry) || REIT_KEYWORDS.test(name)) return "reit";

  const exchange = (profile.exchange ?? "").toUpperCase();
  if (exchange.includes("ADR") || name.includes(" adr")) return "adr";

  return "stock";
}

export function assetTypeLabel(type: AssetType, locale: "en" | "th"): string {
  const labels: Record<AssetType, { en: string; th: string }> = {
    stock:   { en: "Common Stock",  th: "หุ้นสามัญ" },
    etf:     { en: "ETF / ETP",     th: "กองทุน ETF" },
    reit:    { en: "REIT",          th: "REIT" },
    adr:     { en: "ADR",           th: "ADR" },
    unknown: { en: "Unknown",       th: "ไม่ทราบประเภท" },
  };
  return labels[type][locale];
}

/**
 * Distinguish between "metric doesn't apply to this asset type" vs
 * "metric applies but data couldn't be fetched."
 */
export type MetricStatus = "available" | "not_applicable" | "unavailable";

export function formatMetric(
  value: number | string | null | undefined,
  status: MetricStatus,
  locale: "en" | "th",
): string {
  if (status === "not_applicable") {
    return locale === "en" ? "— (not applicable)" : "— (ไม่เกี่ยวข้อง)";
  }
  if (value == null || value === "N/A") {
    return locale === "en" ? "N/A (data unavailable)" : "N/A (ไม่มีข้อมูล)";
  }
  return String(value);
}
