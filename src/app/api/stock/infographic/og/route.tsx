/**
 * Satori PNG endpoint — renders the infographic as a crisp PNG image.
 * Uses next/og (Satori) with embedded Noto Sans Thai font so Thai text is always correct.
 * Numbers come from the data layer, never from the LLM.
 *
 * GET /api/stock/infographic/og?ticker=NVDA&locale=en&format=square|portrait
 */
import { ImageResponse } from "next/og";
import { NextRequest }   from "next/server";
import type { InfographicData } from "../route";

export const runtime = "edge";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;

// ── Design tokens ──────────────────────────────────────────────────────────────
const CREAM  = "#FBF7ED";
const INK    = "#1A1A1A";
const ACCENT = "#8B5CF6";
const MUTED  = "#6B6B6B";
const GAIN   = "#1F9D55";
const LOSS   = "#D64545";
const BORDER = "#E4DDD2";

// ── Font loader (cached per edge worker) ──────────────────────────────────────
let _fontRegular: ArrayBuffer | null = null;
let _fontBold:    ArrayBuffer | null = null;

async function loadFonts(origin: string): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  if (_fontRegular && _fontBold) return { regular: _fontRegular, bold: _fontBold };
  const [reg, bold] = await Promise.all([
    fetch(new URL("/fonts/NotoSansThai-Regular.ttf", origin)).then(r => r.arrayBuffer()),
    fetch(new URL("/fonts/NotoSansThai-Bold.ttf",    origin)).then(r => r.arrayBuffer()),
  ]);
  _fontRegular = reg;
  _fontBold    = bold;
  return { regular: reg, bold };
}

// ── Sparkline SVG ─────────────────────────────────────────────────────────────

function sparklinePath(prices: number[], W: number, H: number): string {
  if (prices.length < 2) return "";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const rng = max - min || 1;
  return prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * W;
      const y = H - ((p - min) / rng) * H;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

// ── Thesis keyword renderer ────────────────────────────────────────────────────

function Thesis({ text, fontSize }: { text: string; fontSize: number }) {
  const parts = text.split(/\*\*([^*]+)\*\*/);
  return (
    <span style={{ fontSize, color: INK, lineHeight: 1.4 }}>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <span key={i} style={{ color: ACCENT, fontWeight: 700 }}>{part}</span>
          : part
      )}
    </span>
  );
}

// ── Stat cell ─────────────────────────────────────────────────────────────────

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 13, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontSize: 20, color: INK, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}

// ── Main template ─────────────────────────────────────────────────────────────

