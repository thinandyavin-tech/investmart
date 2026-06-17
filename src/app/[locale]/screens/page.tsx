"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DividendRow {
  ticker:            string;
  name:              string;
  price:             number;
  change1D:          number;
  dividendYield:     number | null;
  dividendPerShare:  number | null;
  pe:                number | null;
  beta:              number | null;
}

interface GrowthRow {
  ticker:          string;
  name:            string;
  price:           number;
  change1D:        number;
  revenueGrowth3Y: number | null;
  epsGrowth3Y:     number | null;
  epsGrowth5Y:     number | null;
  pe:              number | null;
  beta:            number | null;
}

interface ScreenResponse<R> {
  rows:     R[];
  page:     number;
  total:    number;
  pageSize: number;
  building?: boolean;
  stale?:   boolean;
}

type ScreenType = "dividend" | "growth" | "movers";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number | null, suffix = ""): string {
  if (v === null || v === undefined) return "N/A";
  return `${v >= 0 ? "" : ""}${v.toFixed(2)}${suffix}`;
}

function fmtChange(v: number) {
  const s = v >= 0 ? "+" : "";
  return `${s}${v.toFixed(2)}%`;
}

function ChangeCell({ v }: { v: number }) {
  return (
    <span className="font-bold" style={{ color: v >= 0 ? "#1F9D55" : "#D64545", fontFamily: "var(--font-mono)" }}>
      {fmtChange(v)}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-9 bg-[#E8E2D4] rounded" style={{ opacity: 1 - i * 0.1 }} />
      ))}
    </div>
  );
}

// ── Dividend screen ───────────────────────────────────────────────────────────

