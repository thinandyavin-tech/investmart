"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

interface IndexData {
  symbol:   string;
  name:     string;
  price:    number;
  change:   number;
  sparkline: number[];
}

interface Mover {
  ticker: string;
  price:  number;
  change: number;
}

interface MoversData {
  gainers: Mover[];
  losers:  Mover[];
}

function MiniSparkline({ prices, up }: { prices: number[]; up: boolean }) {
  if (prices.length < 2) return null;
  const W = 56, H = 20;
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const pts = prices
    .map((p, i) => `${(i / (prices.length - 1)) * W},${H - ((p - min) / range) * (H - 2) - 1}`)
    .join(" ");
  return (
    <svg width={W} height={H} aria-hidden="true" className="flex-shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={up ? "#16A34A" : "#DC2626"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}

function IndexRow({ idx }: { idx: IndexData }) {
  const up   = idx.change >= 0;
  const clr  = up ? "#16A34A" : "#DC2626";
  const sign = up ? "+" : "";
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-[#1F1A14] leading-none truncate">{idx.name}</p>
        <p className="text-[10px] text-[#8A8378] mt-0.5">{idx.symbol}</p>
      </div>
      <MiniSparkline prices={idx.sparkline} up={up} />
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-bold font-mono text-[#1F1A14]">{idx.price.toFixed(2)}</p>
        <p className="text-[10px] font-bold font-mono" style={{ color: clr }}>
          {sign}{idx.change.toFixed(2)}%
        </p>
      </div>
    </div>
  );
}

function MoverRow({ m, up }: { m: Mover; up: boolean }) {
  const clr  = up ? "#16A34A" : "#DC2626";
  const sign = up ? "+" : "";
  return (
    <Link
      href={`/stock/${m.ticker}`}
      className="flex items-center justify-between py-1 hover:bg-white/60 rounded px-1 transition-colors"
    >
      <span className="text-xs font-bold font-mono text-violet-600">{m.ticker}</span>
      <span className="text-xs font-bold font-mono" style={{ color: clr }}>
        {sign}{m.change.toFixed(2)}%
      </span>
    </Link>
  );
}

function SkeletonRows({ n }: { n: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 animate-pulse">
          <div className="flex-1 h-3 skeleton rounded" />
          <div className="h-3 w-14 skeleton rounded" />
        </div>
      ))}
    </div>
  );
}

