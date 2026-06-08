"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Card } from "@/components/Card";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import { StockNewsSection } from "@/components/stock/StockNewsSection";
import { AiOutlookCard } from "@/components/stock/AiOutlookCard";
import { ReverseDCF }   from "@/components/stock/ReverseDCF";
import { WhyMovingCard } from "@/components/stock/WhyMovingCard";
import { useUser } from "@/lib/userContext";
import { PushNotificationSetup } from "@/components/PushNotificationSetup";
import { TradingViewChart } from "@/components/tradingview/TradingViewChart";

const PriceChart = dynamic(
  () => import("@/components/PriceChart").then((m) => m.PriceChart),
  { ssr: false }
);

const TICKER_RE   = /^[A-Z][A-Z.\-]{0,9}$/;
const TIMEFRAMES  = ["1min", "5min", "1D", "5D", "1M", "3M", "6M", "1Y", "5Y"] as const;
type Timeframe    = (typeof TIMEFRAMES)[number];
type ChartMode    = "Price" | "Relative" | "Volume";

function riskLabel(beta: number | undefined): { label: string; color: string } {
  if (beta === undefined) return { label: "N/A",          color: "#64748B" };
  if (beta < 0.8)         return { label: "Conservative", color: "#2563EB" };
  if (beta <= 1.2)        return { label: "Moderate",     color: "#D97706" };
  return                         { label: "Aggressive",   color: "#DC2626" };
}

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
  return <span className="text-xs text-slate-400">อัพเดทเมื่อ {display}</span>;
}

interface StockPageClientProps {
  ticker: string;
}