function DividendScreen({ lang }: { lang: "en"|"th" }) {
  const [rows,     setRows]     = useState<DividendRow[]>([]);
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [sort,     setSort]     = useState("yield_desc");
  const [building, setBuilding] = useState(false);

  const load = useCallback(async (p: number, s: string) => {
    setLoading(true); setError(null); setBuilding(false);
    try {
      const res = await fetch(`/api/screens/dividend?page=${p}&sort=${s}`);
      if (!res.ok) throw new Error("Load failed");
      const data = await res.json() as ScreenResponse<DividendRow>;
      if (data.building) { setBuilding(true); setLoading(false); return; }
      setRows(data.rows);
      setTotal(data.total);
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(1, sort); }, [sort, load]);

  const isEn = lang === "en";
  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col gap-3">
      {/* Sort */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378]">
          {isEn ? "Sort" : "เรียง"}:
        </span>
        {[
          { v: "yield_desc", l: isEn ? "Yield ↓" : "ปันผล ↓" },
          { v: "yield_asc",  l: isEn ? "Yield ↑" : "ปันผล ↑" },
          { v: "ticker_asc", l: isEn ? "A–Z" : "ก-ฮ" },
        ].map(({ v, l }) => (
          <button key={v} onClick={() => setSort(v)}
            className="text-xs font-bold px-2 py-0.5 border transition-colors"
            style={{ background: sort === v ? "#1A1A1A" : "#FDFAF4", color: sort === v ? "#fff" : "#1A1A1A", borderColor: "#C8BFB0" }}>
            {l}
          </button>
        ))}
      </div>

      {loading && <Skeleton />}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 flex items-center justify-between gap-3">
          <p className="text-xs text-red-700">{error}</p>
          <button onClick={() => void load(1, sort)} className="text-xs font-bold text-red-700 hover:underline flex-shrink-0">
            {isEn ? "Retry" : "ลองใหม่"}
          </button>
        </div>
      )}
      {building && !loading && (
        <div className="px-4 py-6 bg-[#FFFBEB] border border-[#D97706] text-center">
          <p className="text-xs font-bold text-[#D97706]">
            {isEn ? "⏳ Building index…" : "⏳ กำลังสร้างดัชนี…"}
          </p>
          <p className="text-[10px] text-[#8A8378] mt-1">
            {isEn
              ? "The daily screen data is being computed. Check back in a few minutes."
              : "กำลังคำนวณข้อมูลหน้าจอรายวัน กรุณากลับมาในไม่กี่นาที"}
          </p>
        </div>
      )}

      {!loading && !error && !building && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #1A1A1A" }} className="text-[10px] font-bold uppercase tracking-wide text-[#8A8378] bg-[#F3EDE0]">
                  <th className="px-2 py-2 text-left">{isEn ? "Ticker" : "รหัส"}</th>
                  <th className="px-2 py-2 text-left">{isEn ? "Company" : "บริษัท"}</th>
                  <th className="px-2 py-2 text-right">{isEn ? "Price" : "ราคา"}</th>
                  <th className="px-2 py-2 text-right">1D %</th>
                  <th className="px-2 py-2 text-right">{isEn ? "Yield" : "ปันผล"}</th>
                  <th className="px-2 py-2 text-right">Div/Share</th>
                  <th className="px-2 py-2 text-right">P/E</th>
                  <th className="px-2 py-2 text-right">Beta</th>
                  <th className="px-2 py-2 text-right">Martin</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.ticker} style={{ background: i % 2 ? "#FDFAF4" : "#F8F5EF", borderBottom: "1px solid #E4DDD2" }}>
                    <td className="px-2 py-2">
                      <Link href={`/stock/${r.ticker}`} className="font-bold text-[#8B5CF6] hover:underline" style={{ fontFamily: "var(--font-mono)" }}>
                        {r.ticker}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-[#6B6B6B] truncate max-w-[120px]">{r.name}</td>
                    <td className="px-2 py-2 text-right font-bold" style={{ fontFamily: "var(--font-mono)" }}>${r.price.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right"><ChangeCell v={r.change1D} /></td>
                    <td className="px-2 py-2 text-right font-bold" style={{ color: r.dividendYield ? "#1F9D55" : "#8A8378" }}>
                      {r.dividendYield !== null ? `${r.dividendYield.toFixed(2)}%` : "N/A"}
                    </td>
                    <td className="px-2 py-2 text-right text-[#6B6B6B]">
                      {r.dividendPerShare !== null ? `$${r.dividendPerShare.toFixed(2)}` : "N/A"}
                    </td>
                    <td className="px-2 py-2 text-right text-[#6B6B6B]" style={{ fontFamily: "var(--font-mono)" }}>
                      {r.pe !== null ? `${r.pe.toFixed(1)}×` : "N/A"}
                    </td>
                    <td className="px-2 py-2 text-right text-[#6B6B6B]" style={{ fontFamily: "var(--font-mono)" }}>
                      {r.beta !== null ? r.beta.toFixed(2) : "N/A"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Link href={`/hunter?ticker=${r.ticker}`} className="text-[10px] text-[#8B5CF6] hover:underline">✦</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8A8378]">{isEn ? `Page ${page} of ${totalPages} · ${total} stocks` : `หน้า ${page} จาก ${totalPages} · ${total} หุ้น`}</span>
            <div className="flex gap-1">
              <button onClick={() => void load(page - 1, sort)} disabled={page <= 1 || loading}
                className="text-xs font-bold px-2 py-1 border border-[#C8BFB0] disabled:opacity-40 hover:border-[#1A1A1A]">
                ←
              </button>
              <button onClick={() => void load(page + 1, sort)} disabled={page >= totalPages || loading}
                className="text-xs font-bold px-2 py-1 border border-[#C8BFB0] disabled:opacity-40 hover:border-[#1A1A1A]">
                →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Growth screen ─────────────────────────────────────────────────────────────

function GrowthScreen({ lang }: { lang: "en"|"th" }) {
  const [rows,     setRows]     = useState<GrowthRow[]>([]);
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [sort,     setSort]     = useState("eps3y_desc");
  const [building, setBuilding] = useState(false);

  const load = useCallback(async (p: number, s: string) => {
    setLoading(true); setError(null); setBuilding(false);
    try {
      const res = await fetch(`/api/screens/growth?page=${p}&sort=${s}`);
      if (!res.ok) throw new Error("Load failed");
      const data = await res.json() as ScreenResponse<GrowthRow>;
      if (data.building) { setBuilding(true); setLoading(false); return; }
      setRows(data.rows);
      setTotal(data.total);
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(1, sort); }, [sort, load]);

  const isEn = lang === "en";
  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378]">
          {isEn ? "Sort" : "เรียง"}:
        </span>
        {[
          { v: "eps3y_desc", l: "EPS 3Y ↓" },
          { v: "rev3y_desc", l: "Rev 3Y ↓" },
          { v: "ticker_asc", l: isEn ? "A–Z" : "ก-ฮ" },
        ].map(({ v, l }) => (
          <button key={v} onClick={() => setSort(v)}
            className="text-xs font-bold px-2 py-0.5 border transition-colors"
            style={{ background: sort === v ? "#1A1A1A" : "#FDFAF4", color: sort === v ? "#fff" : "#1A1A1A", borderColor: "#C8BFB0" }}>
            {l}
          </button>
        ))}
      </div>

      {loading && <Skeleton />}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 flex items-center justify-between gap-3">
          <p className="text-xs text-red-700">{error}</p>
          <button onClick={() => void load(1, sort)} className="text-xs font-bold text-red-700 hover:underline flex-shrink-0">
            {isEn ? "Retry" : "ลองใหม่"}
          </button>
        </div>
      )}
      {building && !loading && (
        <div className="px-4 py-6 bg-[#FFFBEB] border border-[#D97706] text-center">
          <p className="text-xs font-bold text-[#D97706]">
            {isEn ? "⏳ Building index…" : "⏳ กำลังสร้างดัชนี…"}
          </p>
          <p className="text-[10px] text-[#8A8378] mt-1">
            {isEn
              ? "The daily screen data is being computed. Check back in a few minutes."
              : "กำลังคำนวณข้อมูลหน้าจอรายวัน กรุณากลับมาในไม่กี่นาที"}
          </p>
        </div>
      )}

      {!loading && !error && !building && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #1A1A1A" }} className="text-[10px] font-bold uppercase tracking-wide text-[#8A8378] bg-[#F3EDE0]">
                  <th className="px-2 py-2 text-left">{isEn ? "Ticker" : "รหัส"}</th>
                  <th className="px-2 py-2 text-left">{isEn ? "Company" : "บริษัท"}</th>
                  <th className="px-2 py-2 text-right">{isEn ? "Price" : "ราคา"}</th>
                  <th className="px-2 py-2 text-right">1D %</th>
                  <th className="px-2 py-2 text-right">EPS 3Y</th>
                  <th className="px-2 py-2 text-right">EPS 5Y</th>
                  <th className="px-2 py-2 text-right">Rev 3Y</th>
                  <th className="px-2 py-2 text-right">P/E</th>
                  <th className="px-2 py-2 text-right">Beta</th>
                  <th className="px-2 py-2 text-right">Martin</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.ticker} style={{ background: i % 2 ? "#FDFAF4" : "#F8F5EF", borderBottom: "1px solid #E4DDD2" }}>
                    <td className="px-2 py-2">
                      <Link href={`/stock/${r.ticker}`} className="font-bold text-[#8B5CF6] hover:underline" style={{ fontFamily: "var(--font-mono)" }}>
                        {r.ticker}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-[#6B6B6B] truncate max-w-[120px]">{r.name}</td>
                    <td className="px-2 py-2 text-right font-bold" style={{ fontFamily: "var(--font-mono)" }}>${r.price.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right"><ChangeCell v={r.change1D} /></td>
                    <td className="px-2 py-2 text-right font-bold" style={{ color: (r.epsGrowth3Y ?? 0) >= 0 ? "#1F9D55" : "#D64545" }}>
                      {fmt(r.epsGrowth3Y, "%")}
                    </td>
                    <td className="px-2 py-2 text-right font-bold" style={{ color: (r.epsGrowth5Y ?? 0) >= 0 ? "#1F9D55" : "#D64545" }}>
                      {fmt(r.epsGrowth5Y, "%")}
                    </td>
                    <td className="px-2 py-2 text-right" style={{ color: (r.revenueGrowth3Y ?? 0) >= 0 ? "#1F9D55" : "#D64545" }}>
                      {fmt(r.revenueGrowth3Y, "%")}
                    </td>
                    <td className="px-2 py-2 text-right text-[#6B6B6B]" style={{ fontFamily: "var(--font-mono)" }}>
                      {r.pe !== null ? `${r.pe.toFixed(1)}×` : "N/A"}
                    </td>
                    <td className="px-2 py-2 text-right text-[#6B6B6B]" style={{ fontFamily: "var(--font-mono)" }}>
                      {r.beta !== null ? r.beta.toFixed(2) : "N/A"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Link href={`/hunter?ticker=${r.ticker}`} className="text-[10px] text-[#8B5CF6] hover:underline">✦</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8A8378]">{isEn ? `Page ${page} of ${totalPages} · ${total} stocks` : `หน้า ${page} จาก ${totalPages} · ${total} หุ้น`}</span>
            <div className="flex gap-1">
              <button onClick={() => void load(page - 1, sort)} disabled={page <= 1 || loading}
                className="text-xs font-bold px-2 py-1 border border-[#C8BFB0] disabled:opacity-40 hover:border-[#1A1A1A]">←</button>
              <button onClick={() => void load(page + 1, sort)} disabled={page >= totalPages || loading}
                className="text-xs font-bold px-2 py-1 border border-[#C8BFB0] disabled:opacity-40 hover:border-[#1A1A1A]">→</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Movers tab (reuses radar) ─────────────────────────────────────────────────

function MoversScreen({ lang }: { lang: "en"|"th" }) {
  const isEn = lang === "en";
  return (
    <div className="flex flex-col gap-4 py-4 text-center">
      <p className="text-sm text-[#1A1A1A] font-bold">
        {isEn ? "Top Gainers, Losers & Most Active" : "ขึ้นมากสุด ลงมากสุด และซื้อขายมากสุด"}
      </p>
      <p className="text-xs text-[#8A8378]">
        {isEn
          ? "Live market movers are on the Radar page — refreshed every 30 min with live Finnhub quotes."
          : "ข้อมูลตลาดสดอยู่ที่หน้า Radar — อัพเดททุก 30 นาที จาก Finnhub"}
      </p>
      <Link
        href="/radar"
        className="self-center text-xs font-bold px-6 py-3 text-white bg-[#1A1A1A] hover:bg-[#333] transition-colors"
        style={{ boxShadow: "2px 2px 0 #8B5CF6" }}
      >
        {isEn ? "📡 Go to Radar →" : "📡 ไปที่ Radar →"}
      </Link>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const SCREEN_TABS: { id: ScreenType; en: string; th: string }[] = [
  { id: "dividend", en: "💰 Dividends", th: "💰 ปันผล" },
  { id: "growth",   en: "📈 Growth",    th: "📈 เติบโต" },
  { id: "movers",   en: "⚡ Movers",    th: "⚡ ผู้เคลื่อนตลาด" },
];

export default function ScreensPage() {
  const { lang } = useI18n();
  const [screen, setScreen] = useState<ScreenType>("dividend");
  const isEn = lang === "en";

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-4">

        {/* Header */}
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest text-[#1A1A1A]">
            {isEn ? "Stock Screens" : "คัดกรองหุ้น"}
          </h1>
          <p className="text-xs text-[#8A8378] mt-0.5">
            {isEn
              ? "Real data from Finnhub · N/A where unavailable · not investment advice"
              : "ข้อมูลจริงจาก Finnhub · แสดง N/A หากไม่มีข้อมูล · ไม่ใช่คำแนะนำลงทุน"}
          </p>
        </div>

        {/* Screen selector tabs */}
        <div className="flex border border-[#C8BFB0]" style={{ boxShadow: "2px 2px 0 #1A1A1A" }}>
          {SCREEN_TABS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setScreen(t.id)}
              className="flex-1 text-xs font-bold py-2.5 transition-colors"
              style={{
                background:  screen === t.id ? "#1A1A1A" : "#FDFAF4",
                color:       screen === t.id ? "#fff"    : "#8A8378",
                borderRight: i < SCREEN_TABS.length - 1 ? "1px solid #C8BFB0" : undefined,
              }}
            >
              {isEn ? t.en : t.th}
            </button>
          ))}
        </div>

        {/* Screen content */}
        {screen === "dividend" && <DividendScreen lang={lang} />}
        {screen === "growth"   && <GrowthScreen   lang={lang} />}
        {screen === "movers"   && <MoversScreen   lang={lang} />}

        {/* Hunter CTA */}
        <div style={{ background: "#F5F3FF", border: "1px solid #8B5CF6" }} className="px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[#8B5CF6]">✦ {isEn ? "Deep analysis on any stock" : "วิเคราะห์เชิงลึกทุกหุ้น"}</p>
            <p className="text-[10px] text-[#8A8378]">{isEn ? "SWOT + Risk from Martin" : "SWOT + ความเสี่ยงจาก Martin"}</p>
          </div>
          <Link href="/hunter" className="text-xs font-bold text-[#8B5CF6] border border-[#8B5CF6] px-3 py-1.5 hover:bg-[#8B5CF6] hover:text-white transition-colors">
            {isEn ? "Hunter →" : "Hunter →"}
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
