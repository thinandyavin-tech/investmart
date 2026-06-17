"use client";

import { useState, useEffect, useCallback } from "react";
import { Link }      from "@/i18n/navigation";
import { AppShell }  from "@/components/AppShell";
import { useI18n }   from "@/lib/i18n";
import { useUser }   from "@/lib/userContext";
import { ThesisCapture } from "@/components/journal/ThesisCapture";
import type { JournalResponse, JournalTrade, JournalPosition } from "@/app/api/journal/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  theme:     { bg: "#DBEAFE", text: "#1D4ED8" },
  moat:      { bg: "#FEF3C7", text: "#D97706" },
  valuation: { bg: "#F3E8FF", text: "#7C3AED" },
  catalyst:  { bg: "#DCFCE7", text: "#16A34A" },
  growth:    { bg: "#FEE2E2", text: "#DC2626" },
  technical: { bg: "#F1F5F9", text: "#475569" },
  macro:     { bg: "#FFF7ED", text: "#EA580C" },
  other:     { bg: "#F3EDE0", text: "#8A8378" },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtPrice(v: number): string {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function pctColor(v: number): string {
  return v >= 0 ? "#16A34A" : "#DC2626";
}

// ── Martin Review Panel ───────────────────────────────────────────────────────

function MartinReview({ tradeId, locale, isEn }: { tradeId: string; locale: string; isEn: boolean }) {
  const [review,  setReview]  = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function requestReview() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/journal/review", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tradeId, locale }),
      });
      if (!res.ok) throw new Error("Review failed");
      const data = await res.json() as { review: string };
      setReview(data.review);
    } catch { setError(isEn ? "Review failed — try again." : "รีวิวไม่สำเร็จ — ลองใหม่"); }
    finally { setLoading(false); }
  }

  if (review) {
    return (
      <div className="mt-2 px-3 py-2.5 bg-[#F5F3FF] border border-[#C4B5FD] text-[10px] leading-relaxed text-[#4B4569] whitespace-pre-line">
        <p className="text-[9px] font-bold text-[#8B5CF6] uppercase tracking-widest mb-1.5">✦ Martin's review</p>
        {review}
      </div>
    );
  }

  return (
    <button
      onClick={() => void requestReview()}
      disabled={loading}
      className="mt-2 text-[9px] font-bold px-2.5 py-1 text-[#8B5CF6] border border-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white transition-colors disabled:opacity-40"
    >
      {loading ? "…" : isEn ? "✦ Ask Martin to review this thesis" : "✦ ให้ Martin รีวิว thesis นี้"}
    </button>
  );
}

// ── Trade Row ─────────────────────────────────────────────────────────────────

interface TradeRowProps {
  trade:       JournalTrade;
  currentPrice: number | null;
  isEn:        boolean;
  locale:      string;
  onEditThesis: (tradeId: string, ticker: string, side: "BUY" | "SELL", shares: number, price: number) => void;
}

