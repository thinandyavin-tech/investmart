"use client";

import { useState, useCallback } from "react";
import { Link }     from "@/i18n/navigation";
import { AppShell } from "@/components/AppShell";
import { useI18n }  from "@/lib/i18n";
import type { ScorecardResult, PillarRating } from "@/app/api/playbook/scorecard/route";

// ── 7-Pillar lesson data ───────────────────────────────────────────────────────

interface Pillar {
  n:       number;
  icon:    string;
  titleEn: string;
  titleTh: string;
  descEn:  string;
  descTh:  string;
  tipEn:   string;
  tipTh:   string;
  linkHref?: string;
  linkLabelEn?: string;
  linkLabelTh?: string;
}

const PILLARS: Pillar[] = [
  {
    n: 1, icon: "🌊",
    titleEn: "Theme + Runway",
    titleTh: "ธีมและ Runway",
    descEn: "Pick secular growth themes with huge, durable TAMs: AI infrastructure, space economy, cybersecurity, semiconductors, energy transition, fintech. Assess S-curve stage (early disruptors > late majority) and trend durability (10-year+ tailwinds, not fads).",
    descTh: "เลือกธีมที่มี TAM ขนาดใหญ่และยั่งยืน: AI infrastructure, space economy, cybersecurity, semiconductor, พลังงาน, fintech ประเมิน S-curve stage (early disruptor ดีกว่า late majority) และความทนทานของ trend (tailwind 10+ ปี ไม่ใช่ trend ชั่วคราว)",
    tipEn: "Key question: Is this a decade-long megatrend, or a 2-year hype cycle?",
    tipTh: "คำถามหลัก: นี่คือ megatrend ระดับทศวรรษ หรือแค่ hype cycle 2 ปี?",
  },
  {
    n: 2, icon: "🏰",
    titleEn: "Moat (most-weighted factor)",
    titleTh: "ความได้เปรียบแข่งขัน (Moat) — ปัจจัยสำคัญที่สุด",
    descEn: "Five moat types: network effect, switching cost, cost advantage, intangibles (brand/IP/data), efficient scale. Test if it's real: sustained ROIC > WACC, pricing power, high retention, market share gains under competition. Moat determines whether decade-domination is possible.",
    descTh: "5 ประเภท moat: network effect, switching cost, cost advantage, intangibles (แบรนด์/IP/ข้อมูล), efficient scale ทดสอบว่า moat จริงหรือไม่: ROIC > WACC อย่างยั่งยืน, pricing power, retention สูง, market share เพิ่มแม้มีคู่แข่ง Moat คือตัวกำหนดว่าจะครองตลาดระดับทศวรรษได้หรือไม่",
    tipEn: "ROIC consistently > WACC over 3–5 years is the best empirical moat test.",
    tipTh: "ROIC > WACC อย่างสม่ำเสมอ 3–5 ปี คือ moat test ที่ดีที่สุดจากข้อมูลจริง",
  },
  {
    n: 3, icon: "👤",
    titleEn: "Founder-Led + Execution",
    titleTh: "ผู้นำและการดำเนินงาน",
    descEn: "Founder-led management with skin in the game, capital-allocation discipline (buybacks at intrinsic value, strategic acquisitions, avoiding dilution), and a track record of executing and dominating the category. Avoid \"manager-led\" companies prioritizing short-term EPS over long-term compounding.",
    descTh: "ผู้นำที่เป็น founder และมีผลประโยชน์ร่วมกับผู้ถือหุ้น มีวินัยในการจัดสรรทุน (buyback ที่ intrinsic value, M&A เชิงกลยุทธ์, หลีกเลี่ยง dilution) และมีผลงานการดำเนินงานที่ครองตลาดได้",
    tipEn: "Check insider ownership %, share count trend (dilution?), and management commentary consistency.",
    tipTh: "ดู % insiders ถือหุ้น, แนวโน้ม share count (dilution?), และความสม่ำเสมอของ management commentary",
  },
  {
    n: 4, icon: "📊",
    titleEn: "Growth + Quality Metrics",
    titleTh: "การเติบโตและคุณภาพ",
    descEn: "Revenue growth tiers (>30% hyper, 15–30% strong, <15% mature). FCF margin + path to profitability. NRR (net revenue retention) > 110% for SaaS. Gross margin (>70% for software = pricing power). Explicitly: classic P/B is not the lens here — growth disruptors rarely look cheap on book value.",
    descTh: "Revenue growth tiers (>30% hyper, 15–30% strong, <15% mature) FCF margin + เส้นทางสู่กำไร NRR > 110% สำหรับ SaaS Gross margin > 70% สำหรับ software หมายเหตุ: P/B ไม่ใช่ metric ที่ใช้ที่นี่ — growth disruptor มักดูแพงบน book value เสมอ",
    tipEn: "The best growth companies look expensive on traditional metrics — that's the point.",
    tipTh: "บริษัทเติบโตที่ดีที่สุดมักดูแพงบน metric แบบดั้งเดิม — นั่นคือจุดที่ต้องใช้ Reverse DCF",
  },
  {
    n: 5, icon: "⚖️",
    titleEn: "Valuation = What's Priced In",
    titleTh: "มูลค่า = ตลาดตั้งราคาอะไรไว้?",
    descEn: "Growth disruptors look expensive on P/E, P/S, and P/B. The real question: is the market-implied CAGR achievable? Use Reverse DCF to find Market-Implied CAGR vs Plausible CAGR. A \"high P/E\" only matters if the implied growth is implausible.",
    descTh: "Growth disruptors ดูแพงบน P/E, P/S, P/B เสมอ คำถามที่แท้จริงคือ: ตลาดต้องการ CAGR เท่าไร และมันเป็นไปได้หรือไม่? ใช้ Reverse DCF หาค่า Market-Implied CAGR vs Plausible CAGR P/E สูงมีความหมายก็ต่อเมื่อ implied growth เป็นไปไม่ได้",
    tipEn: "High P/E + low implied CAGR = potentially interesting. Low P/E + high implied CAGR = skepticism warranted.",
    tipTh: "P/E สูง + implied CAGR ต่ำ = น่าสนใจ / P/E ต่ำ + implied CAGR สูง = ระวัง",
    linkHref: "/valuation",
    linkLabelEn: "Open Reverse DCF →",
    linkLabelTh: "เปิด Reverse DCF →",
  },
  {
    n: 6, icon: "📍",
    titleEn: "Entries: DCA + Technical Levels",
    titleTh: "จังหวะเข้า: DCA + แนวเทคนิค",
    descEn: "Build positions with Dollar-Cost Averaging — the single most practical strategy for volatile growth stocks. Fibonacci retracement levels (23.6%, 38.2%, 50%, 61.8% from 52-wk high to low) are common technical reference zones. These are reference levels, not predictions. The biggest risk: waiting for a 'perfect' pullback that never comes on the best names.",
    descTh: "สร้างตำแหน่งด้วย Dollar-Cost Averaging — กลยุทธ์ที่ใช้งานได้จริงที่สุดสำหรับหุ้นเติบโตที่ผันผวน Fibonacci retracement (23.6%, 38.2%, 50%, 61.8% จาก 52-wk high ถึง low) เป็น reference zone ที่นักลงทุนหลายคนดู ทั้งหมดนี้คือ reference levels ไม่ใช่การทำนาย ความเสี่ยงที่ใหญ่ที่สุด: รอ pullback ที่สมบูรณ์แบบจนพลาดหุ้นที่ดีที่สุด",
    tipEn: "DCA removes the pressure to time perfectly. Fibonacci levels show where buyers historically have stepped in — not where they will.",
    tipTh: "DCA ช่วยลดแรงกดดันในการจับจังหวะที่สมบูรณ์แบบ Fibonacci แสดงจุดที่ผู้ซื้อเคยเข้าในอดีต ไม่ใช่อนาคต",
  },
  {
    n: 7, icon: "🛡️",
    titleEn: "Risk & Survival",
    titleTh: "ความเสี่ยงและการรอดชีวิต",
    descEn: "Volatility is the price of admission for high-growth stocks. Risk-of-ruin thinking: never size a position so large that a 50–80% drawdown forces a bad decision. Position sizing (conviction × max-cap) protects against permanent loss. Know the invalidation: what data would disprove your thesis?",
    descTh: "ความผันผวนคือราคาที่ต้องจ่ายสำหรับหุ้นเติบโตสูง คิดแบบ risk-of-ruin: อย่าถือตำแหน่งใหญ่จนกระทั่งการลดลง 50–80% บังคับให้ตัดสินใจผิดพลาด Position sizing (conviction × max-cap) ป้องกันการสูญเสียถาวร รู้ invalidation: ข้อมูลอะไรที่จะทำให้ thesis ของคุณผิด?",
    tipEn: "\"Volatility is not risk. Permanent loss of capital is risk.\" Size accordingly.",
    tipTh: '"ความผันผวนไม่ใช่ความเสี่ยง การสูญเสียทุนถาวรต่างหากที่คือความเสี่ยง" จัดขนาดตำแหน่งให้เหมาะสม',
    linkHref: "/valuation",
    linkLabelEn: "Position Sizing Tool →",
    linkLabelTh: "เครื่องคำนวณ Position Sizing →",
  },
];