function InfographicTemplate({
  data,
  width,
  height,
}: {
  data: InfographicData;
  width: number;
  height: number;
}) {
  const { narrative } = data;
  const pad = 60;
  const inner = width - pad * 2;

  const up    = !data.priceUnavailable && !data.noChangeData && data.change1D >= 0;
  const clr   = data.priceUnavailable  ? MUTED
               : data.noChangeData      ? "#D97706"
               : up                     ? GAIN : LOSS;
  const sign  = data.change1D >= 0 ? "+" : "";
  const sparkColor = up ? GAIN : LOSS;

  const sparkW = 160;
  const sparkH = 56;
  const path   = sparklinePath(data.sparkline, sparkW, sparkH);

  const highlights = narrative.highlights.slice(0, 3);

  return (
    <div
      style={{
        display:         "flex",
        flexDirection:   "column",
        width,
        height,
        background:      CREAM,
        padding:         pad,
        fontFamily:      "NotoSansThai",
        boxSizing:       "border-box",
      }}
    >
      {/* ── Eyebrow row ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 600 }}>
          {narrative.eyebrow}
        </span>
        <span style={{ fontSize: 12, color: ACCENT, fontWeight: 700, letterSpacing: "0.12em" }}>
          INVESTMART ✦ Martin
        </span>
      </div>

      {/* ── Accent rule ─────────────────────────────────────────────────── */}
      <div style={{ width: inner, height: 2, background: ACCENT, marginBottom: 20 }} />

      {/* ── Company + price row ─────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <span style={{ fontSize: 40, color: INK, fontWeight: 700, lineHeight: 1.1 }}>{data.ticker}</span>
          <span style={{ fontSize: 16, color: MUTED, fontWeight: 400 }}>{data.companyName}</span>
          <span style={{ fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>
            {data.sector} · {data.exchange}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {data.priceUnavailable ? (
            <span style={{ fontSize: 16, color: MUTED }}>Price unavailable</span>
          ) : (
            <>
              <span style={{ fontSize: 40, color: INK, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                ${data.price.toFixed(2)}
              </span>
              {data.noChangeData ? (
                <span style={{ fontSize: 14, color: "#D97706", fontWeight: 600 }}>New listing</span>
              ) : (
                <span style={{ fontSize: 20, color: clr, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {up ? "▲" : "▼"} {sign}{data.change1D.toFixed(2)}%
                </span>
              )}
              {/* Sparkline */}
              {path && (
                <svg width={sparkW} height={sparkH} style={{ marginTop: 4 }}>
                  <path d={path} fill="none" stroke={sparkColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
                </svg>
              )}
              <span style={{ fontSize: 11, color: MUTED }}>3-month</span>
            </>
          )}
        </div>
      </div>

      {/* ── Metrics grid ────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        background: "#F3EDE0", border: `1px solid ${BORDER}`,
        padding: "18px 24px", marginBottom: 20,
      }}>
        <StatCell label="Mkt Cap"  value={data.marketCap} />
        <StatCell label="P/E TTM"  value={data.pe} />
        <StatCell label="PEG"      value={data.peg} />
        <StatCell label="52W High" value={data.week52High ? `$${data.week52High.toFixed(0)}` : "N/A"} />
        <StatCell label="52W Low"  value={data.week52Low  ? `$${data.week52Low.toFixed(0)}`  : "N/A"} />
        <StatCell label="RSI-14"   value={data.rsi !== null ? String(data.rsi) : "N/A"} />
      </div>

      {/* ── Thin rule ───────────────────────────────────────────────────── */}
      <div style={{ width: inner, height: 1, background: BORDER, marginBottom: 20 }} />

      {/* ── Thesis ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", display: "block", marginBottom: 8 }}>
          ✦ Martin's Observation
        </span>
        <Thesis text={narrative.thesis} fontSize={18} />
      </div>

      {/* ── Highlights ──────────────────────────────────────────────────── */}
      {highlights.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {highlights.map((h, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ color: ACCENT, fontWeight: 700, fontSize: 14, lineHeight: 1.5, flexShrink: 0 }}>▸</span>
              <span style={{ fontSize: 15, color: INK, lineHeight: 1.5 }}>{h}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── What to watch ───────────────────────────────────────────────── */}
      {narrative.watch && (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16, padding: "10px 14px", background: "#EDE8F8", borderLeft: `3px solid ${ACCENT}` }}>
          <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", lineHeight: 1.8 }}>Watch</span>
          <span style={{ fontSize: 14, color: INK, lineHeight: 1.6 }}>{narrative.watch}</span>
        </div>
      )}

      {/* ── Spacer ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
        <span style={{ fontSize: 11, color: MUTED }}>
          Data: Finnhub · {new Date(data.generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" })} ET
        </span>
        <span style={{ fontSize: 11, color: MUTED }}>
          For learning only · not investment advice · InvestMart
        </span>
      </div>
    </div>
  );
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl;
  const ticker   = (searchParams.get("ticker") ?? "").toUpperCase();
  const locale   = searchParams.get("locale") === "en" ? "en" : "th";
  const portrait = searchParams.get("format") === "portrait";

  if (!TICKER_RE.test(ticker)) {
    return new Response("invalid ticker", { status: 400 });
  }

  const origin = request.nextUrl.origin;
  const width  = 1080;
  const height = portrait ? 1350 : 1080;

  try {
    // Load data and fonts in parallel
    const [fonts, data] = await Promise.all([
      loadFonts(origin),
      fetch(new URL(`/api/stock/infographic?ticker=${ticker}&locale=${locale}`, origin))
        .then(r => r.json() as Promise<InfographicData>),
    ]);

    if (!data || "error" in data) {
      return new Response("data unavailable", { status: 503 });
    }

    return new ImageResponse(
      <InfographicTemplate data={data} width={width} height={height} />,
      {
        width,
        height,
        fonts: [
          { name: "NotoSansThai", data: fonts.regular, weight: 400, style: "normal" },
          { name: "NotoSansThai", data: fonts.bold,    weight: 700, style: "normal" },
        ],
      },
    );
  } catch (err) {
    console.error("[infographic/og]", err);
    return new Response("render failed", { status: 500 });
  }
}
