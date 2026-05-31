"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";

interface Mover {
  ticker: string;
  price:  number;
  change: number;
  volume: number;
}

interface MoversData {
  gainers: Mover[];
  losers:  Mover[];
  active:  Mover[];
}

type Tab = "gainers" | "losers" | "active";

const TAB_LABELS: Record<Tab, string> = {
  gainers: "ขึ้นมาก",
  losers:  "ลงมาก",
  active:  "ซื้อขายหนาแน่น",
};

function MoverRow({ mover }: { mover: Mover }) {
  const positive     = mover.change >= 0;
  const changeColor  = positive ? "#5B8A2A" : "#DC2626";
  const volumeMillions = (mover.volume / 1_000_000).toFixed(1);

  return (
    <Link
      href={`/radar?ticker=${mover.ticker}`}
      className="flex items-center justify-between px-3 py-2 hover:bg-[#EDE7D9] transition-colors"
    >
      <span className="text-[11px] font-bold w-14 flex-shrink-0">{mover.ticker}</span>
      <span
        className="text-[10px] text-[#8A8378] flex-1"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {volumeMillions}M
      </span>
      <span
        className="text-[11px] font-bold w-16 text-right flex-shrink-0"
        style={{ color: changeColor, fontFamily: "var(--font-mono)" }}
      >
        {positive ? "+" : ""}{mover.change.toFixed(2)}%
      </span>
    </Link>
  );
}

export function TopMoversCard() {
  const [data, setData]       = useState<MoversData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<Tab>("gainers");

  useEffect(() => {
    fetch("/api/market/movers")
      .then((r) => r.json())
      .then((d: Partial<MoversData>) => {
        setData({
          gainers: d.gainers ?? [],
          losers:  d.losers  ?? [],
          active:  d.active  ?? [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const rows = data?.[tab] ?? [];

  return (
    <Card className="overflow-hidden">
      <div className="px-3 pt-3 pb-0 border-b border-[#E8E2D4]">
        <h2 className="text-[10px] font-bold uppercase tracking-widest mb-2">
          หุ้นที่เคลื่อนไหวมาก
        </h2>
        <div className="flex gap-0" role="tablist">
          {(["gainers", "losers", "active"] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide border-t border-x border-[#1F1A14] -mb-px transition-colors"
              style={{
                background: tab === t ? "#1F1A14" : "#F3EDE0",
                color:      tab === t ? "#fff"     : "#8A8378",
              }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="divide-y divide-[#E8E2D4]">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2">
              <div className="h-3 w-12 bg-[#E8E2D4] animate-pulse rounded" />
              <div className="h-3 w-16 bg-[#E8E2D4] animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-3 py-4 text-[10px] text-[#8A8378] text-center">
          ไม่มีข้อมูล
        </p>
      ) : (
        <div className="divide-y divide-[#E8E2D4]" role="tabpanel">
          {rows.map((m) => (
            <MoverRow key={m.ticker} mover={m} />
          ))}
        </div>
      )}
    </Card>
  );
}