// ── Scorecard rating helpers ───────────────────────────────────────────────────

const RATING_STYLE: Record<PillarRating, { bg: string; border: string; text: string }> = {
  Strong: { bg: "#F0FDF4", border: "#86EFAC", text: "#16A34A" },
  Mixed:  { bg: "#FFFBEB", border: "#FCD34D", text: "#D97706" },
  Weak:   { bg: "#FEF2F2", border: "#FCA5A5", text: "#DC2626" },
  "N/A":  { bg: "#F8F5EF", border: "#E4DDD2", text: "#8A8378" },
};

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;
const QUICK = ["NVDA", "TSLA", "AMZN", "PLTR", "RKLB"];

// ── Sub-components ────────────────────────────────────────────────────────────

function PillarLesson({ p, isEn }: { p: Pillar; isEn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid #C8BFB0", background: "#FDFAF4" }} className="overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F3EDE0] transition-colors"
        aria-expanded={open}
      >
        <span className="text-xl flex-shrink-0">{p.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-[#8A8378] tabular-nums">#{p.n}</span>
            <span className="text-xs font-bold text-[#1A1A1A]">{isEn ? p.titleEn : p.titleTh}</span>
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8378" strokeWidth="2" className="flex-shrink-0">
          <path d={open ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-2 border-t border-[#E4DDD2]">
          <p className="text-xs text-[#3D3730] leading-relaxed mt-3">{isEn ? p.descEn : p.descTh}</p>
          <div className="px-3 py-2" style={{ background: "#F3EDE0", borderLeft: "3px solid #1A1A1A" }}>
            <p className="text-[10px] text-[#3D3730] italic">{isEn ? p.tipEn : p.tipTh}</p>
          </div>
          {p.linkHref && (
            <Link href={p.linkHref}
              className="self-start text-[10px] font-bold text-[#8B5CF6] hover:underline">
              {isEn ? p.linkLabelEn : p.linkLabelTh}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function ScorecardCard({ pillar, isEn }: { pillar: NonNullable<ScorecardResult["pillars"]>[number]; isEn: boolean }) {
  const s = RATING_STYLE[pillar.rating];
  return (
    <div style={{ border: `1px solid ${s.border}`, background: s.bg }} className="px-4 py-3 flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[8px] font-bold text-[#8A8378] tabular-nums">#{pillar.pillar} </span>
          <span className="text-xs font-bold text-[#1A1A1A]">{isEn ? pillar.title : pillar.titleTh}</span>
        </div>
        <span className="text-[9px] font-bold px-2 py-0.5 flex-shrink-0" style={{ background: s.border + "60", color: s.text }}>
          {pillar.rating}
        </span>
      </div>
      <p className="text-[10px] text-[#3D3730] leading-relaxed">{pillar.summary}</p>
      {pillar.dataUsed.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pillar.dataUsed.map((d, i) => (
            <span key={i} className="text-[8px] px-1.5 py-0.5 bg-white border border-[#E4DDD2] text-[#8A8378]">{d}</span>
          ))}
        </div>
      )}
      {pillar.caveat && (
        <p className="text-[8px] text-amber-700 italic">⚠ {pillar.caveat}</p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlaybookPage() {
  const { lang }   = useI18n();
  const isEn = lang === "en";

  const [ticker,    setTicker]    = useState("");
  const [scorecard, setScorecard] = useState<ScorecardResult | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"lesson" | "scorecard" | "investors">("lesson");

  const runScorecard = useCallback(async (t: string) => {
    if (!TICKER_RE.test(t)) return;
    setLoading(true); setError(null); setScorecard(null); setActiveTab("scorecard");
    try {
      const res = await fetch(`/api/playbook/scorecard?ticker=${encodeURIComponent(t)}&locale=${lang}`);
      if (!res.ok) throw new Error("Failed to generate scorecard");
      const data = await res.json() as ScorecardResult;
      setScorecard(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  }, [lang]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    if (TICKER_RE.test(t)) void runScorecard(t);
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-[#1A1A1A]">
              {isEn ? "Thematic Growth Playbook" : "คู่มือลงทุนหุ้นเติบโตเชิงธีม"}
            </h1>
            <p className="text-xs text-[#8A8378] mt-0.5">
              {isEn
                ? "7-pillar framework · Moat-first · Decade-domination potential · Educational, not advice"
                : "กรอบ 7 เสา · Moat สำคัญที่สุด · ศักยภาพครองตลาดระดับทศวรรษ · เพื่อการศึกษา ไม่ใช่คำแนะนำ"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/valuation" className="text-[10px] font-bold px-2.5 py-1.5 border border-[#C8BFB0] text-[#8A8378] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors">
              {isEn ? "Valuation Lab ↗" : "ห้องวิเคราะห์ ↗"}
            </Link>
            <Link href="/hunter" className="text-[10px] font-bold px-2.5 py-1.5 border border-[#C8BFB0] text-[#8A8378] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors">
              SWOT ↗
            </Link>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-[#C8BFB0]">
          {([
            { k: "lesson",    en: "7-Pillar Lesson",   th: "บทเรียน 7 เสา" },
            { k: "scorecard", en: "Playbook Scorecard", th: "Scorecard" },
            { k: "investors", en: "Approach & Investors", th: "นักลงทุนที่ใช้แนวทางนี้" },
          ] as const).map(({ k, en, th }) => (
            <button key={k} onClick={() => setActiveTab(k)}
              className="flex-1 text-[10px] font-bold py-2 transition-colors"
              style={{
                borderBottom: activeTab === k ? "2px solid #1A1A1A" : "2px solid transparent",
                color: activeTab === k ? "#1A1A1A" : "#8A8378",
              }}>
              {isEn ? en : th}
            </button>
          ))}
        </div>

        {/* ── Lesson tab ── */}
        {activeTab === "lesson" && (
          <div className="flex flex-col gap-3">
            <div className="px-4 py-3" style={{ background: "#F5F3FF", border: "1px solid #8B5CF6", borderLeft: "4px solid #8B5CF6" }}>
              <p className="text-[10px] font-bold text-[#8B5CF6] mb-1">
                {isEn ? "The Method" : "แนวคิดหลัก"}
              </p>
              <p className="text-[10px] text-[#4B4569] leading-relaxed">
                {isEn
                  ? "Thematic growth investing focuses on early disruptors in secular mega-trends. The goal is to identify companies with durable moats and decade-domination potential, where the market hasn't yet fully appreciated the long-term compounding. Classic value ratios (P/B, P/E) are not the primary lens — the key question is whether today's price is asking for plausible growth."
                  : "Thematic growth investing มุ่งเน้นที่ early disruptors ใน mega-trends ระยะยาว เป้าหมายคือหาบริษัทที่มี moat ที่แข็งแกร่งและศักยภาพครองตลาดระดับทศวรรษ ในขณะที่ตลาดยังไม่ได้ตั้งราคารวม long-term compounding ไว้ครบ P/B และ P/E ไม่ใช่ lens หลัก — คำถามสำคัญคือราคาวันนี้ต้องการ growth ที่เป็นไปได้หรือไม่"}
              </p>
            </div>
            {PILLARS.map(p => <PillarLesson key={p.n} p={p} isEn={isEn} />)}

            {/* Learning path */}
            <div style={{ background: "#FDFAF4", border: "1px solid #C8BFB0" }} className="px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-2">
                {isEn ? "Learning Path" : "เส้นทางการเรียนรู้"}
              </p>
              <div className="flex items-center gap-1 flex-wrap text-[9px]">
                {(
                  [
                    { label: isEn ? "Foundations" : "พื้นฐาน", href: "/blueprint" as string, active: false },
                    { label: "→",                              href: null,              active: false },
                    { label: isEn ? "Fundamental Analysis" : "วิเคราะห์พื้นฐาน", href: "/learn/fundamental" as string, active: false },
                    { label: "→",                              href: null,              active: false },
                    { label: isEn ? "Thematic Playbook" : "Thematic Playbook", href: "/playbook" as string, active: true },
                  ] as { label: string; href: string | null; active: boolean }[]
                ).map((item, i) =>
                  item.href ? (
                    <Link key={i} href={item.href}
                      className="font-bold px-2 py-0.5 border transition-colors"
                      style={{
                        borderColor: item.active ? "#1A1A1A" : "#C8BFB0",
                        background: item.active ? "#1A1A1A" : "#FDFAF4",
                        color: item.active ? "#fff" : "#8A8378",
                      }}>
                      {item.label}
                    </Link>
                  ) : (
                    <span key={i} className="text-[#8A8378]">{item.label}</span>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Scorecard tab ── */}
        {activeTab === "scorecard" && (
          <div className="flex flex-col gap-4">
            <div style={{ background: "#FDFAF4", border: "1px solid #C8BFB0", boxShadow: "2px 2px 0 #1A1A1A" }} className="px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-1">
                {isEn ? "Playbook Scorecard — Martin's read" : "Playbook Scorecard — มุมมองของ Martin"}
              </p>
              <p className="text-[9px] text-[#8A8378] mb-3">
                {isEn
                  ? "Rates a stock against all 7 pillars using real fundamentals. Observational — never buy/sell. 30-min cache."
                  : "ประเมินหุ้นตาม 7 เสาด้วยข้อมูลจริง — เพื่อการศึกษา ไม่ใช่คำแนะนำ cache 30 นาที"}
              </p>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text" value={ticker}
                  onChange={e => setTicker(e.target.value.toUpperCase())}
                  placeholder={isEn ? "Ticker (e.g. NVDA)" : "รหัสหุ้น (เช่น NVDA)"}
                  maxLength={10} autoCapitalize="characters"
                  className="flex-1 border border-[#C8BFB0] bg-[#FDFAF4] px-3 py-2 text-sm font-bold focus:outline-none focus:border-[#1A1A1A]"
                  style={{ fontFamily: "var(--font-mono)" }}
                />
                <button type="submit" disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-40 transition-colors"
                  style={{ boxShadow: "2px 2px 0 #1A1A1A" }}>
                  {loading ? "…" : isEn ? "Score with Martin" : "วิเคราะห์"}
                </button>
              </form>
              {!scorecard && !loading && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {QUICK.map(t => (
                    <button key={t} onClick={() => { setTicker(t); void runScorecard(t); }}
                      className="text-xs font-bold px-3 py-1 border border-[#C8BFB0] bg-[#FDFAF4] hover:border-[#1A1A1A] transition-colors"
                      style={{ fontFamily: "var(--font-mono)" }}>{t}</button>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col gap-3">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-20 bg-[#F3EDE0] animate-pulse" />
                ))}
              </div>
            )}

            {scorecard && (
              <div className="flex flex-col gap-3">
                {/* Stock header */}
                <div style={{ background: "#FDFAF4", border: "1px solid #C8BFB0" }} className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold" style={{ fontFamily: "var(--font-mono)" }}>{scorecard.ticker}</span>
                    {scorecard.name && <span className="text-xs text-[#8A8378] truncate max-w-[200px]">{scorecard.name}</span>}
                    {scorecard.industry && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#F3EDE0] border border-[#C8BFB0] text-[#8A8378]">
                        {scorecard.industry}
                      </span>
                    )}
                    {scorecard.price && (
                      <span className="text-sm font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                        ${scorecard.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-[#8A8378] mt-1">
                    {isEn ? "Generated" : "สร้างเมื่อ"}{" "}
                    {new Date(scorecard.generatedAt).toLocaleString()} · {scorecard.dataSource}
                  </p>
                </div>

                {/* Pillar scores */}
                {scorecard.pillars.map(pil => (
                  <ScorecardCard key={pil.pillar} pillar={pil} isEn={isEn} />
                ))}

                {/* Disclaimer */}
                <div className="px-4 py-3" style={{ background: "#FFFBEB", borderLeft: "4px solid #D97706" }}>
                  <p className="text-[9px] text-amber-800">{scorecard.disclaimer}</p>
                </div>

                {/* Ask Martin CTA */}
                <Link
                  href={`/chat?q=${encodeURIComponent(`Apply the thematic growth framework to ${scorecard.ticker}: how strong is the moat, is the implied growth plausible, what are the main risks?`)}`}
                  className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-[#8B5CF6] border border-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white transition-colors"
                >
                  ✦ {isEn ? `Discuss ${scorecard.ticker} with Martin` : `คุยกับ Martin เรื่อง ${scorecard.ticker}`}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Investors tab ── */}
        {activeTab === "investors" && (
          <div className="flex flex-col gap-4">
            {/* Non-affiliation disclaimer — FIRST, always visible */}
            <div style={{ borderLeft: "4px solid #D97706", background: "#FFFBEB" }} className="px-4 py-3 border border-amber-200">
              <p className="text-[10px] font-bold text-amber-700 mb-1">
                {isEn ? "Disclaimer" : "ข้อสังเกต"}
              </p>
              <p className="text-[9px] text-amber-800 leading-relaxed">
                {isEn
                  ? "InvestMart is not affiliated with or endorsed by any of the individuals below. Links point to their own public content. Their views are their own and are not investment advice. Martin is InvestMart's own educational AI — it does not impersonate or role-play as any real person."
                  : "InvestMart ไม่มีความเกี่ยวข้องหรือได้รับการรับรองจากบุคคลด้านล่าง ลิงก์ชี้ไปยังเนื้อหาสาธารณะของพวกเขาเอง ความเห็นของพวกเขาเป็นของพวกเขาเองและไม่ใช่คำแนะนำลงทุน Martin คือ AI เพื่อการศึกษาของ InvestMart — ไม่แสร้งเป็นบุคคลจริงใด"}
              </p>
            </div>

            {/* Shay Boloor */}
            <div style={{ background: "#FDFAF4", border: "1px solid #C8BFB0", boxShadow: "2px 2px 0 #1A1A1A" }} className="px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 flex-shrink-0 bg-[#1A1A1A] flex items-center justify-center text-white font-bold text-sm">SB</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#1A1A1A]">Shay Boloor</span>
                    <span className="text-[9px] text-[#8A8378]">Chief Market Strategist, Futurum Equities</span>
                  </div>
                  <p className="text-[10px] text-[#3D3730] leading-relaxed mt-2">
                    {isEn
                      ? "Shay Boloor is publicly known for a moat-first, thematic growth approach: identifying secular trends with durable TAMs, prioritizing companies with strong competitive advantages, preferring founder-led management, and using DCA with Fibonacci retracement levels as entry reference zones. His public market commentary can be found at:"
                      : "Shay Boloor เป็นที่รู้จักจากแนวทาง moat-first, thematic growth: ระบุ secular trends ที่มี TAM ขนาดใหญ่, ให้ความสำคัญกับบริษัทที่มี competitive advantage แข็งแกร่ง, ชอบ founder-led management, และใช้ DCA กับ Fibonacci retracement levels เป็น reference zones สำหรับการเข้า ดูเนื้อหาสาธารณะของเขาได้ที่:"}
                  </p>
                  <div className="flex gap-3 mt-2 flex-wrap">
                    <a href="https://twitter.com/StockSavvyShay" target="_blank" rel="noopener noreferrer"
                      className="text-[10px] font-bold text-[#8B5CF6] hover:underline">
                      @StockSavvyShay ↗
                    </a>
                    <a href="https://futurumequities.com" target="_blank" rel="noopener noreferrer"
                      className="text-[10px] font-bold text-[#8B5CF6] hover:underline">
                      futurumequities.com ↗
                    </a>
                  </div>
                  <p className="text-[8px] text-[#8A8378] mt-2 italic">
                    {isEn
                      ? "Methodology described here is InvestMart's own implementation of publicly documented thematic-growth concepts, credited to Shay Boloor's public work as inspiration."
                      : "วิธีการที่อธิบายที่นี่คือการนำแนวคิด thematic growth ที่เป็นสาธารณะมาใช้ใน InvestMart โดยอ้างอิงงานสาธารณะของ Shay Boloor เป็นแรงบันดาลใจ"}
                  </p>
                </div>
              </div>
            </div>

            {/* Context */}
            <div style={{ background: "#FDFAF4", border: "1px solid #C8BFB0" }} className="px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-1">
                {isEn ? "About this approach" : "เกี่ยวกับแนวทางนี้"}
              </p>
              <p className="text-[10px] text-[#3D3730] leading-relaxed">
                {isEn
                  ? "Thematic growth investing, moat analysis, GARP (Growth at a Reasonable Price), Fibonacci technical levels, and DCA are all well-established public methodologies in the investment community. InvestMart's Playbook is its own educational implementation — combining these publicly available frameworks with real data tools (Reverse DCF, SWOT, Screener) in one place."
                  : "Thematic growth investing, moat analysis, GARP, Fibonacci technical levels, และ DCA เป็นวิธีการที่เป็นสาธารณะในชุมชนการลงทุน Playbook ของ InvestMart คือการนำกรอบที่มีอยู่แล้วในที่สาธารณะมาสร้างเป็นเครื่องมือการศึกษา พร้อมข้อมูลจริง"}
              </p>
            </div>
          </div>
        )}

        {/* ── Always-on disclaimer ── */}
        <div style={{ borderLeft: "4px solid #1A1A1A", background: "#F8F5EF" }} className="px-4 py-3">
          <p className="text-[9px] text-[#6B6B6B] leading-relaxed">
            {isEn
              ? "This page is for educational purposes only. Nothing here constitutes investment advice, a solicitation, or a recommendation to buy or sell any security. Past performance is not indicative of future results. Always do your own research and consider consulting a licensed financial advisor."
              : "หน้านี้มีไว้เพื่อการศึกษาเท่านั้น ไม่มีสิ่งใดที่นี่ถือเป็นคำแนะนำลงทุน การชักชวน หรือคำแนะนำให้ซื้อหรือขายหลักทรัพย์ใด ผลการดำเนินงานในอดีตไม่ได้บ่งชี้ผลในอนาคต ควรศึกษาข้อมูลด้วยตัวเองและพิจารณาปรึกษาที่ปรึกษาทางการเงินที่มีใบอนุญาต"}
          </p>
        </div>

      </div>
    </AppShell>
  );
}
