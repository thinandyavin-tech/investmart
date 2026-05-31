"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { OffsetButton } from "@/components/OffsetButton";
import { ScoreBadge } from "@/components/radar/ScoreBadge";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { StockNewsSection } from "@/components/stock/StockNewsSection";
import { useUser } from "@/lib/userContext";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import type { StockMetrics } from "@/lib/momentum";

const PriceChart = dynamic(
  () => import("@/components/PriceChart").then((m) => m.PriceChart),
  { ssr: false }
);

const TIMEFRAMES = ["1D", "5D", "1M", "3M", "6M", "1Y"] as const;
type Timeframe  = (typeof TIMEFRAMES)[number];
type ChartMode  = "Price" | "Relative" | "Volume";

interface StockDetailPanelProps {
  stock:     StockMetrics;
  timeframe: Timeframe;
}

interface Candle {
  time:   number;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

interface ProfileData {
  description?:      string;
  name?:             string;
  exchange?:         string;
  finnhubIndustry?:  string;
  marketCapitalization?: number;
}

interface MetricData {
  "52WeekHigh"?:            number;
  "52WeekLow"?:             number;
  marketCapitalization?:    number;
  peBasicExclExtraTTM?:     number;
  beta?:                    number;
}

function formatCap(capM: number): string {
  if (!capM) return "N/A";
  if (capM >= 1_000_000) return `$${(capM / 1_000_000).toFixed(1)}T`;
  if (capM >= 1_000)     return `$${(capM / 1_000).toFixed(1)}B`;
  return `$${capM.toFixed(0)}M`;
}

export function StockDetailPanel({ stock, timeframe: initialTf }: StockDetailPanelProps) {
  const { user, refreshUser } = useUser();
  const { quote, flash, isLive }        = useLiveQuote(stock.ticker);

  const livePrice     = quote?.price     ?? stock.price;
  const liveChangePct = quote?.changePct ?? stock.change1D;
  const flashBg       = flash === "up" ? "rgba(91,138,42,0.12)" : flash === "down" ? "rgba(229,72,77,0.12)" : undefined;

  const [timeframe, setTimeframe] = useState<Timeframe>(initialTf);
  const [chartMode, setChartMode] = useState<ChartMode>("Price");
  const [candles, setCandles]     = useState<Candle[]>([]);
  const [simulated, setSimulated] = useState(false);
  const [profile, setProfile]     = useState<ProfileData | null>(null);
  const [metrics, setMetrics]     = useState<MetricData | null>(null);
  const [aiReason, setAiReason]   = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

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

  const [aiOutlook, setAiOutlook]       = useState<AiOutlook | null>(null);
  const [loadingOutlook, setLoadingOutlook] = useState(false);
  const [shares, setShares]           = useState("1");
  const [trading, setTrading]         = useState(false);
  const [tradeMsg, setTradeMsg]       = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Reset when stock changes
  useEffect(() => {
    setCandles([]);
    setSimulated(false);
    setProfile(null);
    setMetrics(null);
    setAiReason("");
    setAiOutlook(null);
    setTradeMsg("");
  }, [stock.ticker]);

  // Fetch history
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

  // Fetch profile + metrics (lazy)
  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`/api/stock/profile?symbol=${stock.ticker}`);
        const data = (await res.json()) as {
          profile: ProfileData;
          metrics: { metric?: MetricData };
        };
        setProfile(data.profile ?? null);
        setMetrics(data.metrics?.metric ?? null);
      } catch {
        /* non-fatal */
      }
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
      setAiReason("ไม่สามารถโหลดการวิเคราะห์ได้ในขณะนี้");
    } finally {
      setLoadingAi(false);
    }
  }

  async function loadAiOutlook() {
    if (loadingOutlook || aiOutlook) return;
    setLoadingOutlook(true);
    try {
      const res  = await fetch(`/api/ai/outlook?ticker=${stock.ticker}`);
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

  async function executeTrade(side: "BUY" | "SELL") {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    const sharesNum = parseFloat(shares);
    if (isNaN(sharesNum) || sharesNum <= 0) {
      setTradeMsg("กรุณากรอกจำนวนหุ้น");
      return;
    }

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
        setTradeMsg(data.error ?? "เกิดข้อผิดพลาด");
      } else {
        setTradeMsg(
          side === "BUY"
            ? `ซื้อ ${sharesNum} หุ้น ${stock.ticker} @ $${livePrice.toFixed(2)} ✓`
            : `ขาย ${sharesNum} หุ้น ${stock.ticker} @ $${livePrice.toFixed(2)} ✓`
        );
        await refreshUser();
      }
    } catch {
      setTradeMsg("เกิดข้อผิดพลาดในการส่งคำสั่ง");
    } finally {
      setTrading(false);
    }
  }

  const holding = user?.holdings.find((h) => h.ticker === stock.ticker);
  const m = metrics;

  return (
    <div className="p-3 flex flex-col gap-3 text-[#1F1A14]">
      {showLoginPrompt && (
        <LoginPromptModal
          message="เข้าสู่ระบบเพื่อซื้อขายหุ้นจำลอง · เริ่มต้นด้วย ฿1,250,000"
          onClose={() => setShowLoginPrompt(false)}
        />
      )}
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] text-[#8A8378] uppercase tracking-wide truncate">
              {profile?.name ?? stock.companyName} · {stock.exchange}
            </p>
            {isLive && (
              <span
                className="text-[8px] font-bold px-1 py-0.5 rounded-sm flex-shrink-0"
                style={{ background: "#9BE15D", color: "#1F1A14" }}
              >
                LIVE
              </span>
            )}
          </div>
          <h1
            className="text-3xl font-bold leading-none"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {stock.ticker}
          </h1>
          <p
            className="text-lg font-bold mt-1 transition-colors duration-300"
            style={{
              fontFamily: "var(--font-mono)",
              color:      liveChangePct >= 0 ? "#5B8A2A" : "#E5484D",
              background: flashBg,
            }}
          >
            ${livePrice.toFixed(2)}{" "}
            <span className="text-sm">
              ({liveChangePct >= 0 ? "+" : ""}{liveChangePct.toFixed(2)}%)
            </span>
          </p>
        </div>
        <ScoreBadge score={stock.momentumScore} />
      </div>

      {/* Description */}
      {profile?.description && (
        <p className="text-[10px] text-[#8A8378] leading-relaxed border border-[#1F1A14] p-2 bg-[#F3EDE0] line-clamp-3">
          {profile.description}
        </p>
      )}

      {/* Chart mode tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(["Price", "Relative", "Volume"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setChartMode(mode)}
            className="px-3 py-0.5 text-[10px] border border-[#1F1A14] font-bold transition-colors"
            style={{
              background: chartMode === mode ? "#1F1A14" : "#F3EDE0",
              color:      chartMode === mode ? "#F3EDE0" : "#1F1A14",
            }}
          >
            {mode}
          </button>
        ))}
        <button className="px-3 py-0.5 text-[10px] border border-[#1F1A14] font-bold text-[#8A8378]">
          PEG
        </button>
        <div className="ml-auto flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className="px-1.5 py-0.5 text-[9px] border border-[#1F1A14] font-bold"
              style={{
                background: timeframe === tf ? "#1F1A14" : "#F3EDE0",
                color:      timeframe === tf ? "#F3EDE0" : "#1F1A14",
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Price chart */}
      <PriceChart candles={candles} mode={chartMode} simulated={simulated} height={160} />

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          {
            label: "MOMENTUM",
            value: `${liveChangePct >= 0 ? "+" : ""}${liveChangePct.toFixed(1)}%`,
            color: liveChangePct >= 0 ? "#5B8A2A" : "#E5484D",
          },
          { label: "VOLUME SURGE", value: `${stock.volumeSurge.toFixed(1)}x`,   color: "#1F1A14" },
          { label: "QUALITY",      value: String(stock.qualityScore),             color: "#1F1A14" },
          {
            label: "MARKET CAP",
            value: m?.marketCapitalization
              ? formatCap(m.marketCapitalization)
              : formatCap(stock.marketCap / 1_000_000),
            color: "#1F1A14",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-[#1F1A14] p-2 text-center bg-[#F3EDE0]">
            <div className="text-[9px] text-[#8A8378] uppercase tracking-wide mb-0.5">{label}</div>
            <div
              className="text-sm font-bold"
              style={{ fontFamily: "var(--font-mono)", color }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Extra metrics */}
      {m && (
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "52W High",  value: m["52WeekHigh"]         ? `$${m["52WeekHigh"].toFixed(2)}`          : "N/A" },
            { label: "52W Low",   value: m["52WeekLow"]          ? `$${m["52WeekLow"].toFixed(2)}`           : "N/A" },
            { label: "P/E TTM",   value: m.peBasicExclExtraTTM   ? m.peBasicExclExtraTTM.toFixed(1)          : "N/A" },
            { label: "Beta",      value: m.beta                   ? m.beta.toFixed(2)                         : "N/A" },
            { label: "RSI",       value: String(stock.rsi) },
            { label: "SCORE",     value: `${stock.momentumScore}/100` },
          ].map(({ label, value }) => (
            <div key={label} className="border border-[#1F1A14] p-1.5 bg-[#F3EDE0] text-[10px]">
              <div className="text-[9px] text-[#8A8378] uppercase tracking-wide">{label}</div>
              <div className="font-bold" style={{ fontFamily: "var(--font-mono)" }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Current holding indicator */}
      {holding && (
        <div className="border border-[#5B8A2A] p-2 bg-[#F3EDE0] text-[10px]">
          <span className="font-bold text-[#5B8A2A]">ถืออยู่:</span>{" "}
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {holding.shares} หุ้น · ต้นทุนเฉลี่ย ${holding.avgCost.toFixed(2)} ·{" "}
            P/L{" "}
            <span style={{ color: livePrice >= holding.avgCost ? "#5B8A2A" : "#E5484D" }}>
              {((livePrice - holding.avgCost) / holding.avgCost * 100).toFixed(1)}%
            </span>
          </span>
        </div>
      )}

      {/* Trade panel */}
      <div className="border border-[#1F1A14] p-3 bg-[#F3EDE0] flex flex-col gap-2">
        {!user ? (
          <div className="text-center">
            <p className="text-[10px] text-[#8A8378] mb-2">เข้าสู่ระบบเพื่อซื้อขายหุ้นจำลอง</p>
            <OffsetButton variant="lime" onClick={() => setShowLoginPrompt(true)}>
              เข้าสู่ระบบ
            </OffsetButton>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[9px] text-[#8A8378] uppercase tracking-wide block mb-0.5" htmlFor="shares-input">
                  จำนวนหุ้น
                </label>
                <input
                  id="shares-input"
                  type="number"
                  value={shares}
                  min="0.001"
                  step="1"
                  onChange={(e) => setShares(e.target.value)}
                  className="w-full border border-[#1F1A14] bg-[#FBF7ED] px-2 py-1 text-xs font-bold"
                  style={{ fontFamily: "var(--font-mono)" }}
                />
              </div>
              <div className="text-right text-[10px]">
                <div className="text-[#8A8378]">ราคา</div>
                <div className="font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                  ${livePrice.toFixed(2)}
                </div>
                <div className="text-[9px] text-[#8A8378]">
                  รวม ${(parseFloat(shares || "0") * livePrice).toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => executeTrade("BUY")}
                disabled={trading}
                className="flex-1 py-2 border-2 border-[#1F1A14] font-bold text-xs uppercase tracking-wide text-[#1F1A14] hatch-buy disabled:opacity-50"
                style={{ boxShadow: "2px 2px 0 #9BE15D" }}
              >
                BUY
              </button>
              <button
                onClick={() => executeTrade("SELL")}
                disabled={trading}
                className="flex-1 py-2 border-2 border-[#1F1A14] font-bold text-xs uppercase tracking-wide text-white hatch-sell disabled:opacity-50"
                style={{ boxShadow: "2px 2px 0 #E5484D" }}
              >
                SELL
              </button>
            </div>
            <div className="text-[9px] flex justify-between text-[#8A8378]">
              <span>USD: <span className="font-bold" style={{ fontFamily: "var(--font-mono)" }}>${user.cashUsd.toFixed(2)}</span></span>
              <span>THB: <span className="font-bold" style={{ fontFamily: "var(--font-mono)" }}>฿{user.cashThb.toLocaleString()}</span></span>
            </div>
          </>
        )}
        {tradeMsg && (
          <p
            className="text-[10px] font-bold text-center"
            style={{ color: tradeMsg.includes("✓") ? "#5B8A2A" : "#E5484D" }}
          >
            {tradeMsg}
          </p>
        )}
        <p className="text-[9px] text-[#8A8378] text-center">
          ไม่ใช่คำแนะนำการลงทุน
        </p>
      </div>

      {/* AI Reasons */}
      <div className="border border-[#1F1A14] p-3 bg-[#F3EDE0]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest">
            เหตุผลที่ติดเรดาร์
          </h3>
          {!aiReason && (
            <OffsetButton size="sm" onClick={loadAiReason} disabled={loadingAi}>
              {loadingAi ? "กำลังวิเคราะห์..." : "วิเคราะห์ AI"}
            </OffsetButton>
          )}
        </div>
        {aiReason ? (
          <p className="text-[10px] leading-relaxed whitespace-pre-line">{aiReason}</p>
        ) : (
          <p className="text-[10px] text-[#8A8378] italic">
            กดปุ่มเพื่อให้ AI วิเคราะห์ว่าหุ้นนี้ติดเรดาร์เพราะอะไร (เครื่องมือวิจัย ไม่ใช่การทำนาย)
          </p>
        )}
      </div>

      {/* AI Full Outlook */}
      <div className="border border-[#1F1A14] p-3 bg-[#F3EDE0]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest">
            วิเคราะห์แนวโน้มด้วย AI
          </h3>
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
          <div className="flex flex-col gap-1.5">
            {[80, 60, 70, 50].map((w) => (
              <div key={w} className="h-2 bg-[#E0D9CC] animate-pulse rounded" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {aiOutlook && (
          <div className="flex flex-col gap-2.5 text-[10px]">
            {/* Thesis */}
            <p className="leading-relaxed">{aiOutlook.thesis}</p>

            {/* Conviction badge */}
            {aiOutlook.conviction && (
              <div className="flex flex-col gap-0.5">
                <span
                  className="self-start px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                  style={{
                    background:
                      aiOutlook.conviction === "high"   ? "#5B8A2A" :
                      aiOutlook.conviction === "medium"  ? "#D97706" : "#DC2626",
                    color: "#fff",
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

            {/* Scenarios */}
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { label: "Bull", data: aiOutlook.bull,  color: "#5B8A2A" },
                  { label: "Base", data: aiOutlook.base,  color: "#1F1A14" },
                  { label: "Bear", data: aiOutlook.bear,  color: "#E5484D" },
                ] as const
              ).map(({ label, data, color }) => (
                <div key={label} className="border border-[#1F1A14] p-1.5 bg-[#FBF7ED]">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-[9px]" style={{ color }}>{label}</span>
                    <span className="text-[9px] text-[#8A8378]">{data.probability}</span>
                  </div>
                  <p className="text-[9px] text-[#1F1A14] leading-snug">{data.description}</p>
                </div>
              ))}
            </div>

            {/* Drivers */}
            {aiOutlook.drivers.length > 0 && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378] mb-0.5">
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

            {/* Risk + Invalidation */}
            <div className="grid grid-cols-2 gap-1">
              <div className="border border-[#1F1A14] p-1.5 bg-[#FBF7ED]">
                <div className="text-[9px] font-bold text-[#E5484D] uppercase tracking-wide mb-0.5">
                  ความเสี่ยง
                </div>
                <p className="text-[9px]">{aiOutlook.risk}</p>
              </div>
              <div className="border border-[#1F1A14] p-1.5 bg-[#FBF7ED]">
                <div className="text-[9px] font-bold text-[#8A8378] uppercase tracking-wide mb-0.5">
                  จะรู้ว่าผิดเมื่อ
                </div>
                <p className="text-[9px]">{aiOutlook.invalidation}</p>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-[9px] text-[#8A8378] italic border-t border-[#E0D9CC] pt-1.5">
              {aiOutlook.disclaimer}
            </p>
          </div>
        )}
      </div>

      {/* News */}
      <StockNewsSection ticker={stock.ticker} />
    </div>
  );
}
