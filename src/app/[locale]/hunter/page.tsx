"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SwotQuadrant {
  strengths:    string[];
  weaknesses:   string[];
  opportunities: string[];
  threats:      string[];
  disclaimer:   string;
}

interface SwotData {
  ticker:      string;
  companyName: string;
  price:       number;
  change1D:    number;
  pe:          string;
  beta:        string;
  grossMargin: string;
  divYield:    string;
  revGrowth3Y: string;
  epsGrowth3Y: string;
  week52High:  number | null;
  week52Low:   number | null;
  swot:        SwotQuadrant;
  swotError?:  string;
  locale:      "en" | "th";
  generatedAt: string;
}

interface RiskFactor {
  name:  string;
  level: "low" | "medium" | "high";
  note:  string;
}

interface RiskData {
  ticker:      string;
  companyName: string;
  price:       number;
  change1D:    number;
  risk: {
    overallRisk: "low" | "medium" | "high";
    factors:     RiskFactor[];
    watchPoints: string[];
    disclaimer:  string;
  };
  riskError?: string;
  locale:      "en" | "th";
  generatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const RISK_COLOR: Record<"low" | "medium" | "high", string> = {
  low:    "#1F9D55",
  medium: "#D97706",
  high:   "#D64545",
};

const RISK_LABEL: Record<"low" | "medium" | "high", Record<"en"|"th", string>> = {
  low:    { en: "Low",    th: "ต่ำ" },
  medium: { en: "Medium", th: "ปานกลาง" },
  high:   { en: "High",   th: "สูง" },
};

function fmtChange(v: number) {
  const s = v >= 0 ? "+" : "";
  return `${s}${v.toFixed(2)}%`;
}

// ── SWOT quadrant ─────────────────────────────────────────────────────────────

const SWOT_STYLE: Record<
  "strengths"|"weaknesses"|"opportunities"|"threats",
  { title: Record<"en"|"th", string>; border: string; bg: string; dot: string }
> = {
  strengths:     { title: { en: "Strengths",     th: "จุดแข็ง" },     border: "#1F9D55", bg: "#F0FDF4", dot: "#1F9D55" },
  weaknesses:    { title: { en: "Weaknesses",    th: "จุดอ่อน" },    border: "#D64545", bg: "#FEF2F2", dot: "#D64545" },
  opportunities: { title: { en: "Opportunities", th: "โอกาส" }, border: "#8B5CF6", bg: "#F5F3FF", dot: "#8B5CF6" },
  threats:       { title: { en: "Threats",       th: "ความเสี่ยง" },       border: "#D97706", bg: "#FFFBEB", dot: "#D97706" },
};

function SwotQuadrantCard({
  type, items, lang,
}: {
  type: "strengths"|"weaknesses"|"opportunities"|"threats";
  items: string[];
  lang: "en"|"th";
}) {
  const s = SWOT_STYLE[type];
  return (
    <div
      style={{ background: s.bg, border: `1.5px solid ${s.border}`, boxShadow: `2px 2px 0 ${s.border}` }}
      className="p-3 flex flex-col gap-2"
    >
      <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: s.border }}>
        {s.title[lang]}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-[#8A8378]">N/A</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
              <span className="text-xs text-[#1A1A1A] leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Risk factor row ───────────────────────────────────────────────────────────

function RiskFactorRow({ factor, lang }: { factor: RiskFactor; lang: "en"|"th" }) {
  const clr = RISK_COLOR[factor.level];
  const lbl = RISK_LABEL[factor.level][lang];
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[#e9edc9] last:border-0">
      <div className="flex-1 min-w-0">
        <span className="text-xs font-bold text-[#1A1A1A]">{factor.name}</span>
        <p className="text-xs text-[#6B6B6B] mt-0.5 leading-relaxed">{factor.note}</p>
      </div>
      <span
        className="text-[10px] font-bold px-2 py-0.5 flex-shrink-0 mt-0.5"
        style={{ color: clr, background: `${clr}18`, border: `1px solid ${clr}` }}
      >
        {lbl}
      </span>
    </div>
  );
}

// ── Metric pill ───────────────────────────────────────────────────────────────

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A8378]">{label}</span>
      <span className="text-sm font-bold text-[#1A1A1A]" style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HunterPage() {
  const { lang }       = useI18n();
  const searchParams   = useSearchParams();
  const [query,   setQuery]   = useState("");
  const [swot,    setSwot]    = useState<SwotData | null>(null);
  const [risk,    setRisk]    = useState<RiskData | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<"data" | "ai" | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [tab,          setTab]          = useState<"swot"|"risk">("swot");
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchloading, setWatchloading] = useState(false);