export function StockPageClient({ ticker }: StockPageClientProps) {
  const { quote, loading: quoteLoading, error: quoteError, isLive, lastUpdated, flash } =
    useLiveQuote(TICKER_RE.test(ticker) ? ticker : null);

  const { user } = useUser();
  const [watched, setWatched]           = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);

  const [profile, setProfile]           = useState<ProfileData | null>(null);
  const [metrics, setMetrics]           = useState<MetricData["metric"] | null>(null);
  const [rsi, setRsi]                   = useState<number | null>(null);
  const [candles, setCandles]           = useState<Candle[]>([]);
  const [simulated, setSimulated]       = useState(false);
  const [chartLoading, setChartLoading] = useState(true);
  const [timeframe, setTimeframe]       = useState<Timeframe>("3M");
  const [chartMode, setChartMode]       = useState<ChartMode>("Price");
  const [useTVChart,  setUseTVChart]    = useState(false);
  const [maConfig, setMaConfig]         = useState({ ma20: false, ma50: false, ma200: false });

  useEffect(() => {
    if (!TICKER_RE.test(ticker)) return;
    fetch(`/api/stock/rsi?symbol=${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((d: { rsi?: number }) => { if (d.rsi !== undefined) setRsi(d.rsi); })
      .catch(() => {});
    fetch(`/api/stock/profile?symbol=${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((d: { profile?: ProfileData; metrics?: MetricData }) => {
        setProfile(d.profile ?? null);
        setMetrics(d.metrics?.metric ?? null);
      })
      .catch(() => {});
  }, [ticker]);

  useEffect(() => {
    if (!user || !TICKER_RE.test(ticker)) return;
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((d: { items?: { ticker: string }[] }) => {
        setWatched((d.items ?? []).some((i) => i.ticker === ticker));
      })
      .catch(() => {});
  }, [user, ticker]);

  // Lazy alert check — fire once when we get a live price, non-blocking
  const alertCheckedRef = useRef(false);
  useEffect(() => {
    if (!user || !quote?.price || alertCheckedRef.current) return;
    alertCheckedRef.current = true;
    void fetch("/api/alerts/check-lazy", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ticker, price: quote.price }),
    }).catch(() => {});
  }, [user, ticker, quote?.price]);

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

  async function toggleWatch() {
    if (!user || watchLoading) return;
    setWatchLoading(true);
    try {
      if (watched) {
        await fetch(`/api/watchlist/${ticker}`, { method: "DELETE" });
        setWatched(false);
      } else {
        await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker }),
        });
        setWatched(true);
      }
    } catch {
      // leave state unchanged on network error
    } finally {
      setWatchLoading(false);
    }
  }

  if (!TICKER_RE.test(ticker)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 text-center">
        <p className="text-xs text-slate-500">Ticker "{ticker}" ไม่ถูกต้อง</p>
        <Link href="/" className="text-xs text-green-600 hover:underline mt-2 block">← หน้าหลัก</Link>
      </div>
    );
  }

  const companyName = profile?.name ?? ticker;
  const positive    = (quote?.changePct ?? 0) >= 0;

  const flashBg =
    flash === "up"   ? "bg-green-500/10" :
    flash === "down" ? "bg-red-500/10"   : "";

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-xs text-slate-400 hover:text-slate-900 transition-colors">
          ← กลับหน้าหลัก
        </Link>
        <Link
          href={`/compare?tickers=${ticker}`}
          className="text-xs text-slate-400 hover:text-slate-900 transition-colors border border-slate-200 px-2 py-1 rounded"
        >
          เทียบหุ้น →
        </Link>
      </div>

      {/* Header card */}
      <Card className={`p-4 transition-colors duration-300 ${flashBg}`}>
        {quoteLoading ? (
          <div className="flex flex-col gap-2">
            <div className="h-4 w-32 bg-slate-200 animate-pulse rounded-md" />
            <div className="h-8 w-40 bg-slate-200 animate-pulse rounded-md" />
          </div>
        ) : quoteError ? (
          <p className="text-xs text-slate-500">ไม่พบข้อมูล "{ticker}"</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h1 className="text-sm font-bold truncate text-slate-900">{companyName}</h1>
                  {profile?.finnhubIndustry && (
                    <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 font-semibold uppercase tracking-wide rounded-md flex-shrink-0">
                      {profile.finnhubIndustry}
                    </span>
                  )}
                  {user && (
                    <button
                      onClick={() => void toggleWatch()}
                      disabled={watchLoading}
                      aria-label={watched ? `ลบ ${ticker} จาก watchlist` : `เพิ่ม ${ticker} ใน watchlist`}
                      className="flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 border rounded-md transition-colors flex-shrink-0"
                      style={{
                        borderColor: watched ? "#16A34A" : "#CBD5E1",
                        color:       watched ? "#16A34A" : "#64748B",
                        background:  watched ? "#F0FDF4" : "transparent",
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill={watched ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      {watched ? "ติดตามแล้ว" : "ติดตาม"}
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {ticker}
                  {profile?.exchange && ` · ${profile.exchange}`}
                  {profile?.country  && ` · ${profile.country}`}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                {quote ? (
                  <>
                    <div
                      className="text-2xl font-bold text-slate-900"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      ${quote.price.toFixed(2)}
                    </div>
                    <div
                      className="text-xs font-bold"
                      style={{ fontFamily: "var(--font-mono)", color: positive ? "#16A34A" : "#DC2626" }}
                    >
                      {positive ? "+" : ""}{quote.changePct.toFixed(2)}%
                      {" "}({positive ? "+" : ""}${quote.change.toFixed(2)})
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-400">—</div>
                )}
              </div>
            </div>

            {/* Pre-market badge */}
            {quote?.preMarket && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide border border-violet-300 bg-violet-50 px-1.5 py-0.5 rounded-md">
                  PRE-MARKET
                </span>
                <span className="font-mono text-xs font-bold text-slate-900">
                  ${quote.preMarket.price.toFixed(2)}
                </span>
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: quote.preMarket.change >= 0 ? "#16A34A" : "#DC2626" }}
                >
                  {quote.preMarket.change >= 0 ? "+" : ""}{quote.preMarket.changePercent.toFixed(2)}%
                </span>
              </div>
            )}

            {/* Live indicator */}
            <div className="flex items-center gap-2 mt-2">
              {isLive ? (
                <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"
                    style={{ animation: "pulse 1.5s ease-in-out infinite" }}
                    aria-hidden="true"
                  />
                  LIVE
                </span>
              ) : (
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
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
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "เปิด",        value: `$${quote.open.toFixed(2)}` },
            { label: "สูงสุด",      value: `$${quote.high.toFixed(2)}` },
            { label: "ต่ำสุด",      value: `$${quote.low.toFixed(2)}` },
            { label: "ปิดเมื่อวาน", value: `$${quote.prevClose.toFixed(2)}` },
          ].map(({ label, value }) => (
            <Card key={label} className="p-3 text-center">
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-1 leading-tight">{label}</div>
              <div className="text-sm font-bold text-slate-900 font-mono">{value}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Fundamentals row */}
      {metrics && (
        <Card className="p-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: "Market Cap",  value: fmtCap(profile?.marketCapitalization) },
              { label: "52W High",    value: metrics["52WeekHigh"]  ? `$${metrics["52WeekHigh"].toFixed(2)}`  : "—" },
              { label: "52W Low",     value: metrics["52WeekLow"]   ? `$${metrics["52WeekLow"].toFixed(2)}`   : "—" },
              { label: "P/E TTM",     value: metrics.peBasicExclExtraTTM ? metrics.peBasicExclExtraTTM.toFixed(1) : "—" },
              { label: "Beta",        value: metrics.beta           ? metrics.beta.toFixed(2)                 : "—" },
              { label: "RSI-14",      value: rsi !== null           ? String(rsi)                               : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</div>
                <div className="text-sm font-bold text-slate-900 font-mono">{value}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/20">
            {metrics.beta !== undefined && (
              <span
                className="text-xs px-2 py-1 font-semibold border rounded-lg"
                style={{ borderColor: riskLabel(metrics.beta).color, color: riskLabel(metrics.beta).color }}
              >
                {riskLabel(metrics.beta).label}
              </span>
            )}
            {profile?.weburl && (
              <a href={profile.weburl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-green-600 hover:underline font-medium">
                เว็บไซต์ ↗
              </a>
            )}
          </div>
        </Card>
      )}

      {/* Chart */}
      <Card className="overflow-hidden">
        <div className="px-3 pt-3 pb-2 border-b border-white/20 flex items-center justify-between flex-wrap gap-2">
          {/* Chart source toggle */}
          <div className="flex gap-1 rounded-lg bg-white/30 p-0.5">
            <button
              onClick={() => setUseTVChart(false)}
              className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors ${!useTVChart ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              ชาร์ต
            </button>
            <button
              onClick={() => setUseTVChart(true)}
              className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors ${useTVChart ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              TradingView
            </button>
          </div>
          {!useTVChart && (
            <>
              <div className="flex gap-1 rounded-lg bg-white/30 p-0.5" role="tablist" aria-label="Chart mode">
                {(["Price", "Relative", "Volume"] as const).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={chartMode === m}
                    onClick={() => setChartMode(m)}
                    className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors ${
                      chartMode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 flex-wrap" role="tablist" aria-label="Timeframe">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    role="tab"
                    aria-selected={timeframe === tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-1.5 py-0.5 text-xs font-semibold rounded-md transition-colors ${
                      timeframe === tf ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {useTVChart ? (
          <TradingViewChart ticker={ticker} height={420} />
        ) : (
          <>
            {chartMode === "Price" && (
              <div className="px-3 py-1.5 border-b border-white/20 flex items-center gap-3">
                <span className="text-xs text-slate-400 uppercase tracking-wide">MA:</span>
                {([
                  { key: "ma20",  label: "20",  color: "#2563EB" },
                  { key: "ma50",  label: "50",  color: "#D97706" },
                  { key: "ma200", label: "200", color: "#7C3AED" },
                ] as const).map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setMaConfig((c) => ({ ...c, [key]: !c[key] }))}
                    className="text-xs font-semibold px-1.5 py-0.5 border rounded-md transition-colors"
                    style={{
                      borderColor: color,
                      color:       maConfig[key] ? "#fff" : color,
                      background:  maConfig[key] ? color  : "transparent",
                    }}
                  >
                    MA{label}
                  </button>
                ))}
              </div>
            )}
            <div className="p-3">
              {chartLoading ? (
                <div className="h-48 bg-white/30 animate-pulse rounded-lg" />
              ) : (
                <PriceChart candles={candles} mode={chartMode} simulated={simulated} height={200} ma={maConfig} />
              )}
            </div>
          </>
        )}
      </Card>

      {/* Price alerts */}
      {user && <PriceAlertSection ticker={ticker} currentPrice={quote?.price} />}

      {/* Why is it moving */}
      <WhyMovingCard ticker={ticker} />

      {/* News */}
      <StockNewsSection ticker={ticker} />

      {/* AI Full Outlook with persona selector */}
      <AiOutlookCard ticker={ticker} />

      {/* Reverse DCF — Expectations Gauge */}
      <ReverseDCF ticker={ticker} />

      {/* CTA: Trade */}
      <div className="flex flex-col gap-2">
        <Link
          href={`/radar?ticker=${ticker}`}
          className="text-center text-sm font-bold text-white bg-[#16A34A] rounded-xl px-4 py-3 hover:bg-[#15803D] transition-colors"
        >
          ซื้อ / ขาย {ticker} (Paper Trade) →
        </Link>
        <p className="text-xs text-slate-400 text-center">
          จำลองการซื้อขายเท่านั้น · ไม่ใช้เงินจริง · ไม่ใช่คำแนะนำการลงทุน
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface PriceAlert {
  id:        string;
  ticker:    string;
  threshold: number;
  condition: "above" | "below";
  triggered: boolean;
  createdAt: string;
}

interface PriceAlertSectionProps {
  ticker:       string;
  currentPrice: number | undefined;
}

function PriceAlertSection({ ticker, currentPrice }: PriceAlertSectionProps) {
  const [alerts, setAlerts]       = useState<PriceAlert[]>([]);
  const [threshold, setThreshold] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const tickerAlerts = alerts.filter((a) => a.ticker === ticker && !a.triggered);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d: { alerts?: PriceAlert[] }) => setAlerts(d.alerts ?? []))
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(threshold);
    if (isNaN(val) || val <= 0) { setError("ราคาไม่ถูกต้อง"); return; }
    setError("");
    setSaving(true);
    try {
      const res  = await fetch("/api/alerts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ticker, threshold: val, condition }),
      });
      const data = (await res.json()) as PriceAlert & { error?: string };
      if (!res.ok) { setError(data.error ?? "ไม่สามารถตั้งแจ้งเตือนได้"); return; }
      setAlerts((prev) => [data, ...prev]);
      setThreshold("");
    } catch {
      setError("เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAlert(id: string) {
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700">
          ตั้งแจ้งเตือนราคา
        </h2>
        <PushNotificationSetup compact />
      </div>

      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs font-semibold">
            {(["above", "below"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCondition(c)}
                className={`px-2 py-1.5 transition-colors ${
                  condition === c
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
                aria-pressed={condition === c}
              >
                {c === "above" ? "สูงกว่า ▲" : "ต่ำกว่า ▼"}
              </button>
            ))}
          </div>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder={currentPrice ? `ปัจจุบัน $${currentPrice.toFixed(2)}` : "ราคา USD"}
            className="flex-1 min-w-[120px] px-2 py-1.5 text-xs border border-slate-200 bg-white rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20 transition-colors"
            aria-label="ราคาเป้าหมาย"
            style={{ fontFamily: "var(--font-mono)" }}
          />
          <button
            type="submit"
            disabled={saving || !threshold}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#16A34A] rounded-lg disabled:opacity-40 hover:bg-[#15803D] transition-colors"
          >
            {saving ? "..." : "ตั้งแจ้งเตือน"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>

      {tickerAlerts.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5" style={{ listStyle: "none", margin: "12px 0 0", padding: 0 }}>
          {tickerAlerts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between text-xs px-2.5 py-1.5 border border-slate-100 bg-slate-50 rounded-lg"
            >
              <span className="text-slate-700" style={{ fontFamily: "var(--font-mono)" }}>
                {a.condition === "above" ? "▲" : "▼"}{" "}
                ${a.threshold.toFixed(2)}
              </span>
              <button
                onClick={() => void deleteAlert(a.id)}
                className="text-xs text-slate-400 hover:text-red-600 transition-colors"
                aria-label={`ลบแจ้งเตือน ${a.threshold}`}
              >
                ✕ ลบ
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
