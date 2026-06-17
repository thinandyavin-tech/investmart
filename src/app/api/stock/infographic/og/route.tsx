/**
 * Satori PNG endpoint — direct Finnhub fetch, no self-referential call, no LLM.
 * Renders in <5s on edge runtime. The inline StockInfographic has the AI narrative;
 * this PNG is the shareable data snapshot with correct Thai via embedded fonts.
 *
 * GET /api/stock/infographic/og?ticker=NVDA&locale=en&format=square|portrait
 */
import { ImageResponse } from "next/og";
import { NextRequest }   from "next/server";

export const runtime    = "edge";
export const maxDuration = 15;

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;

const CREAM  = "#fefae0";
const INK    = "#1A1A1A";
const ACCENT = "#8B5CF6";
const MUTED  = "#6B6B6B";
const GAIN   = "#1F9D55";
const LOSS   = "#D64545";
const BORDER = "#e9edc9";
const CREAM2 = "#faedcd";

// Font cache (per edge worker instance)
let _reg:  ArrayBuffer | null = null;
let _bold: ArrayBuffer | null = null;

async function loadFonts(origin: string): Promise<[ArrayBuffer, ArrayBuffer]> {
  if (_reg && _bold) return [_reg, _bold];
  const [r, b] = await Promise.all([
    fetch(new URL("/fonts/NotoSansThai-Regular.ttf", origin)).then(f => f.arrayBuffer()),
    fetch(new URL("/fonts/NotoSansThai-Bold.ttf",    origin)).then(f => f.arrayBuffer()),
  ]);
  _reg = r; _bold = b;
  return [r, b];
}

interface FhQuote  { c: number; dp: number | null; pc: number }
interface FhMetric {
  peBasicExclExtraTTM?: number;
  marketCapitalization?: number;
  "52WeekHigh"?: number;
  "52WeekLow"?: number;
  "10DayAverageTradingVolume"?: number;
  epsGrowth3Y?: number;
}
interface FhProfile { name?: string; finnhubIndustry?: string; exchange?: string }

async function fetchJ<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    return r.ok ? (await r.json() as T) : null;
  } catch { return null; }
}