function TradeRow({ trade, currentPrice, isEn, locale, onEditThesis }: TradeRowProps) {
  const isBuy = trade.side === "BUY";
  const pnl   = currentPrice && isBuy
    ? ((currentPrice - trade.price) / trade.price) * 100
    : null;

  return (
    <div className="py-3 border-b border-[#E4DDD2] last:border-0">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 text-white"
            style={{ background: isBuy ? "#16A34A" : "#DC2626" }}
          >
            {trade.side}
          </span>
          <span className="text-xs font-bold" style={{ fontFamily: "var(--font-mono)" }}>
            {trade.shares} {trade.ticker} @ {fmtPrice(trade.price)}
          </span>
          <span className="text-[9px] text-[#8A8378]">{fmtDate(trade.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          {pnl !== null && (
            <span className="text-[10px] font-bold" style={{ fontFamily: "var(--font-mono)", color: pctColor(pnl) }}>
              {pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%
            </span>
          )}
          {currentPrice && (
            <span className="text-[9px] text-[#8A8378]">now {fmtPrice(currentPrice)}</span>
          )}
        </div>
      </div>

      {/* Tags */}
      {trade.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {trade.tags.map(tag => {
            const s = TAG_COLORS[tag] ?? TAG_COLORS.other;
            return (
              <span key={tag} className="text-[8px] font-bold px-1.5 py-0.5" style={{ background: s.bg, color: s.text }}>
                {tag}
              </span>
            );
          })}
        </div>
      )}

      {/* Thesis */}
      {trade.thesis ? (
        <div className="mt-1.5">
          <p className="text-[10px] text-[#3D3730] leading-relaxed italic">"{trade.thesis}"</p>
          {trade.reviewedAt && (
            <p className="text-[8px] text-[#8B5CF6] mt-0.5">
              ✓ {isEn ? "Martin reviewed" : "Martin รีวิวแล้ว"} · {fmtDate(trade.reviewedAt)}
            </p>
          )}
          <MartinReview tradeId={trade.id} locale={locale} isEn={isEn} />
        </div>
      ) : (
        <button
          onClick={() => onEditThesis(trade.id, trade.ticker, trade.side as "BUY" | "SELL", trade.shares, trade.price)}
          className="mt-1.5 text-[9px] text-[#8A8378] hover:text-[#8B5CF6] underline"
        >
          {isEn ? "+ Add thesis" : "+ เพิ่ม thesis"}
        </button>
      )}
    </div>
  );
}

// ── Position Card ─────────────────────────────────────────────────────────────

interface PositionCardProps {
  pos:          JournalPosition;
  currentPrice: number | null;
  isEn:         boolean;
  locale:       string;
  onEditThesis: (tradeId: string, ticker: string, side: "BUY" | "SELL", shares: number, price: number) => void;
}

function PositionCard({ pos, currentPrice, isEn, locale, onEditThesis }: PositionCardProps) {
  const [open, setOpen] = useState(false);
  const hasHolding      = pos.shares > 0.0001;
  const unrealizedPnl   = hasHolding && currentPrice
    ? (currentPrice - pos.avgCost) / pos.avgCost * 100
    : null;
  const thesesCount     = pos.trades.filter(t => t.thesis).length;

  return (
    <div style={{ background: "#FDFAF4", border: "1px solid #C8BFB0" }} className="overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F3EDE0] transition-colors text-left"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold" style={{ fontFamily: "var(--font-mono)" }}>{pos.ticker}</span>
            {hasHolding && (
              <span className="text-[9px] text-[#8A8378]">
                {pos.shares.toFixed(3)} {isEn ? "shares" : "หุ้น"} @ avg {fmtPrice(pos.avgCost)}
              </span>
            )}
            {!hasHolding && <span className="text-[9px] text-[#8A8378]">{isEn ? "closed" : "ปิดแล้ว"}</span>}
            {unrealizedPnl !== null && (
              <span className="text-[10px] font-bold" style={{ color: pctColor(unrealizedPnl) }}>
                {unrealizedPnl >= 0 ? "+" : ""}{unrealizedPnl.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="text-[9px] text-[#8A8378] mt-0.5">
            {pos.trades.length} {isEn ? "trades" : "การซื้อขาย"} · {thesesCount} {isEn ? "with thesis" : "มี thesis"}
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8378" strokeWidth="2" className="flex-shrink-0">
          <path d={open ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-3 border-t border-[#E4DDD2]">
          {pos.trades.map(trade => (
            <TradeRow
              key={trade.id}
              trade={trade}
              currentPrice={currentPrice}
              isEn={isEn}
              locale={locale}
              onEditThesis={onEditThesis}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const { lang }   = useI18n();
  const { user }   = useUser();
  const isEn  = lang === "en";
  const locale = lang;

  const [journal,      setJournal]      = useState<JournalResponse | null>(null);
  const [prices,       setPrices]       = useState<Record<string, number>>({});
  const [loading,      setLoading]      = useState(true);
  const [editThesis,   setEditThesis]   = useState<{ tradeId: string; ticker: string; side: "BUY" | "SELL"; shares: number; price: number } | null>(null);

  const fetchJournal = useCallback(async () => {
    try {
      const res = await fetch("/api/journal");
      if (!res.ok) return;
      const data = await res.json() as JournalResponse;
      setJournal(data);

      // Fetch current prices for open positions
      const tickers = data.positions.filter(p => p.shares > 0.001).map(p => p.ticker);
      if (tickers.length === 0) return;
      const priceMap: Record<string, number> = {};
      await Promise.allSettled(
        tickers.map(t =>
          fetch(`/api/stock/quote?ticker=${encodeURIComponent(t)}`)
            .then(r => r.ok ? r.json() : null)
            .then((d: { c?: number } | null) => { if (d?.c) priceMap[t] = d.c; })
        )
      );
      setPrices(priceMap);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchJournal(); }, [fetchJournal]);

  function handleEditThesis(tradeId: string, ticker: string, side: "BUY" | "SELL", shares: number, price: number) {
    setEditThesis({ tradeId, ticker, side, shares, price });
  }

  function handleThesisClose() {
    setEditThesis(null);
    void fetchJournal();
  }

  const totalTrades  = journal?.trades.length ?? 0;
  const withThesis   = journal?.trades.filter(t => t.thesis).length ?? 0;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-[#1A1A1A]">
              {isEn ? "Trade Journal" : "สมุดบันทึกการเทรด"}
            </h1>
            <p className="text-xs text-[#8A8378] mt-0.5">
              {isEn
                ? "Your private thesis log. Martin reviews what played out vs what you expected."
                : "บันทึก thesis ส่วนตัว Martin รีวิวว่าเกิดอะไรขึ้นจริงเทียบกับที่คาดไว้"}
            </p>
          </div>
          <a
            href="/api/journal/export"
            download
            className="text-[10px] font-bold px-3 py-1.5 border border-[#C8BFB0] text-[#8A8378] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors"
          >
            {isEn ? "Export CSV ↓" : "ส่งออก CSV ↓"}
          </a>
        </div>

        {/* Stats bar */}
        {journal && (
          <div className="flex gap-3 flex-wrap">
            {[
              { labelEn: "Trades",       labelTh: "การซื้อขาย",  v: totalTrades },
              { labelEn: "With thesis",  labelTh: "มี thesis",   v: withThesis },
              { labelEn: "Positions",    labelTh: "Positions",    v: journal.positions.length },
              { labelEn: "Open",         labelTh: "ถือไว้",       v: journal.positions.filter(p => p.shares > 0.001).length },
            ].map(({ labelEn, labelTh, v }) => (
              <div key={labelEn} style={{ background: "#FDFAF4", border: "1px solid #C8BFB0" }} className="px-3 py-2 flex flex-col items-center gap-0.5">
                <span className="text-lg font-bold" style={{ fontFamily: "var(--font-mono)" }}>{v}</span>
                <span className="text-[9px] text-[#8A8378] uppercase tracking-wide">{isEn ? labelEn : labelTh}</span>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-[#F3EDE0] animate-pulse" />
            ))}
          </div>
        )}

        {/* No trades state */}
        {!loading && journal && journal.trades.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 border border-dashed border-[#C8BFB0] bg-[#FDFAF4]">
            <p className="text-xs text-[#8A8378] text-center">
              {isEn
                ? "No trades yet. Place a paper trade and record your thesis to start your journal."
                : "ยังไม่มีการซื้อขาย เริ่มเทรดจำลองและบันทึก thesis เพื่อเริ่มสมุดบันทึก"}
            </p>
            <Link href="/radar" className="text-[10px] font-bold px-4 py-2 bg-[#8B5CF6] text-white hover:bg-[#7C3AED] transition-colors">
              {isEn ? "Open the Radar →" : "เปิด Radar →"}
            </Link>
          </div>
        )}

        {/* Positions */}
        {!loading && journal && journal.positions.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378]">
              {isEn ? "Positions & Trades" : "Positions และการซื้อขาย"}
            </p>
            {journal.positions.map(pos => (
              <PositionCard
                key={pos.ticker}
                pos={pos}
                currentPrice={prices[pos.ticker] ?? null}
                isEn={isEn}
                locale={locale}
                onEditThesis={handleEditThesis}
              />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ borderLeft: "4px solid #C8BFB0", background: "#F8F5EF" }} className="px-4 py-2">
          <p className="text-[9px] text-[#8A8378]">
            {isEn
              ? "Martin's reviews are observational and educational — never buy/sell advice. P&L shown is on paper trades only. Verify all data independently."
              : "การรีวิวของ Martin เพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำซื้อขาย P&L คือการเทรดจำลองเท่านั้น"}
          </p>
        </div>

      </div>

      {editThesis && (
        <ThesisCapture
          tradeId={editThesis.tradeId}
          ticker={editThesis.ticker}
          side={editThesis.side}
          shares={editThesis.shares}
          price={editThesis.price}
          onClose={handleThesisClose}
        />
      )}
    </AppShell>
  );
}
