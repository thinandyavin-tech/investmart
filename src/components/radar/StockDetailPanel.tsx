"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { OffsetButton } from "@/components/OffsetButton";
import { ScoreBadge } from "@/components/radar/ScoreBadge";
import { Tooltip } from "@/components/Tooltip";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { StockNewsSection } from "@/components/stock/StockNewsSection";
import { AiOutlookCard } from "@/components/stock/AiOutlookCard";
import { WhyMovingCard } from "@/components/stock/WhyMovingCard";
import { useUser }      from "@/lib/userContext";
import { useI18n }      from "@/lib/i18n";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import type { StockMetrics } from "@/lib/momentum";
import type { MaConfig } from "@/components/PriceChart";

const PriceChart = dynamic(
  () => import("@/components/PriceChart").then((m) => m.PriceChart),
  { ssr: false }
);

const TIMEFRAMES = ["1min", "5min", "1D", "5D", "1M", "3M", "6M", "1Y", "Max"] as const;
type Timeframe  = (typeof TIMEFRAMES)[number];
type ChartMode  = "Price" | "Relative" | "Volume";

const SCORE_TOOLTIPS = {
  momentum: "Momentum Score (0–100): วัดแรงส่งราคาและปริมาณซื้อขาย สูงหมายถึงหุ้นมี momentum แข็งแกร่ง",
  quality:  "Quality Score (0–100): วัดขนาดตลาดและความน่าเชื่อถือของหุ้น Large-cap ที่ซื้อขายคล่องจะได้คะแนนสูง",
  rsi:      "RSI (Relative Strength Index): วัดความแข็งแกร่งของราคา 70+ = overbought, 30− = oversold, 40–60 = zone ปกติ",
  volume:   "Volume Surge: ปริมาณซื้อขายปัจจุบัน ÷ ค่าเฉลี่ย เช่น 2.5x หมายถึงซื้อขายมากกว่าปกติ 2.5 เท่า",
  beta:     "Beta: วัดความผันผวนเทียบตลาด <1 = ผันผวนน้อย, 1 = ตามตลาด, >1 = ผันผวนมาก",
} as const;

function riskLabel(beta: number | undefined): { label: string; color: string } | null {
  if (beta === undefined) return null;
  if (beta < 0.8)  return { label: "Conservative", color: "#2563EB" };
  if (beta <= 1.2) return { label: "Moderate",     color: "#D97706" };
  return               { label: "Aggressive",     color: "#DC2626" };
}

interface StockDetailPanelProps {
  stock:     StockMetrics;
  timeframe: Timeframe;
}

interface Candle {
  time: number; open: number; high: number; low: number; close: number; volume: number;
}

interface ProfileData {
  description?: string; name?: string; exchange?: string;
  finnhubIndustry?: string; marketCapitalization?: number;
}

interface MetricData {
  "52WeekHigh"?: number; "52WeekLow"?: number;
  marketCapitalization?: number; peBasicExclExtraTTM?: number; beta?: number;
}

function formatCap(capM: number): string {
  if (!capM) return "N/A";
  if (capM >= 1_000_000) return `$${(capM / 1_000_000).toFixed(1)}T`;
  if (capM >= 1_000)     return `$${(capM / 1_000).toFixed(1)}B`;
  return `$${capM.toFixed(0)}M`;
}

