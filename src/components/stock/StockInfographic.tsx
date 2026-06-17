"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import type { InfographicData } from "@/app/api/stock/infographic/route";

// ── Design tokens (match the Satori PNG template exactly) ────────────────────
const ACCENT = "#8B5CF6";
const INK    = "#1A1A1A";
const MUTED  = "#6B6B6B";
const CREAM  = "#fefae0";
const CREAM2 = "#faedcd";
const BORDER = "#e9edc9";
const GAIN   = "#1F9D55";
const LOSS   = "#D64545";

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ prices, up }: { prices: number[]; up: boolean }) {
  if (prices.length < 2) return null;
  const W = 120, H = 44;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const rng = max - min || 1;
  const pts = prices.map((p, i) =>
    `${(i / (prices.length - 1)) * W},${H - ((p - min) / rng) * (H - 4) + 2}`
  ).join(" ");
  return (
    <svg width={W} height={H} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={up ? GAIN : LOSS}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

// ── Thesis with accent keywords ───────────────────────────────────────────────

function ThesisText({ text }: { text: string }) {
  const parts = text.split(/\*\*([^*]+)\*\*/);
  return (
    <span className="text-sm leading-relaxed" style={{ color: INK }}>
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
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>{label}</span>
      <span className="text-sm font-bold" style={{ fontFamily: "var(--font-mono)", color: INK, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface StockInfographicProps {
  ticker:   string;
  onClose?: () => void;
}

export function StockInfographic({ ticker, onClose }: StockInfographicProps) {
  const { lang } = useI18n();
  const [data,    setData]    = useState<InfographicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/stock/infographic?ticker=${encodeURIComponent(ticker)}&locale=${lang}`)
      .then(r => { if (!r.ok) throw new Error("โหลดไม่สำเร็จ"); return r.json(); })
      .then((d: InfographicData) => setData(d))
      .catch(e => setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด"))
      .finally(() => setLoading(false));
  }, [ticker, lang]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="w-full max-w-md animate-pulse" style={{ background: CREAM, border: `1px solid ${BORDER}` }}>
        <div className="p-5 flex flex-col gap-3">
          <div className="h-3 w-32 rounded" style={{ background: BORDER }} />
          <div className="h-1 rounded" style={{ background: ACCENT, opacity: 0.4 }} />
          <div className="h-8 w-40 rounded" style={{ background: BORDER }} />
          <div className="grid grid-cols-3 gap-3">
            {[0,1,2,3,4,5].map(i => <div key={i} className="h-10 rounded" style={{ background: BORDER }} />)}
          </div>
          <div className="h-12 rounded" style={{ background: BORDER }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full max-w-md p-4 flex flex-col gap-2" style={{ background: CREAM, border: `1px solid ${BORDER}` }}>
        <p className="text-sm font-bold" style={{ color: LOSS }}>{error ?? "ไม่พบข้อมูล"}</p>
        <button onClick={load} className="text-xs font-bold underline text-left" style={{ color: ACCENT }}>ลองอีกครั้ง</button>
      </div>
    );
  }

  const { narrative } = data;
  const up   = !data.priceUnavailable && !data.noChangeData && data.change1D >= 0;
  const clr  = data.priceUnavailable ? MUTED
             : data.noChangeData      ? "#D97706"
             : up                     ? GAIN : LOSS;
  const sign = data.change1D >= 0 ? "+" : "";
  const freshness = data.source === "yahoo" ? "delayed ~15m" : "live";

  const ogUrl = `/api/stock/infographic/og?ticker=${encodeURIComponent(ticker)}&locale=${lang}`;

  return (
    <div className="w-full max-w-md">
      {/* Controls */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>
          InvestMart Infographic
        </span>
        <div className="flex gap-3 items-center">
          <a
            href={ogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold underline"
            style={{ color: ACCENT }}
            aria-label="เปิด PNG แบบเต็ม"
          >
            📥 PNG
          </a>
          {onClose && (
            <button onClick={onClose} className="text-[11px] font-bold" style={{ color: MUTED }} aria-label="ปิด">✕</button>
          )}
        </div>
      </div>

      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div style={{ background: CREAM, border: `1px solid ${BORDER}`, fontFamily: 'var(--font-noto-thai), var(--font-inter), sans-serif' }}>
        <div className="p-5 flex flex-col gap-4">

          {/* Eyebrow */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>
              {narrative.eyebrow}
            </span>
            <span className="text-[10px] font-bold" style={{ color: ACCENT }}>
              INVESTMART ✦ Martin
            </span>
          </div>

          {/* Accent rule */}
          <div className="h-0.5 w-full" style={{ background: ACCENT }} />

          {/* Company + price */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="text-2xl font-bold leading-tight" style={{ fontFamily: "var(--font-mono)", color: INK }}>{data.ticker}</span>
              <span className="text-xs truncate" style={{ color: MUTED }}>{data.companyName}</span>
              <span className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: MUTED }}>
                {data.sector} · {data.exchange}
              </span>
            </div>

            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {data.priceUnavailable ? (
                <span className="text-xs" style={{ color: MUTED }}>Price unavailable</span>
              ) : (
                <>
                  <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-mono)", color: INK, fontVariantNumeric: "tabular-nums" }}>
                    ${data.price.toFixed(2)}
                  </span>
                  {data.noChangeData ? (
                    <span className="text-xs font-semibold" style={{ color: "#D97706" }}>New listing</span>
                  ) : (
                    <span className="text-sm font-bold" style={{ color: clr, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                      {up ? "▲" : "▼"} {sign}{data.change1D.toFixed(2)}%
                    </span>
                  )}
                  <Sparkline prices={data.sparkline} up={up} />
                  <span className="text-[10px]" style={{ color: MUTED }}>3-month</span>
                </>
              )}
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-3 gap-2 p-3" style={{ background: CREAM2, border: `1px solid ${BORDER}` }}>
            <StatCell label="Mkt Cap"  value={data.marketCap} />
            <StatCell label="P/E TTM"  value={data.pe} />
            <StatCell label="PEG"      value={data.peg} />
            <StatCell label="52W High" value={data.week52High ? `$${data.week52High.toFixed(0)}` : "N/A"} />
            <StatCell label="52W Low"  value={data.week52Low  ? `$${data.week52Low.toFixed(0)}`  : "N/A"} />
            <StatCell label="RSI-14"   value={data.rsi !== null ? String(data.rsi) : "N/A"} />
          </div>

          {/* Divider */}
          <div className="h-px w-full" style={{ background: BORDER }} />

          {/* Thesis */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
              ✦ Martin's Observation
            </span>
            <ThesisText text={narrative.thesis} />
          </div>

          {/* Highlights */}
          {narrative.highlights.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {narrative.highlights.map((h, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: ACCENT }}>▸</span>
                  <span className="text-xs leading-relaxed" style={{ color: INK }}>{h}</span>
                </li>
              ))}
            </ul>
          )}

          {/* What to watch */}
          {narrative.watch && (
            <div className="flex gap-2 items-start p-2.5" style={{ background: "#EDE8F8", borderLeft: `3px solid ${ACCENT}` }}>
              <span className="text-[10px] font-bold uppercase tracking-wider flex-shrink-0 pt-0.5" style={{ color: ACCENT }}>Watch</span>
              <span className="text-xs leading-relaxed" style={{ color: INK }}>{narrative.watch}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col gap-0.5 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            <p className="text-[10px]" style={{ color: MUTED }}>
              Data: Finnhub ({freshness}) ·{" "}
              {new Date(data.generatedAt).toLocaleTimeString(lang === "th" ? "th-TH" : "en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" })} ET
            </p>
            <p className="text-[10px]" style={{ color: MUTED }}>
              {lang === "th"
                ? "เพื่อการศึกษาเท่านั้น · ไม่ใช่คำแนะนำการลงทุน · InvestMart"
                : "For learning only · not investment advice · InvestMart"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
