import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rateLimit";
import { z } from "zod";
import { computeRdcf, type RdcfResult } from "@/lib/rdcfMath";
import { getWaccForIndustry } from "@/lib/waccIndustry";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  g:              0.03,
  taxRate:        0.21,
  roic:           0.15,
  n:              10,
  maxPenetration: 0.30,
  buffer:         0.05,
  absoluteCap:    0.45,
} as const;

const QuerySchema = z.object({
  ticker:          z.string().regex(/^[A-Z][A-Z.\-]{0,9}$/),
  wacc:            z.coerce.number().min(0.01).max(0.50).optional(),
  g:               z.coerce.number().min(0).max(0.15).optional(),
  terminalMargin:  z.coerce.number().min(0.001).max(1).optional(),
  taxRate:         z.coerce.number().min(0).max(0.60).optional(),
  roic:            z.coerce.number().min(0.001).max(5).optional(),
  n:               z.coerce.number().int().min(5).max(20).optional(),
  maxPenetration:  z.coerce.number().min(0.01).max(1).optional(),
  buffer:          z.coerce.number().min(0).max(0.20).optional(),
  absoluteCap:     z.coerce.number().min(0.10).max(1.00).optional(),
  evB:             z.coerce.number().positive().optional(),       // user-entered EV in $B
  revenueB:        z.coerce.number().positive().optional(),       // user-entered revenue in $B
  tamB:            z.coerce.number().positive().optional(),       // user-entered TAM in $B
});

interface FinnhubMetricAll {
  revenueTTM?:          number;   // USD millions
  revenueGrowth3Y?:     number;   // decimal or percent — detect by magnitude
  revenue3YGrowth?:     number;
  netProfitMarginTTM?:  number;
  netMarginTTM?:        number;
  enterpriseValue?:     number;   // USD millions
  marketCapitalization?: number;  // USD millions
  [key: string]: unknown;
}

interface FinnhubProfile {
  name?:                 string;
  finnhubIndustry?:      string;
  marketCapitalization?: number;  // USD millions
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, {
      next:   { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

// Finnhub sometimes returns growth rates as 25.0 (percent) instead of 0.25 (decimal)
function normalizeRate(v: number | undefined | null): number | null {
  if (v == null) return null;
  return Math.abs(v) > 2 ? v / 100 : v;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "default");
  if (limited) return limited;
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API not configured" }, { status: 503 });

  // Strip empty strings before Zod parse (empty optional fields → undefined)
  const rawParams: Record<string, string> = {};
  for (const [k, v] of request.nextUrl.searchParams.entries()) {
    if (v !== "") rawParams[k] = v;
  }

  const parsed = QuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid params" }, { status: 422 });
  }
  const q = parsed.data;

  const base = "https://finnhub.io/api/v1";
  const tok  = `token=${apiKey}`;
  const sym  = encodeURIComponent(q.ticker);

  const [profileR, metricR] = await Promise.allSettled([
    fetchJson<FinnhubProfile>(`${base}/stock/profile2?symbol=${sym}&${tok}`),
    fetchJson<{ metric?: FinnhubMetricAll }>(`${base}/stock/metric?symbol=${sym}&metric=all&${tok}`),
  ]);

  const profile  = profileR.status  === "fulfilled" ? profileR.value  : null;
  const metricRaw = metricR.status  === "fulfilled" ? metricR.value?.metric ?? null : null;

  // Auto-fill from Finnhub (all stored in raw USD internally)
  const revM      = metricRaw?.revenueTTM;
  const evM       = metricRaw?.enterpriseValue;
  const mcapM     = profile?.marketCapitalization ?? metricRaw?.marketCapitalization;

  const revTTM_raw: number | null = revM != null ? revM * 1e6 : null;
  const ev_raw:     number | null = evM  != null ? evM  * 1e6 : (mcapM != null ? mcapM * 1e6 : null);
  const evSource    = evM  != null ? "direct" : (mcapM != null ? "marketCapProxy" : null);

  const hist3Y     = normalizeRate(
    metricRaw?.revenueGrowth3Y ?? metricRaw?.revenue3YGrowth ?? null,
  );
  const netMargin  = normalizeRate(
    metricRaw?.netProfitMarginTTM ?? (metricRaw?.netMarginTTM as number | undefined) ?? null,
  );

  const industry  = profile?.finnhubIndustry ?? null;
  const waccInfo  = getWaccForIndustry(industry);

  // Merge: query overrides take precedence over auto-fill
  const ev         = q.evB      ? q.evB      * 1e9 : ev_raw;
  const revenueTTM = q.revenueB ? q.revenueB * 1e9 : revTTM_raw;
  const tam        = q.tamB     ? q.tamB     * 1e9 : null;
  const wacc       = q.wacc           ?? waccInfo.wacc;
  const g          = q.g              ?? DEFAULTS.g;
  const termMargin = q.terminalMargin ?? null;
  const taxRate    = q.taxRate        ?? DEFAULTS.taxRate;
  const roic       = q.roic           ?? DEFAULTS.roic;
  const n          = q.n              ?? DEFAULTS.n;
  const maxPen     = q.maxPenetration ?? DEFAULTS.maxPenetration;
  const buffer     = q.buffer         ?? DEFAULTS.buffer;
  const absCap     = q.absoluteCap    ?? DEFAULTS.absoluteCap;

  const missingInputs: string[] = [];
  if (!ev)         missingInputs.push("ev");
  if (!revenueTTM) missingInputs.push("revenueTTM");
  if (!termMargin) missingInputs.push("terminalMargin");

  let result: RdcfResult | null = null;
  if (ev && revenueTTM && termMargin) {
    result = computeRdcf({
      ev, revenueTTM, wacc, g,
      terminalMargin: termMargin, taxRate, roic, n,
      historicalCAGR3Y: hist3Y, tam, maxPenetration: maxPen,
      buffer, absoluteCap: absCap,
    });
  }

  return NextResponse.json({
    autoFill: {
      ev: ev_raw, evSource,
      revenueTTM: revTTM_raw,
      historicalCAGR3Y: hist3Y,
      netMarginTTM: netMargin,
      industry,
      waccSuggested: waccInfo.wacc,
      waccSource: waccInfo.source,
    },
    assumptions: {
      ev, revenueTTM, wacc, g,
      terminalMargin: termMargin, taxRate, roic, n,
      tam, maxPenetration: maxPen, buffer, absoluteCap: absCap,
    },
    result,
    missingInputs,
  });
}