export function StockDetailPanel({ stock, timeframe: initialTf }: StockDetailPanelProps) {
  const { user, refreshUser } = useUser();
  const { t } = useI18n();
  const rd = t.radar.detail;
  const { quote, flash, isLive } = useLiveQuote(stock.ticker);

  const livePrice     = quote?.price     ?? stock.price;
  const liveChangePct = quote?.changePct ?? stock.change1D;
  const flashBg       =
    flash === "up"   ? "rgba(22,163,74,0.08)" :
    flash === "down" ? "rgba(220,38,38,0.08)" : undefined;

  const [timeframe, setTimeframe] = useState<Timeframe>(initialTf);
  const [chartMode, setChartMode] = useState<ChartMode>("Price");
  const [showRsi, setShowRsi]     = useState(false);
  const [maConfig, setMaConfig]   = useState<MaConfig>({ ma20: false, ma50: false, ma200: false });
  const [candles, setCandles]     = useState<Candle[]>([]);
  const [simulated, setSimulated] = useState(false);
  const [profile, setProfile]     = useState<ProfileData | null>(null);
  const [metrics, setMetrics]     = useState<MetricData | null>(null);
  const [aiReason, setAiReason]   = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

  const [shares, setShares]                   = useState("1");
  const [trading, setTrading]                 = useState(false);
  const [tradeMsg, setTradeMsg]               = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    setCandles([]);
    setSimulated(false);
    setProfile(null);
    setMetrics(null);
    setAiReason("");
    setTradeMsg("");
  }, [stock.ticker]);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`/api/stock/history?symbol=${stock.ticker}&timeframe=${timeframe}`);
        const data = (await res.json()) as { candles?: Candle[]; simulated?: boolean };
        setCandles(data.candles ?? []);
        setSimulated(data.simulated ?? false);
      } catch {
        setCandles([]);
        setSimulated(true);
      }
    }
    void load();
  }, [stock.ticker, timeframe]);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`/api/stock/profile?symbol=${stock.ticker}`);
        const data = (await res.json()) as { profile: ProfileData; metrics: { metric?: MetricData } };
        setProfile(data.profile ?? null);
        setMetrics(data.metrics?.metric ?? null);
      } catch { /* non-fatal */ }
    }
    void load();
  }, [stock.ticker]);

  async function loadAiReason() {
    if (loadingAi || aiReason) return;
    setLoadingAi(true);
    try {
      const res  = await fetch(
        `/api/ai/reason?ticker=${stock.ticker}&change=${stock.change1D.toFixed(2)}&score=${stock.momentumScore}`
      );
      const data = (await res.json()) as { reason: string };
      setAiReason(data.reason ?? "");
    } catch {
      setAiReason(rd.loadAiError);
    } finally {
      setLoadingAi(false);
    }
  }

  async function executeTrade(side: "BUY" | "SELL") {
    if (!user) { setShowLoginPrompt(true); return; }
    const sharesNum = parseFloat(shares);
    if (isNaN(sharesNum) || sharesNum <= 0) { setTradeMsg(rd.sharesRequired); return; }
    setTrading(true);
    setTradeMsg("");
    try {
      const res  = await fetch("/api/trade", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ticker: stock.ticker, side, shares: sharesNum, price: livePrice }),
      });
      const data = (await res.json()) as { error?: string; cashUsd?: number };
      if (!res.ok) {
        setTradeMsg(data.error ?? rd.tradeError);
      } else {
        setTradeMsg(
          side === "BUY"
            ? `ซื้อ ${sharesNum} หุ้น ${stock.ticker} @ $${livePrice.toFixed(2)} ✓`
            : `ขาย ${sharesNum} หุ้น ${stock.ticker} @ $${livePrice.toFixed(2)} ✓`
        );
        await refreshUser();
      }
    } catch {
      setTradeMsg(rd.tradeError);
    } finally {
      setTrading(false);
    }
  }

  const holding = user?.holdings.find((h) => h.ticker === stock.ticker);
  const m = metrics;

  return (
    <div className="p-4 flex flex-col gap-3 text-slate-900">
      {showLoginPrompt && (
        <LoginPromptModal
          message={rd.loginToTrade}
          onClose={() => setShowLoginPrompt(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-start gap-3" style={{ background: flashBg, transition: "background 0.3s" }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs text-slate-500 uppercase tracking-wide truncate">
              {profile?.name ?? stock.companyName} · {stock.exchange}
            </p>
            {isLive && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 flex-shrink-0">
                LIVE
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold leading-none text-slate-900" style={{ fontFamily: "var(--font-mono)" }}>
            {stock.ticker}
          </h1>
          <p
            className="text-lg font-bold mt-1 transition-colors duration-300"
            style={{
              fontFamily: "var(--font-mono)",
              color: liveChangePct >= 0 ? "#16A34A" : "#DC2626",
            }}
          >
            ${livePrice.toFixed(2)}{" "}
            <span className="text-sm">
              ({liveChangePct >= 0 ? "+" : ""}{liveChangePct.toFixed(2)}%)
            </span>
          </p>
        </div>
        <ScoreBadge score={stock.momentumScore} tooltip={SCORE_TOOLTIPS.momentum} />
      </div>

      {/* Description */}
      {profile?.description && (
        <p className="text-xs text-slate-600 leading-relaxed border border-slate-100 rounded-lg p-3 bg-slate-50 line-clamp-3">
          {profile.description}
        </p>
      )}

      {/* Chart controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg bg-slate-100 p-0.5 gap-0.5">
          {(["Price", "Relative", "Volume"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setChartMode(mode)}
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition-colors ${
                chartMode === mode
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1 flex-wrap">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-1.5 py-0.5 text-xs font-semibold rounded-md transition-colors ${
                timeframe === tf
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Indicator toggles (MA + RSI) — only shown for Price mode */}
      {chartMode === "Price" && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { key: "ma20"  as const, label: "MA20",  color: "#2563EB" },
              { key: "ma50"  as const, label: "MA50",  color: "#D97706" },
              { key: "ma200" as const, label: "MA200", color: "#7C3AED" },
            ] as const
          ).map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setMaConfig((prev) => ({ ...prev, [key]: !prev[key] }))}
              className={`px-2 py-0.5 text-xs font-bold rounded-md border transition-colors ${
                maConfig[key]
                  ? "text-white border-transparent"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
              style={maConfig[key] ? { backgroundColor: color, borderColor: color } : undefined}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setShowRsi((v) => !v)}
            className={`px-2 py-0.5 text-xs font-bold rounded-md border transition-colors ${
              showRsi
                ? "bg-violet-500 text-white border-violet-500"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
            }`}
          >
            RSI
          </button>
        </div>
      )}

      {/* Price chart */}
      <PriceChart
        candles={candles}
        mode={chartMode}
        simulated={simulated}
        height={showRsi && chartMode === "Price" ? 300 : 200}
        ma={maConfig}
        showRsi={showRsi && chartMode === "Price"}
      />

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-2">
        {[
          {
            label: "MOMENTUM",
            value: `${liveChangePct >= 0 ? "+" : ""}${liveChangePct.toFixed(1)}%`,
            color: liveChangePct >= 0 ? "#16A34A" : "#DC2626",
          },
          { label: "VOL SURGE", value: `${stock.volumeSurge.toFixed(1)}x`,   color: "#0F172A" },
          { label: "QUALITY",   value: String(stock.qualityScore),             color: "#0F172A" },
          {
            label: "MARKET CAP",
            value: m?.marketCapitalization
              ? formatCap(m.marketCapitalization)
              : formatCap(stock.marketCap / 1_000_000),
            color: "#0F172A",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-slate-100 rounded-xl p-2 text-center bg-white shadow-card">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{label}</div>
            <div className="text-sm font-bold" style={{ fontFamily: "var(--font-mono)", color }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Extra metrics */}
      {m && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "52W High",  value: m["52WeekHigh"]       ? `$${m["52WeekHigh"].toFixed(2)}`       : "N/A", tip: "ราคาสูงสุดในรอบ 52 สัปดาห์" },
              { label: "52W Low",   value: m["52WeekLow"]        ? `$${m["52WeekLow"].toFixed(2)}`        : "N/A", tip: "ราคาต่ำสุดในรอบ 52 สัปดาห์" },
              { label: "P/E TTM",   value: m.peBasicExclExtraTTM ? m.peBasicExclExtraTTM.toFixed(1)       : "N/A", tip: "Price/Earnings ratio (Trailing 12 months) — ราคาหุ้น ÷ กำไรต่อหุ้น" },
              { label: "Beta",      value: m.beta                ? m.beta.toFixed(2)                      : "N/A", tip: SCORE_TOOLTIPS.beta },
              { label: "RSI",       value: String(stock.rsi),                                                       tip: SCORE_TOOLTIPS.rsi },
              { label: "SCORE",     value: `${stock.momentumScore}/100`,                                            tip: SCORE_TOOLTIPS.momentum },
            ].map(({ label, value, tip }) => (
              <Tooltip key={label} text={tip}>
                <div className="border border-slate-100 rounded-xl p-2 bg-white w-full shadow-card">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
                  <div className="font-bold text-slate-900 text-xs" style={{ fontFamily: "var(--font-mono)" }}>{value}</div>
                </div>
              </Tooltip>
            ))}
          </div>
          {m.beta !== undefined && riskLabel(m.beta) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Risk Profile:</span>
              <span
                className="text-xs px-1.5 py-0.5 font-semibold border rounded-md"
                style={{ borderColor: riskLabel(m.beta)!.color, color: riskLabel(m.beta)!.color }}
              >
                {riskLabel(m.beta)!.label}
              </span>
            </div>
          )}
        </>
      )}

      {/* Current holding */}
      {holding && (
        <div className="border border-green-200 rounded-xl p-3 bg-green-50 text-xs">
          <span className="font-semibold text-green-700">ถืออยู่:</span>{" "}
          <span className="text-slate-700" style={{ fontFamily: "var(--font-mono)" }}>
            {holding.shares} หุ้น · ต้นทุนเฉลี่ย ${holding.avgCost.toFixed(2)} · P/L{" "}
            <span style={{ color: livePrice >= holding.avgCost ? "#16A34A" : "#DC2626" }}>
              {((livePrice - holding.avgCost) / holding.avgCost * 100).toFixed(1)}%
            </span>
          </span>
        </div>
      )}

      {/* Trade panel */}
      <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col gap-3">
        {!user ? (
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-2">{rd.loginToTrade}</p>
            <OffsetButton variant="lime" onClick={() => setShowLoginPrompt(true)}>
              เข้าสู่ระบบ
            </OffsetButton>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1" htmlFor="shares-input">
                  จำนวนหุ้น
                </label>
                <input
                  id="shares-input"
                  type="number"
                  inputMode="decimal"
                  value={shares}
                  min="0.001"
                  step="1"
                  onChange={(e) => setShares(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg bg-white px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20 transition-colors"
                  style={{ fontFamily: "var(--font-mono)" }}
                />
              </div>
              <div className="text-right text-xs">
                <div className="text-slate-500">ราคา</div>
                <div className="font-bold text-slate-900" style={{ fontFamily: "var(--font-mono)" }}>
                  ${livePrice.toFixed(2)}
                </div>
                <div className="text-xs text-slate-400">
                  รวม ${(parseFloat(shares || "0") * livePrice).toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => void executeTrade("BUY")}
                disabled={trading}
                className="flex-1 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs uppercase tracking-wide rounded-lg disabled:opacity-50 transition-colors"
              >
                BUY
              </button>
              <button
                onClick={() => void executeTrade("SELL")}
                disabled={trading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wide rounded-lg disabled:opacity-50 transition-colors"
              >
                SELL
              </button>
            </div>
            <div className="text-xs flex justify-between text-slate-500">
              <span>USD: <span className="font-bold text-slate-800" style={{ fontFamily: "var(--font-mono)" }}>${user.cashUsd.toFixed(2)}</span></span>
              <span>THB: <span className="font-bold text-slate-800" style={{ fontFamily: "var(--font-mono)" }}>฿{user.cashThb.toLocaleString()}</span></span>
            </div>
          </>
        )}
        {tradeMsg && (
          <p className="text-xs font-bold text-center" style={{ color: tradeMsg.includes("✓") ? "#16A34A" : "#DC2626" }}>
            {tradeMsg}
          </p>
        )}
        <p className="text-xs text-slate-400 text-center">จำลองเท่านั้น · ไม่ใช้เงินจริง · ไม่ใช่คำแนะนำการลงทุน</p>
      </div>

      {/* AI Reasons */}
      <div className="border border-slate-100 rounded-xl p-4 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-700">
            เหตุผลที่ติดเรดาร์
          </h3>
          {!aiReason && (
            <OffsetButton size="sm" onClick={loadAiReason} disabled={loadingAi}>
              {loadingAi ? rd.analyzingAi : rd.analyzeAi}
            </OffsetButton>
          )}
        </div>
        {aiReason ? (
          <p className="text-xs leading-relaxed whitespace-pre-line text-slate-700">{aiReason}</p>
        ) : (
          <p className="text-xs text-slate-400 italic">
            กดปุ่มเพื่อให้ AI วิเคราะห์ว่าหุ้นนี้ติดเรดาร์เพราะอะไร (เครื่องมือวิจัย ไม่ใช่การทำนาย)
          </p>
        )}
      </div>

      <WhyMovingCard ticker={stock.ticker} />
      <AiOutlookCard ticker={stock.ticker} />
      <StockNewsSection ticker={stock.ticker} />
    </div>
  );
}
