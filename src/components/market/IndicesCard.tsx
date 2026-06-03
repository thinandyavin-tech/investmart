"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";

interface IndexData {
  symbol:    string;
  name:      string;
  price:     number;
  change:    number;
  sparkline: number[];
}

function Sparkline({ prices, positive }: { prices: number[]; positive: boolean }) {
  if (prices.length < 2) {
    return <div className="w-16 h-6 bg-slate-200" aria-hidden="true" />;
  }

  const W = 64;
  const H = 24;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pts = prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * W;
      const y = H - ((p - min) / range) * (H - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={positive ? "#16A34A" : "#DC2626"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IndicesCard() {
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market/indices")
      .then((r) => r.json())
      .then((d: { indices?: IndexData[] }) => {
        setIndices(d.indices ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="overflow-hidden">
      <div className="px-3 pt-3 pb-2 border-b border-slate-100">
        <h2 className="text-[10px] font-bold uppercase tracking-widest">ดัชนีหลัก</h2>
      </div>

      {loading ? (
        <div className="divide-y divide-slate-100">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5">
              <div className="h-3 w-20 bg-slate-200 animate-pulse rounded" />
              <div className="h-3 w-16 bg-slate-200 animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : indices.length === 0 ? (
        <p className="px-3 py-4 text-[10px] text-slate-500 text-center">
          ไม่สามารถโหลดข้อมูลดัชนีได้
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {indices.map(({ symbol, name, price, change, sparkline }) => {
            const positive = change >= 0;
            const changeColor = positive ? "#16A34A" : "#DC2626";
            return (
              <div key={symbol} className="flex items-center gap-3 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold truncate">{name}</div>
                  <div className="text-[9px] text-slate-500">{symbol}</div>
                </div>
                <Sparkline prices={sparkline} positive={positive} />
                <div className="text-right flex-shrink-0">
                  <div
                    className="text-[11px] font-bold"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    ${price.toFixed(2)}
                  </div>
                  <div
                    className="text-[9px] font-bold"
                    style={{ color: changeColor, fontFamily: "var(--font-mono)" }}
                  >
                    {positive ? "+" : ""}{change.toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
