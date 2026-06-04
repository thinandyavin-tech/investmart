"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import type { CompareRow } from "@/lib/compareTypes";
import { METRICS, MobileCard } from "@/components/compare/compareMetrics";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;
const MAX       = 3;

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td className="sticky left-0 px-3 py-2.5 border-b border-[#E8E2D4] bg-[#FBF7ED]" />
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-2.5 border-b border-[#E8E2D4]">
          <div className="h-3 w-16 bg-[#E8E2D4] animate-pulse rounded" />
        </td>
      ))}
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CompareClientProps {
  initialTickers: string;
}

export function CompareClient({ initialTickers }: CompareClientProps) {
  const router = useRouter();

  const [tickers, setTickers] = useState<string[]>(() =>
    initialTickers
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter((t) => TICKER_RE.test(t))
      .slice(0, MAX)
  );
  const [rows,    setRows]    = useState<CompareRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [input,   setInput]   = useState("");

  const load = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) { setRows([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stock/compare?tickers=${symbols.join(",")}`);
      if (!res.ok) throw new Error("ดึงข้อมูลไม่สำเร็จ");
      const data = (await res.json()) as { rows: CompareRow[] };
      setRows(data.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tickers);
    const q = tickers.length > 0 ? `?tickers=${tickers.join(",")}` : "";
    router.replace(`/compare${q}`, { scroll: false });
  }, [tickers, load, router]);

  function addTicker() {
    const t = input.trim().toUpperCase();
    if (!TICKER_RE.test(t) || tickers.includes(t) || tickers.length >= MAX) return;
    setTickers((prev) => [...prev, t]);
    setInput("");
  }

  const canAdd = TICKER_RE.test(input.trim()) && !tickers.includes(input.trim().toUpperCase()) && tickers.length < MAX;

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 pb-24">
      <Link href="/" className="text-[10px] text-[#8A8378] hover:text-[#1F1A14] transition-colors mb-4 block">
        ← กลับหน้าหลัก
      </Link>
      <h1 className="text-xs font-bold uppercase tracking-widest text-[#1F1A14] mb-4">เทียบหุ้น</h1>

      {/* Ticker input */}
      <div className="flex gap-2 mb-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTicker(); } }}
          placeholder={tickers.length >= MAX ? `สูงสุด ${MAX} ตัว` : "เพิ่ม ticker เช่น AAPL"}
          disabled={tickers.length >= MAX}
          maxLength={10}
          className="border border-[#1F1A14] bg-[#FBF7ED] px-3 py-2 text-xs w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-[#8B5CF6] disabled:opacity-40"
          aria-label="ใส่ ticker เพื่อเปรียบเทียบ"
        />
        <button
          onClick={addTicker}
          disabled={!canAdd}
          className="px-4 py-2 text-xs font-bold text-white bg-[#1F1A14] disabled:opacity-40 flex-shrink-0"
          style={{ boxShadow: canAdd ? "2px 2px 0 #8B5CF6" : "none" }}
        >
          เพิ่ม
        </button>
      </div>

      {/* Ticker chips */}
      {tickers.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          {tickers.map((t) => (
            <span key={t} className="flex items-center gap-1.5 px-3 py-1 bg-[#1F1A14] text-white text-[11px] font-bold">
              <Link href={`/stock/${t}`} className="hover:underline font-mono">{t}</Link>
              <button
                onClick={() => setTickers((prev) => prev.filter((x) => x !== t))}
                className="text-[#8B5CF6] hover:text-white"
                aria-label={`ลบ ${t} ออกจากการเปรียบเทียบ`}
              >
                ×
              </button>
            </span>
          ))}
          {tickers.length > 1 && (
            <button
              onClick={() => setTickers([])}
              className="text-[10px] text-[#8A8378] hover:text-[#1F1A14] transition-colors px-2 py-1 border border-[#E8E2D4]"
            >
              ล้างทั้งหมด
            </button>
          )}
        </div>
      )}

      {error && <p className="text-[10px] text-red-500 mb-4">{error}</p>}

      {tickers.length === 0 && !loading && (
        <p className="text-xs text-[#8A8378] mt-12 text-center leading-relaxed">
          เพิ่มหุ้นอย่างน้อย 1 ตัวเพื่อเริ่มเปรียบเทียบ<br />
          <span className="text-[10px]">รองรับสูงสุด {MAX} ตัวพร้อมกัน</span>
        </p>
      )}

      {tickers.length > 0 && (
        <>
          {/* Desktop: sticky-column table */}
          <div
            className="hidden sm:block overflow-x-auto border border-[#1F1A14]"
            style={{ boxShadow: "3px 3px 0 #1F1A14" }}
          >
            <table
              className="w-full text-left border-collapse"
              style={{ minWidth: `${160 + tickers.length * 180}px` }}
            >
              <thead>
                <tr style={{ background: "#1F1A14" }}>
                  <th
                    className="sticky left-0 px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-[#C8C0B0]"
                    style={{ background: "#1F1A14", minWidth: 160 }}
                  >
                    ตัวชี้วัด
                  </th>
                  {(loading ? tickers : rows.map((r) => r.ticker)).map((t) => {
                    const name = rows.find((r) => r.ticker === t)?.name;
                    return (
                      <th key={t} className="px-4 py-3 text-[11px] font-bold text-white" style={{ minWidth: 180 }}>
                        <Link href={`/stock/${t}`} className="font-mono hover:underline">{t}</Link>
                        {name && (
                          <div className="text-[9px] font-normal text-[#8A8378] truncate max-w-[160px] mt-0.5">
                            {name}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: METRICS.length }).map((_, i) => (
                      <LoadingRow key={i} cols={tickers.length} />
                    ))
                  : METRICS.map((m, mi) => {
                      const bg = mi % 2 === 0 ? "#FBF7ED" : "#F3EDE0";
                      return (
                        <tr key={m.id} style={{ background: bg }}>
                          <td
                            className="sticky left-0 px-3 py-2.5 border-b border-[#E8E2D4]"
                            style={{ background: bg }}
                          >
                            <div className="text-[10px] font-semibold text-[#1F1A14]">{m.label}</div>
                            {m.sublabel && <div className="text-[9px] text-[#8A8378]">{m.sublabel}</div>}
                          </td>
                          {rows.map((row) => (
                            <td key={row.ticker} className="px-4 py-2.5 border-b border-[#E8E2D4]">
                              {m.cell(row)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <div className="sm:hidden space-y-4">
            {loading
              ? tickers.map((t) => (
                  <div key={t} className="border border-[#E8E2D4] p-4 bg-[#F3EDE0] animate-pulse">
                    <div className="h-4 w-16 bg-[#E8E2D4] rounded mb-3" />
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex justify-between mb-2">
                        <div className="h-3 w-24 bg-[#E8E2D4] rounded" />
                        <div className="h-3 w-16 bg-[#E8E2D4] rounded" />
                      </div>
                    ))}
                  </div>
                ))
              : rows.map((row) => <MobileCard key={row.ticker} row={row} metrics={METRICS} />)
            }
          </div>
        </>
      )}

      <p className="text-[8px] text-[#8A8378] mt-6 text-center">
        ข้อมูลจาก Finnhub · แคชทุก 5 นาที · ไม่ใช่คำแนะนำการลงทุน
      </p>
    </div>
  );
}
