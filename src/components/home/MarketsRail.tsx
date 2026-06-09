"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
        <p className="text-xs font-bold text-slate-800 leading-none truncate">{idx.name}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{idx.symbol}</p>
      </div>
      <MiniSparkline prices={idx.sparkline} up={up} />
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-bold font-mono text-slate-900">{idx.price.toFixed(2)}</p>
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
          <div className="flex-1 h-3 bg-slate-200/60 rounded" />
          <div className="h-3 w-14 bg-slate-200/40 rounded" />
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

  useEffect(() => {
    fetch("/api/market/indices")
      .then(r => r.json())
      .then((d: { indices?: IndexData[] }) => setIndices(d.indices ?? []))
      .catch(() => {})
      .finally(() => setIdxLoad(false));

    fetch("/api/market/movers")
      .then(r => r.json())
      .then((d: MoversData) => setMovers(d))
      .catch(() => {})
      .finally(() => setMovLoad(false));
  }, []);

  return (
    <aside className="flex flex-col gap-4">
      {/* Markets at a glance */}
      <section className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700">ตลาดวันนี้</h2>
          <Link href="/market" className="text-xs font-semibold text-violet-600 hover:text-violet-800">
            ดูเพิ่ม →
          </Link>
        </div>
        <div className="px-4 py-2 divide-y divide-slate-100">
          {idxLoad ? (
            <SkeletonRows n={3} />
          ) : indices.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">ไม่สามารถโหลดข้อมูลได้</p>
          ) : (
            indices.map(idx => <IndexRow key={idx.symbol} idx={idx} />)
          )}
        </div>
        <div className="px-4 pb-3 pt-1">
          <p className="text-[10px] text-slate-400">
            ราคาจาก Finnhub · อาจล่าช้า 15 นาที · ไม่รวมชั่วโมงนอกตลาด
          </p>
        </div>
      </section>

      {/* Top movers */}
      <section className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700">ผู้นำวันนี้</h2>
        </div>
        <div className="px-3 py-2">
          {movLoad ? (
            <SkeletonRows n={4} />
          ) : !movers ? (
            <p className="text-xs text-slate-400 py-2 text-center">ไม่มีข้อมูล</p>
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
      <section className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700">สกรีนอัลกอริทึม</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">สัญญาณจากข้อมูลจริง · ไม่ใช่คำแนะนำลงทุน</p>
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
            className="flex items-center justify-between w-full rounded-xl bg-slate-50/60 border border-slate-200 px-3 py-2.5 hover:bg-slate-100/40 transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-slate-700">Top Movers Today</p>
              <p className="text-[10px] text-slate-500">ตลาด · volume surge + % move</p>
            </div>
            <span className="text-slate-400">→</span>
          </Link>
        </div>
      </section>

      {/* Martin CTA */}
      <Link
        href="/analyze"
        className="rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100/60 border border-violet-200 p-4 flex items-center gap-3 hover:from-violet-100 hover:to-violet-200/60 transition-colors"
      >
        <span className="text-2xl text-violet-500 flex-shrink-0">✦</span>
        <div>
          <p className="text-xs font-bold text-violet-800">Martin Chart Analysis</p>
          <p className="text-[10px] text-violet-500 leading-snug">วิเคราะห์กราฟ RSI·ATR·ADX·Fib · Scenario Playbook</p>
        </div>
      </Link>
    </aside>
  );
}
