// Sample WACC estimates (approximate Damodaran US-market figures).
// UPDATE ANNUALLY: https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datacurrent.html
// Load January data each year and replace the values below.

export const WACC_NOTE =
  "Sample data — replace with Damodaran figures each January";

const WACC_TABLE: Readonly<Record<string, number>> = {
  "Software—Application":     0.102,
  "Software—Infrastructure":  0.101,
  "Technology":               0.103,
  "Semiconductors":           0.110,
  "Computer Hardware":        0.097,
  "Consumer Electronics":     0.098,
  "Aerospace & Defense":      0.089,
  "Biotechnology":            0.120,
  "Healthcare":               0.089,
  "Drug Manufacturers—General": 0.086,
  "Medical Devices":          0.091,
  "Financial Services":       0.076,
  "Banks—Diversified":        0.082,
  "Banks—Global":             0.082,
  "Insurance":                0.079,
  "Consumer Cyclical":        0.090,
  "Consumer Defensive":       0.079,
  "Communication Services":   0.087,
  "Media":                    0.089,
  "Industrials":              0.089,
  "Specialty Industrial Machinery": 0.089,
  "Automotive":               0.092,
  "Energy":                   0.101,
  "Basic Materials":          0.090,
  "Real Estate":              0.073,
  "Utilities—Regulated":      0.063,
  "Utilities":                0.063,
  "Transportation":           0.082,
  "Retail":                   0.087,
} as const;

export const DEFAULT_WACC = 0.10;

export function getWaccForIndustry(
  industry: string | null | undefined,
): { wacc: number; source: string } {
  if (!industry) {
    return {
      wacc:   DEFAULT_WACC,
      source: `Default (unknown industry) — ${WACC_NOTE}`,
    };
  }

  const direct = WACC_TABLE[industry];
  if (direct !== undefined) {
    return {
      wacc:   direct,
      source: `Industry: ${industry} — ${WACC_NOTE}`,
    };
  }

  // Partial-match fallback
  const lower   = industry.toLowerCase();
  const matched = Object.entries(WACC_TABLE).find(
    ([k]) => k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase()),
  );
  if (matched) {
    return {
      wacc:   matched[1],
      source: `Industry: ${matched[0]} (best match) — ${WACC_NOTE}`,
    };
  }

  return {
    wacc:   DEFAULT_WACC,
    source: `Default (no match for "${industry}") — ${WACC_NOTE}`,
  };
}
