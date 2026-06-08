"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { InfographicCard, InfographicsResponse } from "@/app/api/news/infographics/route";

// ─── Category icons (SVG inline, accessible) ─────────────────────────────────

function CategoryIcon({ hint }: { hint: InfographicCard["icon_hint"] }) {
  const props = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", "aria-hidden": true as const };
  switch (hint) {
    case "chart":   return <svg {...props}><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-8"/></svg>;
    case "chip":    return <svg {...props}><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M7 9H5M7 12H5M7 15H5M17 9h2M17 12h2M17 15h2M9 7V5M12 7V5M15 7V5M9 17v2M12 17v2M15 17v2"/></svg>;
    case "globe":   return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>;
    case "warning": return <svg {...props}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case "gavel":   return <svg {...props}><path d="M14 2L9 7l8 8 5-5-8-8z"/><path d="M2 20l5-5M4 20H2v-2"/></svg>;
    case "money":   return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M12 6v2M12 16v2M8.93 8.93l1.41 1.41M13.66 13.66l1.41 1.41M6 12h2M16 12h2M8.93 15.07l1.41-1.41M13.66 10.34l1.41-1.41"/></svg>;
    case "rocket":  return <svg {...props}><path d="M4.5 16.5c-1.5 1.5-2 4-2 4s2.5-.5 4-2l8-8-2-2-8 8z"/><path d="M14 2s4 0 6 6l-4 4-6-6 4-4z"/><circle cx="16" cy="8" r="1" fill="currentColor"/></svg>;
    case "oil":     return <svg {...props}><path d="M9 3h6l2 3H7L9 3z"/><path d="M7 6v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6"/><path d="M7 10h10"/></svg>;
    case "bank":    return <svg {...props}><path d="M3 21h18M3 10h18M5 10V21M19 10V21M12 3L3 10h18L12 3z"/></svg>;
    case "car":     return <svg {...props}><path d="M5 17H3v-5l3-5h12l3 5v5h-2M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0"/><path d="M5 12h14"/></svg>;
    default:        return <svg {...props}><path d="M4 6h16M4 12h16M4 18h7"/></svg>;
  }
}

// ─── Sentiment colors ─────────────────────────────────────────────────────────

const SENTIMENT_STYLE: Record<InfographicCard["sentiment"], { accent: string; bg: string; badge: string }> = {
  positive: { accent: "#5B8A2A", bg: "#F6FAF0", badge: "#DCFCE7" },
  negative: { accent: "#DC2626", bg: "#FEF9F9", badge: "#FEE2E2" },
  neutral:  { accent: "#1F1A14", bg: "#FDFAF4", badge: "#F0EBE0" },
};

const CATEGORY_LABEL: Record<InfographicCard["category"], string> = {
  earnings:   "ผลประกอบการ",
  product:    "ผลิตภัณฑ์",
  ma:         "M&A",
  macro:      "มหภาค",
  disaster:   "เหตุการณ์",
  regulatory: "กฎระเบียบ",
  other:      "ข่าว",
};

// ─── Single card ──────────────────────────────────────────────────────────────

