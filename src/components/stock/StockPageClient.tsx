"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Card } from "@/components/Card";
import { OffsetButton } from "@/components/OffsetButton";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import { StockNewsSection } from "@/components/stock/StockNewsSection";

const PriceChart = dynamic(
  () => import("@/components/PriceChart").then((m) => m.PriceChart),
  { ssr: false }
);

const TICKER_RE   = /^[A-Z][A-Z.\-]{0,9}$/;
const TIMEFRAMES  = ["1D", "5D", "1M", "3M", "6M", "1Y", "5Y"] as const;
type Timeframe    = (typeof TIMEFRAMES)[number];
type ChartMode    = "Price" | "Relative" | "Volume";

interface ProfileData {
  name?:                 string;
  finnhubIndustry?:      string;
  weburl?:               string;
  marketCapitalization?: number;
  description?:          string;
  country?:              string;
  exchange?:             string;
}

interface MetricData {
  metric?: {
    "52WeekHigh"?:         number;
    "52WeekLow"?:          number;
    peBasicExclExtraTTM?:  number;
    beta?:                 number;
  };
}

interface Candle {
  time: number; open: number; high: number; low: number; close: number; volume: number;
}

function fmtCap(m: number | undefined): string {
  if (!m) return "—";
  if (m >= 1_000_000) return `$${(m / 1_000_000).toFixed(1)}T`;
  if (m >= 1_000)     return `$${(m / 1_000).toFixed(1)}B`;
  return `$${m.toFixed(0)}M`;
}

function LastUpdated({ date }: { date: Date | null }) {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    if (!date) return;
    const fmt = () =>
      setDisplay(
        date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    fmt();
    const id = setInterval(fmt, 1000);
    return () => clearInterval(id);
  }, [date]);
  if (!date) return null;
  return <span className="text-[9px] text-[#8A8378]">อัพเดทเมื่อ {display}</span>;
}

interface StockPageClientProps {
  ticker: string;
}

interface AiOutlook {
  thesis:           string;
  conviction?:      string;
  convictionReason?: string;
  bull:             { description: string; probability: string };
  base:             { description: string; probability: string };
  bear:             { description: string; probability: string };
  drivers:          string[];
  risk:             string;
  invalidation:     string;
  disclaimer:       string;
}