function fmtCap(mc: number | undefined): string {
  if (!mc) return "N/A";
  if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(1)}T`;
  if (mc >= 1_000)     return `$${(mc / 1_000).toFixed(1)}B`;
  return `$${mc.toFixed(0)}M`;
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 13, color: MUTED, textTransform: "uppercase" as const, letterSpacing: "0.12em", fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontSize: 22, color: INK, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams, origin } = request.nextUrl;
  const ticker   = (searchParams.get("ticker") ?? "").toUpperCase();
  const locale   = searchParams.get("locale") === "en" ? "en" : "th";
  const portrait = searchParams.get("format") === "portrait";

  if (!TICKER_RE.test(ticker)) return new Response("invalid ticker", { status: 400 });

  const apiKey = process.env.FINNHUB_API_KEY ?? "";
  const fBase  = "https://finnhub.io/api/v1";
  const W = 1080, H = portrait ? 1350 : 1080;
  const pad = 60, inner = W - pad * 2;

  try {
    const [[fontReg, fontBold], quote, metR, profR] = await Promise.all([
      loadFonts(origin),
      fetchJ<FhQuote>(`${fBase}/quote?symbol=${ticker}&token=${apiKey}`),
      fetchJ<{ metric?: FhMetric }>(`${fBase}/stock/metric?symbol=${ticker}&metric=all&token=${apiKey}`),
      fetchJ<FhProfile>(`${fBase}/stock/profile2?symbol=${ticker}&token=${apiKey}`),
    ]);

    const met   = metR?.metric ?? null;
    const price = quote?.c ?? 0;
    const chg   = quote?.dp ?? 0;
    const noPrice = !quote || price === 0;
    const noChg   = !noPrice && (quote?.pc === 0) && (quote?.dp === null);
    const up    = !noPrice && !noChg && chg >= 0;
    const clr   = noPrice ? MUTED : noChg ? "#D97706" : up ? GAIN : LOSS;
    const sign  = chg >= 0 ? "+" : "";

    const company  = profR?.name ?? ticker;
    const sector   = profR?.finnhubIndustry ?? "N/A";
    const exchange = profR?.exchange ?? "US";
    const eyebrow  = locale === "en" ? "STOCK SNAPSHOT" : "ภาพรวมหุ้น";

    const cap = fmtCap(met?.marketCapitalization);
    const pe  = met?.peBasicExclExtraTTM ? `${met.peBasicExclExtraTTM.toFixed(1)}x` : "N/A";
    const peg = (met?.peBasicExclExtraTTM && met?.epsGrowth3Y && met.epsGrowth3Y > 0)
      ? `${(met.peBasicExclExtraTTM / met.epsGrowth3Y).toFixed(2)}x` : "N/A";
    const hi  = met?.["52WeekHigh"] ? `$${met["52WeekHigh"].toFixed(0)}` : "N/A";
    const lo  = met?.["52WeekLow"]  ? `$${met["52WeekLow"].toFixed(0)}`  : "N/A";
    const vol = met?.["10DayAverageTradingVolume"]
      ? `${((met["10DayAverageTradingVolume"] * 1000) / 1_000_000).toFixed(1)}M` : "N/A";

    const disclaimer = locale === "th"
      ? "เพื่อการศึกษาเท่านั้น · ไม่ใช่คำแนะนำการลงทุน · InvestMart"
      : "For learning only · not investment advice · InvestMart";

    const ctaText = locale === "th"
      ? `เปิดแอปเพื่อดู AI analysis จาก Martin · กราฟแบบ interactive · Paper trading`
      : `Open the app for Martin's AI analysis, scenarios, and interactive chart.`;

    return new ImageResponse(
      (
        <div style={{ display: "flex", flexDirection: "column", width: W, height: H, background: CREAM, padding: pad, fontFamily: "NotoSansThai", boxSizing: "border-box" as const }}>

          {/* Eyebrow */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: MUTED, textTransform: "uppercase" as const, letterSpacing: "0.18em", fontWeight: 600 }}>{eyebrow}</span>
            <span style={{ fontSize: 13, color: ACCENT, fontWeight: 700, letterSpacing: "0.12em" }}>INVESTMART ✦ Martin</span>
          </div>

          {/* Accent rule */}
          <div style={{ width: inner, height: 2, background: ACCENT, marginBottom: 28 }} />

          {/* Company + price */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 56, color: INK, fontWeight: 700, lineHeight: 1 }}>{ticker}</span>
              <span style={{ fontSize: 19, color: MUTED }}>{company}</span>
              <span style={{ fontSize: 13, color: MUTED, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>
                {sector} · {exchange}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
              {noPrice ? (
                <span style={{ fontSize: 18, color: MUTED }}>Price unavailable</span>
              ) : (
                <>
                  <span style={{ fontSize: 56, color: INK, fontWeight: 700 }}>${price.toFixed(2)}</span>
                  {noChg ? (
                    <span style={{ fontSize: 18, color: "#D97706", fontWeight: 600 }}>New listing · no prior close</span>
                  ) : (
                    <span style={{ fontSize: 26, color: clr, fontWeight: 700 }}>
                      {up ? "▲" : "▼"} {sign}{Math.abs(chg).toFixed(2)}%
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Metrics grid */}
          <div style={{ display: "flex", justifyContent: "space-between", background: CREAM2, border: `1px solid ${BORDER}`, padding: "24px 36px", marginBottom: 32 }}>
            <StatCell label="Mkt Cap"  value={cap} />
            <StatCell label="P/E TTM"  value={pe} />
            <StatCell label="PEG"      value={peg} />
            <StatCell label="52W High" value={hi} />
            <StatCell label="52W Low"  value={lo} />
            <StatCell label="10D Vol"  value={vol} />
          </div>

          {/* Divider */}
          <div style={{ width: inner, height: 1, background: BORDER, marginBottom: 28 }} />

          {/* CTA box */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "22px 28px", background: "#EDE8F8", borderLeft: `4px solid ${ACCENT}`, marginBottom: 28 }}>
            <span style={{ fontSize: 13, color: ACCENT, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em" }}>
              ✦ Martin · AI Analysis
            </span>
            <span style={{ fontSize: 18, color: INK, lineHeight: 1.5 }}>{ctaText}</span>
            <span style={{ fontSize: 14, color: ACCENT, fontWeight: 600 }}>
              investmart.vercel.app/stock/{ticker}
            </span>
          </div>

          {/* Spacer */}
          <div style={{ display: "flex", flexGrow: 1 }} />

          {/* Footer */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: `1px solid ${BORDER}`, paddingTop: 18 }}>
            <span style={{ fontSize: 13, color: MUTED }}>
              Data: Finnhub · {new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" })} ET
            </span>
            <span style={{ fontSize: 13, color: MUTED }}>{disclaimer}</span>
          </div>
        </div>
      ),
      {
        width: W, height: H,
        fonts: [
          { name: "NotoSansThai", data: fontReg,  weight: 400, style: "normal" },
          { name: "NotoSansThai", data: fontBold, weight: 700, style: "normal" },
        ],
      },
    );
  } catch (err) {
    console.error("[og]", err);
    return new Response("render failed", { status: 500 });
  }
}