function InfographicCard({ card }: { card: InfographicCard }) {
  const [expanded, setExpanded] = useState(false);
  const s = SENTIMENT_STYLE[card.sentiment];
  const moveSign = (card.ticker_move ?? 0) >= 0 ? "+" : "";

  return (
    <article
      className="flex-shrink-0 w-72 border-2 border-[#1F1A14] flex flex-col select-text"
      style={{ background: s.bg, boxShadow: "4px 4px 0 #1F1A14" }}
      aria-label={card.headline_th}
    >
      {/* Top bar: category + icon */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b-2 border-[#1F1A14]"
        style={{ background: s.badge }}
      >
        <span style={{ color: s.accent }}>
          <CategoryIcon hint={card.icon_hint} />
        </span>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: s.accent }}>
          {CATEGORY_LABEL[card.category]}
        </span>
        {card.sentiment === "positive" && <span className="ml-auto text-xs" style={{ color: s.accent }} aria-label="บวก">▲</span>}
        {card.sentiment === "negative" && <span className="ml-auto text-xs" style={{ color: s.accent }} aria-label="ลบ">▼</span>}
      </div>

      {/* Headline */}
      <div className="px-3 pt-2.5 pb-1.5 flex-1">
        <h3
          className="text-[13px] font-bold leading-snug mb-2"
          style={{ fontFamily: "var(--font-noto-thai), var(--font-inter), sans-serif" }}
        >
          {card.headline_th}
        </h3>

        {/* Ticker chip */}
        {card.ticker && (
          <div className="mb-2">
            <Link
              href={`/stock/${card.ticker}`}
              className="inline-flex items-center gap-1.5 border border-[#1F1A14] px-2 py-0.5 text-xs font-bold font-mono hover:bg-[#1F1A14] hover:text-white transition-colors"
              aria-label={`ดูหุ้น ${card.ticker}`}
            >
              ${card.ticker}
              {card.ticker_move !== null && (
                <span style={{ color: card.ticker_move >= 0 ? "#5B8A2A" : "#DC2626" }}>
                  {moveSign}{card.ticker_move.toFixed(2)}%
                </span>
              )}
            </Link>
          </div>
        )}

        {/* Key fact chips */}
        <ul className="flex flex-col gap-1" role="list">
          {card.key_facts.slice(0, 3).map((fact, i) => (
            <li
              key={i}
              className="text-xs leading-relaxed text-[#1F1A14] flex gap-1.5"
            >
              <span aria-hidden="true" style={{ color: s.accent }} className="mt-px flex-shrink-0">▸</span>
              <span>{fact}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[#E8E2D4] flex items-center justify-between gap-2">
        <span className="text-xs text-[#8A8378] truncate">
          {card.source_name}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs font-bold text-[#8A8378] hover:text-[#1F1A14] transition-colors"
            aria-expanded={expanded}
          >
            {expanded ? "ซ่อน" : "AI ▸"}
          </button>
          <a
            href={card.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold underline text-[#1F1A14]"
            aria-label={`อ่านต้นฉบับจาก ${card.source_name}`}
          >
            ต้นฉบับ ↗
          </a>
        </div>
      </div>

      {/* Expanded: AI analysis */}
      {expanded && (
        <div className="px-3 pb-2 border-t border-[#E8E2D4] bg-[#F3EDE0]">
          <p className="text-xs text-[#8A8378] pt-2">
            ต้องการวิเคราะห์ AI เพิ่มเติม?
          </p>
          <a
            href={card.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs font-bold text-[#5B8A2A] underline mt-0.5"
          >
            เปิดต้นฉบับ → แล้วกด "ตรวจสอบ + สรุปด้วย AI"
          </a>
          <p className="text-xs text-[#8A8378] mt-1">
            AI สร้าง infographic นี้จากข้อมูลจริง · ไม่ใช่คำแนะนำการลงทุน
          </p>
        </div>
      )}
    </article>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex-shrink-0 w-72 h-48 border-2 border-[#E8E2D4] bg-white" style={{ boxShadow: "4px 4px 0 #E8E2D4" }}>
      <div className="h-8 bg-[#F0EBE0] border-b-2 border-[#E8E2D4]" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-full bg-[#E8E2D4] animate-pulse rounded" />
        <div className="h-4 w-4/5 bg-[#E8E2D4] animate-pulse rounded" />
        <div className="h-3 w-24 bg-[#E8E2D4] animate-pulse rounded" />
        <div className="h-2.5 w-full bg-[#E8E2D4] animate-pulse rounded" />
        <div className="h-2.5 w-3/4 bg-[#E8E2D4] animate-pulse rounded" />
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function InfographicsSection() {
  const [cards, setCards]           = useState<InfographicCard[]>([]);
  const [generatedAt, setGenAt]     = useState<number | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);

  const load = useCallback(() => {
    setError(false);
    setLoading(true);
    fetch("/api/news/infographics")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<InfographicsResponse>;
      })
      .then((d) => {
        setCards(d.cards ?? []);
        setGenAt(d.generated_at ?? null);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const timeLabel = generatedAt
    ? new Date(generatedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <section aria-labelledby="infographics-heading">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2
            id="infographics-heading"
            className="text-xs font-bold uppercase tracking-widest"
          >
            ข่าวเด่นวันนี้ · Infographic
          </h2>
          {timeLabel && (
            <p className="text-xs text-[#8A8378] mt-0.5">
              อัพเดทล่าสุด {timeLabel} · อัพเดท 6×/วัน
            </p>
          )}
        </div>
        {error && (
          <button
            onClick={load}
            className="text-xs font-bold border border-[#1F1A14] px-2 py-0.5 hover:bg-[#1F1A14] hover:text-white transition-colors"
          >
            ลองใหม่
          </button>
        )}
      </div>

      {loading ? (
        <div
          className="flex gap-3 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "none" }}
          aria-busy="true"
          aria-label="กำลังโหลด infographic"
        >
          {[0, 1, 2].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <p className="text-xs text-[#8A8378] py-3">ไม่สามารถโหลด infographic ได้ในขณะนี้</p>
      ) : cards.length === 0 ? (
        <p className="text-xs text-[#8A8378] py-3">ยังไม่มีข่าวเด่นวันนี้</p>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pb-3"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#1F1A14 transparent" }}
          role="list"
          aria-label={`infographic ข่าวเด่น ${cards.length} รายการ`}
        >
          {cards.map(card => (
            <div key={card.id} role="listitem">
              <InfographicCard card={card} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