export function StockPageClient({ ticker }: StockPageClientProps) {
  const { quote, loading: quoteLoading, error: quoteError, isLive, marketStatus, lastUpdated, flash } =
    useLiveQuote(TICKER_RE.test(ticker) ? ticker : null);

  const [profile, setProfile]       = useState<ProfileData | null>(null);
  const [metrics, setMetrics]       = useState<MetricData["metric"] | null>(null);
  const [candles, setCandles]       = useState<Candle[]>([]);
  const [simulated, setSimulated]   = useState(false);
  const [chartLoading, setChartLoading] = useState(true);
  const [timeframe, setTimeframe]   = useState<Timeframe>("3M");
  const [chartMode, setChartMode]   = useState<ChartMode>("Price");
  const [aiOutlook, setAiOutlook]   = useState<AiOutlook | null>(null);
  const [loadingOutlook, setLoadingOutlook] = useState(false);

  // Fetch profile + metrics once
  useEffect(() => {
    if (!TICKER_RE.test(ticker)) return;
    fetch(`/api/stock/profile?symbol=${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((d: { profile?: ProfileData; metrics?: MetricData }) => {
        setProfile(d.profile ?? null);
        setMetrics(d.metrics?.metric ?? null);
      })
      .catch(() => {});
  }, [ticker]);

  // Fetch chart candles when timeframe changes
  useEffect(() => {
    if (!TICKER_RE.test(ticker)) return;
    setChartLoading(true);
    fetch(`/api/stock/history?symbol=${encodeURIComponent(ticker)}&timeframe=${timeframe}`)
      .then((r) => r.json())
      .then((d: { candles?: Candle[]; simulated?: boolean }) => {
        setCandles(d.candles ?? []);
        setSimulated(d.simulated ?? false);
      })
      .catch(() => { setCandles([]); setSimulated(true); })
      .finally(() => setChartLoading(false));
  }, [ticker, timeframe]);

  async function loadAiOutlook() {
    if (loadingOutlook || aiOutlook) return;
    setLoadingOutlook(true);
    try {
      const res  = await fetch(`/api/ai/outlook?ticker=${encodeURIComponent(ticker)}`);
      const data = (await res.json()) as AiOutlook & { error?: string };
      if (data.error) {
        setAiOutlook({
          thesis:       `ไม่สามารถโหลดการวิเคราะห์: ${data.error}`,
          bull:         { description: "—", probability: "—" },
          base:         { description: "—", probability: "—" },
          bear:         { description: "—", probability: "—" },
          drivers:      [],
          risk:         "—",
          invalidation: "—",
          disclaimer:   "—",
        });
      } else {
        setAiOutlook(data);
      }
    } catch {
      setAiOutlook({
        thesis:       "ไม่สามารถโหลดการวิเคราะห์ได้ในขณะนี้",
        bull:         { description: "—", probability: "—" },
        base:         { description: "—", probability: "—" },
        bear:         { description: "—", probability: "—" },
        drivers:      [],
        risk:         "—",
        invalidation: "—",
        disclaimer:   "—",
      });
    } finally {
      setLoadingOutlook(false);
    }
  }

  if (!TICKER_RE.test(ticker)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 text-center">
        <p className="text-xs text-[#8A8378]">Ticker "{ticker}" ไม่ถูกต้อง</p>
        <Link href="/" className="text-[10px] text-[#5B8A2A] hover:underline mt-2 block">← หน้าหลัก</Link>
      </div>
    );
  }

  const companyName = profile?.name ?? ticker;
  const positive    = (quote?.changePct ?? 0) >= 0;

  // Flash colors for live price update
  const flashBg =
    flash === "up"   ? "bg-[#5B8A2A]/10" :
    flash === "down" ? "bg-[#DC2626]/10" : "";

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
      <Link href="/" className="text-[10px] text-[#8A8378] hover:text-[#1F1A14] transition-colors">
        ← กลับหน้าหลัก
      </Link>

      {/* Header card */}
      <Card className={`p-4 transition-colors duration-300 ${flashBg}`}>
        {quoteLoading ? (
          <div className="flex flex-col gap-2">
            <div className="h-4 w-32 bg-[#E8E2D4] animate-pulse rounded" />
            <div className="h-8 w-40 bg-[#E8E2D4] animate-pulse rounded" />
          </div>
        ) : quoteError ? (
          <p className="text-xs text-[#8A8378]">ไม่พบข้อมูล "{ticker}"</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h1 className="text-sm font-bold truncate">{companyName}</h1>
                  {profile?.finnhubIndustry && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#E8E2D4] text-[#8A8378] font-bold uppercase tracking-wide flex-shrink-0">
                      {profile.finnhubIndustry}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#8A8378]">
                  {ticker}
                  {profile?.exchange && ` · ${profile.exchange}`}
                  {profile?.country  && ` · ${profile.country}`}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                {quote ? (
                  <>
                    <div
                      className="text-2xl font-bold"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      ${quote.price.toFixed(2)}
                    </div>
                    <div
                      className="text-[11px] font-bold"
                      style={{ fontFamily: "var(--font-mono)", color: positive ? "#5B8A2A" : "#DC2626" }}
                    >
                      {positive ? "+" : ""}{quote.changePct.toFixed(2)}%
                      {" "}({positive ? "+" : ""}${quote.change.toFixed(2)})
                    </div>
                  </>
                ) : (
                  <div className="text-[10px] text-[#8A8378]">—</div>
                )}
              </div>
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-2 mt-2">
              {isLive ? (
                <span className="flex items-center gap-1 text-[9px] text-[#5B8A2A] font-bold">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-[#5B8A2A]"
                    style={{ animation: "pulse 1.5s ease-in-out infinite" }}
                    aria-hidden="true"
                  />
                  LIVE
                </span>
              ) : (
                <span className="text-[9px] text-[#8A8378] font-bold uppercase tracking-wide">
                  ตลาดปิด
                </span>
              )}
              <LastUpdated date={lastUpdated} />
            </div>
          </>
        )}
      </Card>

      {/* OHLC row */}
      {!quoteLoading && !quoteError && quote && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "เปิด",        value: `$${quote.open.toFixed(2)}` },
            { label: "สูงสุด",      value: `$${quote.high.toFixed(2)}` },
            { label: "ต่ำสุด",      value: `$${quote.low.toFixed(2)}` },
            { label: "ปิดเมื่อวาน", value: `$${quote.prevClose.toFixed(2)}` },
          ].map(({ label, value }) => (
            <Card key={label} className="p-2 text-center">
              <div className="text-[9px] text-[#8A8378] uppercase tracking-wide mb-0.5 leading-tight">{label}</div>
              <div className="text-[11px] font-bold" style={{ fontFamily: "var(--font-mono)" }}>{value}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Fundamentals row */}
      {metrics && (
        <div className="flex flex-wrap gap-3 px-1">
          {[
            { label: "Market Cap",  value: fmtCap(profile?.marketCapitalization) },
            { label: "52W High",    value: metrics["52WeekHigh"]  ? `$${metrics["52WeekHigh"].toFixed(2)}`  : "—" },
            { label: "52W Low",     value: metrics["52WeekLow"]   ? `$${metrics["52WeekLow"].toFixed(2)}`   : "—" },
            { label: "P/E TTM",     value: metrics.peBasicExclExtraTTM ? metrics.peBasicExclExtraTTM.toFixed(1) : "—" },
            { label: "Beta",        value: metrics.beta           ? metrics.beta.toFixed(2)                 : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="text-[10px]">
              <span className="text-[#8A8378]">{label} </span>
              <span className="font-bold" style={{ fontFamily: "var(--font-mono)" }}>{value}</span>
            </div>
          ))}
          {profile?.weburl && (
            <a href={profile.weburl} target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-[#5B8A2A] hover:underline">
              เว็บไซต์ ↗
            </a>
          )}
        </div>
      )}

      {/* Chart */}
      <Card className="overflow-hidden">
        <div className="px-3 pt-3 pb-2 border-b border-[#E8E2D4] flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1" role="tablist" aria-label="Chart mode">
            {(["Price", "Relative", "Volume"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={chartMode === m}
                onClick={() => setChartMode(m)}
                className="px-2 py-0.5 text-[9px] border border-[#1F1A14] font-bold transition-colors"
                style={{
                  background: chartMode === m ? "#1F1A14" : "#F3EDE0",
                  color:      chartMode === m ? "#fff"    : "#8A8378",
                }}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-1" role="tablist" aria-label="Timeframe">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                role="tab"
                aria-selected={timeframe === tf}
                onClick={() => setTimeframe(tf)}
                className="px-1.5 py-0.5 text-[9px] border border-[#1F1A14] font-bold transition-colors"
                style={{
                  background: timeframe === tf ? "#1F1A14" : "#F3EDE0",
                  color:      timeframe === tf ? "#fff"    : "#8A8378",
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
        <div className="p-3">
          {chartLoading ? (
            <div className="h-48 bg-[#E8E2D4] animate-pulse rounded" />
          ) : (
            <PriceChart candles={candles} mode={chartMode} simulated={simulated} height={200} />
          )}
        </div>
      </Card>

      {/* News */}
      <StockNewsSection ticker={ticker} />

      {/* AI Full Outlook */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest">
            วิเคราะห์แนวโน้มด้วย AI
          </h2>
          {!aiOutlook && (
            <OffsetButton size="sm" onClick={() => void loadAiOutlook()} disabled={loadingOutlook}>
              {loadingOutlook ? "กำลังวิเคราะห์..." : "เปิดการวิเคราะห์"}
            </OffsetButton>
          )}
        </div>

        {!aiOutlook && !loadingOutlook && (
          <p className="text-[10px] text-[#8A8378] italic">
            วิเคราะห์เชิงลึก: thesis, กรณี Bull/Base/Bear, ปัจจัยขับเคลื่อน, ความเสี่ยง
          </p>
        )}

        {loadingOutlook && (
          <div className="flex flex-col gap-2">
            {[80, 60, 70, 50].map((w) => (
              <div key={w} className="h-2 bg-[#E8E2D4] animate-pulse rounded" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {aiOutlook && (
          <div className="flex flex-col gap-3 text-[11px]">
            <p className="leading-relaxed">{aiOutlook.thesis}</p>

            {aiOutlook.conviction && (
              <div className="flex flex-col gap-0.5">
                <span
                  className="self-start px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border"
                  style={{
                    background:
                      aiOutlook.conviction === "high"   ? "#5B8A2A" :
                      aiOutlook.conviction === "medium"  ? "#D97706" : "#DC2626",
                    color:      "#fff",
                    borderColor:
                      aiOutlook.conviction === "high"   ? "#5B8A2A" :
                      aiOutlook.conviction === "medium"  ? "#D97706" : "#DC2626",
                  }}
                >
                  ระดับความมั่นใจ:{" "}
                  {aiOutlook.conviction === "high"   ? "สูง" :
                   aiOutlook.conviction === "medium" ? "กลาง" : "ต่ำ"}
                </span>
                {aiOutlook.convictionReason && (
                  <p className="text-[9px] text-[#8A8378] italic">{aiOutlook.convictionReason}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { label: "Bull", data: aiOutlook.bull,  color: "#5B8A2A" },
                  { label: "Base", data: aiOutlook.base,  color: "#1F1A14" },
                  { label: "Bear", data: aiOutlook.bear,  color: "#DC2626" },
                ] as const
              ).map(({ label, data, color }) => (
                <div key={label} className="border border-[#E8E2D4] p-2 bg-[#F8F5EF]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[10px]" style={{ color }}>{label}</span>
                    <span className="text-[9px] text-[#8A8378]">{data.probability}</span>
                  </div>
                  <p className="text-[9px] text-[#1F1A14] leading-snug">{data.description}</p>
                </div>
              ))}
            </div>

            {aiOutlook.drivers.length > 0 && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378] mb-1">
                  ปัจจัยขับเคลื่อน
                </div>
                <ul className="flex flex-col gap-0.5">
                  {aiOutlook.drivers.map((d, i) => (
                    <li key={i} className="text-[9px] flex gap-1">
                      <span className="text-[#5B8A2A] flex-shrink-0">·</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="border border-[#E8E2D4] p-2 bg-[#F8F5EF]">
                <div className="text-[9px] font-bold text-[#DC2626] uppercase tracking-wide mb-0.5">ความเสี่ยง</div>
                <p className="text-[9px]">{aiOutlook.risk}</p>
              </div>
              <div className="border border-[#E8E2D4] p-2 bg-[#F8F5EF]">
                <div className="text-[9px] font-bold text-[#8A8378] uppercase tracking-wide mb-0.5">จะรู้ว่าผิดเมื่อ</div>
                <p className="text-[9px]">{aiOutlook.invalidation}</p>
              </div>
            </div>

            <p className="text-[9px] text-[#8A8378] italic border-t border-[#E8E2D4] pt-2">
              {aiOutlook.disclaimer}
            </p>
          </div>
        )}
      </Card>

      {/* Radar link */}
      <Link
        href={`/radar?ticker=${ticker}`}
        className="text-center text-[10px] font-bold text-[#5B8A2A] border border-[#5B8A2A] px-4 py-2 hover:bg-[#5B8A2A] hover:text-white transition-colors"
      >
        วิเคราะห์ AI + ซื้อขาย {ticker} ใน Radar →
      </Link>
    </div>
  );
}