export function MarketsRail() {
  const [indices, setIndices]   = useState<IndexData[]>([]);
  const [movers,  setMovers]    = useState<MoversData | null>(null);
  const [idxLoad, setIdxLoad]   = useState(true);
  const [movLoad, setMovLoad]   = useState(true);
  const [idxErr,  setIdxErr]    = useState(false);
  const [movErr,  setMovErr]    = useState(false);

  useEffect(() => {
    fetch("/api/market/indices")
      .then(r => r.json())
      .then((d: { indices?: IndexData[] }) => setIndices(d.indices ?? []))
      .catch(() => setIdxErr(true))
      .finally(() => setIdxLoad(false));

    fetch("/api/market/movers")
      .then(r => r.json())
      .then((d: MoversData) => setMovers(d))
      .catch(() => setMovErr(true))
      .finally(() => setMovLoad(false));
  }, []);

  return (
    <aside className="flex flex-col gap-4">
      {/* Markets at a glance */}
      <section className="bg-[#FDFAF4]/90 border border-[#E0D9CC] shadow-card overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-[#E0D9CC] flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#1F1A14]">ตลาดวันนี้</h2>
          <Link href="/market" className="text-xs font-bold text-[#5B8A2A] hover:underline">
            ดูเพิ่ม →
          </Link>
        </div>
        <div className="px-4 py-2 divide-y divide-[#E8E2D4]">
          {idxLoad ? (
            <SkeletonRows n={3} />
          ) : idxErr || indices.length === 0 ? (
            <p className="text-xs text-[#8A8378] py-3 text-center">โหลดข้อมูลไม่ได้</p>
          ) : (
            indices.map(idx => <IndexRow key={idx.symbol} idx={idx} />)
          )}
        </div>
        <div className="px-4 pb-3 pt-1">
          <p className="text-[10px] text-[#8A8378]">
            ราคาจาก Finnhub · อาจล่าช้า 15 นาที · ไม่รวมชั่วโมงนอกตลาด
          </p>
        </div>
      </section>

      {/* Top movers */}
      <section className="bg-[#FDFAF4]/90 border border-[#E0D9CC] shadow-card overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-[#E0D9CC]">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#1F1A14]">ผู้นำวันนี้</h2>
        </div>
        <div className="px-3 py-2">
          {movLoad ? (
            <SkeletonRows n={4} />
          ) : movErr || !movers ? (
            <p className="text-xs text-[#8A8378] py-2 text-center">โหลดข้อมูลไม่ได้</p>
          ) : (
            <>
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-1 px-1">
                ขึ้นมาก
              </p>
              {movers.gainers.slice(0, 3).map(m => (
                <MoverRow key={m.ticker} m={m} up />
              ))}
              <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mt-2 mb-1 px-1">
                ลงมาก
              </p>
              {movers.losers.slice(0, 3).map(m => (
                <MoverRow key={m.ticker} m={m} up={false} />
              ))}
            </>
          )}
        </div>
      </section>

      {/* Curated screens */}
      <section className="bg-[#FDFAF4]/90 border border-[#E0D9CC] shadow-card overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-[#E0D9CC]">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#1F1A14]">สกรีนอัลกอริทึม</h2>
          <p className="text-[10px] text-[#8A8378] mt-0.5">สัญญาณจากข้อมูลจริง · ไม่ใช่คำแนะนำลงทุน</p>
        </div>
        <div className="p-3 space-y-2">
          <Link
            href="/radar"
            className="flex items-center justify-between w-full rounded-xl bg-violet-50/60 border border-violet-100 px-3 py-2.5 hover:bg-violet-100/60 transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-violet-800">Strong Momentum</p>
              <p className="text-[10px] text-violet-500">Radar · ADX &gt; 25, +DI &gt; -DI</p>
            </div>
            <span className="text-violet-400">→</span>
          </Link>
          <Link
            href="/screener"
            className="flex items-center justify-between w-full rounded-xl bg-emerald-50/60 border border-emerald-100 px-3 py-2.5 hover:bg-emerald-100/60 transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-emerald-800">Low Expectations</p>
              <p className="text-[10px] text-emerald-600">Screener · Reverse-DCF ราคาต่ำกว่าคาด</p>
            </div>
            <span className="text-emerald-400">→</span>
          </Link>
          <Link
            href="/market"
            className="flex items-center justify-between w-full rounded-xl bg-[#F8F5EF] border border-[#E0D9CC] px-3 py-2.5 hover:bg-[#F0EBE1] transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-[#1F1A14]">Top Movers Today</p>
              <p className="text-[10px] text-[#8A8378]">ตลาด · volume surge + % move</p>
            </div>
            <span className="text-[#8A8378]">→</span>
          </Link>
        </div>
      </section>

      {/* Economic calendar quick link */}
      <Link
        href="/calendar"
        className="bg-[#FDFAF4]/90 border border-[#E0D9CC] shadow-card p-3.5 flex items-center gap-3 hover:bg-[#F8F5EF] transition-colors"
      >
        <span className="text-xl flex-shrink-0" aria-hidden="true">📅</span>
        <div>
          <p className="text-xs font-bold text-[#1F1A14]">ปฏิทินเศรษฐกิจ</p>
          <p className="text-[10px] text-[#8A8378]">CPI · Fed · NFP · GDP · PMI</p>
        </div>
      </Link>

      {/* Martin CTA */}
      <Link
        href="/analyze"
        className="bg-gradient-to-br from-violet-50 to-violet-100/60 border border-violet-200 shadow-card p-4 flex items-center gap-3 hover:from-violet-100 hover:to-violet-200/60 transition-colors"
      >
        <span className="text-2xl text-violet-500 flex-shrink-0" aria-hidden="true">✦</span>
        <div>
          <p className="text-xs font-bold text-violet-800">Martin Chart Analysis</p>
          <p className="text-[10px] text-violet-600 leading-snug">วิเคราะห์กราฟ RSI·ATR·ADX·Fib · Scenario Playbook</p>
        </div>
      </Link>
    </aside>
  );
}