  const analyze = useCallback(async (ticker: string) => {
    if (!ticker.trim()) return;
    const t = ticker.trim().toUpperCase();
    setLoading(true);
    setLoadingPhase("data");
    setError(null);
    setSwot(null);
    setRisk(null);
    setInWatchlist(false);

    try {
      // Kick off both in parallel — but render SWOT as soon as it arrives
      setLoadingPhase("ai");

      const [swotRes, riskRes] = await Promise.all([
        fetch(`/api/stock/swot?ticker=${encodeURIComponent(t)}&locale=${lang}`),
        fetch(`/api/stock/risk?ticker=${encodeURIComponent(t)}&locale=${lang}`),
      ]);

      if (!swotRes.ok) throw new Error(lang === "th" ? "โหลดข้อมูลไม่สำเร็จ" : "Failed to load analysis");

      // Parse and render SWOT immediately
      const swotData = await swotRes.json() as SwotData;
      setSwot(swotData);
      setLoading(false);
      setLoadingPhase(null);

      // Risk loads in the background — don't block UX
      if (riskRes.ok) {
        const riskData = await riskRes.json() as RiskData;
        setRisk(riskData);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setLoading(false);
      setLoadingPhase(null);
    }
  }, [lang]);

  // Auto-analyze when navigated from screens (/hunter?ticker=AAPL)
  useEffect(() => {
    const t = searchParams.get("ticker")?.toUpperCase();
    if (t) {
      setQuery(t);
      void analyze(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleWatchlist(ticker: string) {
    if (inWatchlist || watchloading) return;
    setWatchloading(true);
    try {
      const res = await fetch("/api/watchlist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ticker }),
      });
      if (res.ok) setInWatchlist(true);
    } catch { /* silent — not critical */ }
    finally { setWatchloading(false); }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void analyze(query);
  }

  const isEn = lang === "en";

  // Popular quick-pick tickers
  const QUICK = ["NVDA","AAPL","TSLA","MSFT","AMZN","GOOGL","META","AMD"];

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-[#1A1A1A]">
              {isEn ? "Hunter — SWOT & Risk" : "Hunter — SWOT & ความเสี่ยง"}
            </h1>
            <p className="text-xs text-[#8A8378] mt-0.5">
              {isEn
                ? "Grounded analysis from real data — observational, not investment advice."
                : "วิเคราะห์จากข้อมูลจริง — เพื่อการศึกษา ไม่ใช่คำแนะนำลงทุน"}
            </p>
          </div>
          <Link
            href="/screens"
            className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1.5 border border-[#ccd5ae] text-[#8A8378] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors"
          >
            {isEn ? "← Screens" : "← คัดกรอง"}
          </Link>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value.toUpperCase())}
            placeholder={isEn ? "Ticker (e.g. AAPL)" : "รหัสหุ้น (เช่น AAPL)"}
            maxLength={10}
            autoCapitalize="characters"
            autoComplete="off"
            className="flex-1 border border-[#ccd5ae] bg-[#fefae0] px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
            aria-label="Stock ticker"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#1A1A1A] hover:bg-[#333] disabled:opacity-40 transition-colors"
            style={{ boxShadow: "2px 2px 0 #8B5CF6" }}
          >
            {loading ? "…" : isEn ? "Analyze" : "วิเคราะห์"}
          </button>
        </form>

        {/* Quick picks */}
        {!swot && !loading && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-2">
              {isEn ? "Quick picks" : "เลือกด่วน"}
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK.map(t => (
                <button
                  key={t}
                  onClick={() => { setQuery(t); void analyze(t); }}
                  className="text-xs font-bold px-3 py-1.5 border border-[#ccd5ae] bg-[#fefae0] text-[#1A1A1A] hover:border-[#1A1A1A] hover:bg-[#faedcd] transition-colors"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-3">
            {/* Phase indicator — so users know something IS happening */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#F5F3FF] border border-[#8B5CF6]">
              <span className="w-4 h-4 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin flex-shrink-0" />
              <span className="text-xs font-bold text-[#8B5CF6]">
                {loadingPhase === "data"
                  ? (isEn ? "Fetching market data…" : "กำลังดึงข้อมูล…")
                  : (isEn ? "Martin is analyzing… (may take 10–30s on first run)" : "Martin กำลังวิเคราะห์… (ครั้งแรกอาจใช้เวลา 10–30 วินาที)")}
              </span>
            </div>
            <div className="flex flex-col gap-3 animate-pulse">
              <div className="h-20 bg-[#e9edc9] rounded" />
              <div className="grid grid-cols-2 gap-3">
                {[0,1,2,3].map(i => <div key={i} className="h-32 bg-[#e9edc9] rounded" />)}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {swot && !loading && (
          <>
            {/* Stock header */}
            <div style={{ background: "#fefae0", border: "1px solid #ccd5ae", boxShadow: "2px 2px 0 #d4a373" }} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "var(--font-mono)" }}>{swot.ticker}</span>
                    <span className="text-xs text-[#8A8378] truncate max-w-[180px]">{swot.companyName}</span>
                  </div>
                  <div className="flex gap-4 mt-2 flex-wrap">
                    <Metric label={isEn ? "Price" : "ราคา"}       value={`$${swot.price.toFixed(2)}`} />
                    <Metric label={isEn ? "1D" : "วันนี้"}        value={fmtChange(swot.change1D)} />
                    <Metric label="P/E"                            value={swot.pe} />
                    <Metric label="Beta"                           value={swot.beta} />
                    <Metric label={isEn ? "Gross %" : "Gross M"}  value={swot.grossMargin} />
                    <Metric label={isEn ? "Div Yield" : "ปันผล"} value={swot.divYield} />
                    <Metric label={isEn ? "Rev 3Y" : "Rev 3Y"}    value={swot.revGrowth3Y} />
                    <Metric label={isEn ? "EPS 3Y" : "EPS 3Y"}    value={swot.epsGrowth3Y} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <Link
                    href={`/stock/${swot.ticker}`}
                    className="text-xs font-bold text-[#8B5CF6] hover:underline"
                  >
                    {isEn ? "Stock page →" : "หน้าหุ้น →"}
                  </Link>
                  <button
                    onClick={() => void toggleWatchlist(swot.ticker)}
                    disabled={inWatchlist || watchloading}
                    className="text-[10px] font-bold px-2 py-1 border transition-colors disabled:opacity-60"
                    style={{
                      borderColor: inWatchlist ? "#1F9D55" : "#ccd5ae",
                      color:       inWatchlist ? "#1F9D55" : "#8A8378",
                      background:  inWatchlist ? "#F0FDF4" : "#fefae0",
                    }}
                    aria-label={isEn ? "Add to watchlist" : "เพิ่มในรายการติดตาม"}
                  >
                    {inWatchlist
                      ? (isEn ? "✓ Watchlisted" : "✓ ติดตามแล้ว")
                      : watchloading
                        ? "…"
                        : (isEn ? "+ Watchlist" : "+ ติดตาม")}
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border border-[#ccd5ae]">
              {(["swot","risk"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 text-xs font-bold py-2 transition-colors"
                  style={{
                    background: tab === t ? "#1A1A1A" : "#fefae0",
                    color:      tab === t ? "#fff" : "#8A8378",
                    borderRight: t === "swot" ? "1px solid #ccd5ae" : undefined,
                  }}
                >
                  {t === "swot"
                    ? (isEn ? "SWOT Analysis" : "วิเคราะห์ SWOT")
                    : (isEn ? "Risk Analysis" : "ความเสี่ยง")}
                </button>
              ))}
            </div>

            {/* SWOT tab */}
            {tab === "swot" && (
              <>
                {swot.swotError ? (
                  <div className="px-4 py-3 bg-amber-50 border border-amber-200">
                    <p className="text-xs text-amber-700">{swot.swotError}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SwotQuadrantCard type="strengths"     items={swot.swot.strengths}     lang={lang} />
                    <SwotQuadrantCard type="weaknesses"    items={swot.swot.weaknesses}    lang={lang} />
                    <SwotQuadrantCard type="opportunities" items={swot.swot.opportunities} lang={lang} />
                    <SwotQuadrantCard type="threats"       items={swot.swot.threats}       lang={lang} />
                  </div>
                )}
                <p className="text-[10px] text-[#8A8378] text-center">
                  {swot.swot.disclaimer}
                </p>
              </>
            )}

            {/* Risk tab */}
            {tab === "risk" && risk && (
              <>
                {risk.riskError ? (
                  <div className="px-4 py-3 bg-amber-50 border border-amber-200">
                    <p className="text-xs text-amber-700">{risk.riskError}</p>
                  </div>
                ) : (
                  <>
                    {/* Overall risk badge */}
                    <div className="flex items-center gap-3 px-4 py-3" style={{ background: "#fefae0", border: "1px solid #ccd5ae" }}>
                      <span className="text-xs font-bold uppercase tracking-wide text-[#8A8378]">
                        {isEn ? "Overall risk" : "ความเสี่ยงรวม"}
                      </span>
                      <span
                        className="text-sm font-bold px-3 py-1"
                        style={{
                          color:      RISK_COLOR[risk.risk.overallRisk],
                          background: `${RISK_COLOR[risk.risk.overallRisk]}18`,
                          border:     `1px solid ${RISK_COLOR[risk.risk.overallRisk]}`,
                        }}
                      >
                        {RISK_LABEL[risk.risk.overallRisk][lang]}
                      </span>
                    </div>

                    {/* Risk factors */}
                    <div style={{ background: "#fefae0", border: "1px solid #ccd5ae" }} className="px-4 py-1">
                      {risk.risk.factors.map((f, i) => (
                        <RiskFactorRow key={i} factor={f} lang={lang} />
                      ))}
                    </div>

                    {/* Watch points */}
                    {risk.risk.watchPoints.length > 0 && (
                      <div style={{ background: "#F5F3FF", border: "1px solid #8B5CF6", borderLeft: "4px solid #8B5CF6" }} className="px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6] mb-2">
                          {isEn ? "What to watch" : "สิ่งที่ต้องติดตาม"}
                        </p>
                        <ul className="flex flex-col gap-1">
                          {risk.risk.watchPoints.map((w, i) => (
                            <li key={i} className="text-xs text-[#1A1A1A] flex gap-2">
                              <span className="text-[#8B5CF6]">▸</span>
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p className="text-[10px] text-[#8A8378] text-center">
                      {risk.risk.disclaimer}
                    </p>
                  </>
                )}
              </>
            )}

            {/* Ask Martin CTA */}
            <Link
              href={`/chat?q=${encodeURIComponent(`Analyze ${swot.ticker} in depth`)}`}
              className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-[#8B5CF6] border border-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white transition-colors"
            >
              ✦ {isEn ? `Ask Martin about ${swot.ticker}` : `ถาม Martin เกี่ยวกับ ${swot.ticker}`}
            </Link>
          </>
        )}
      </div>
    </AppShell>
  );
}
