"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { useI18n } from "@/lib/i18n";

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
  const [error, setError]     = useState(false);
  const { t } = useI18n();

  function load() {
    setLoading(true);
    setError(false);
    fetch("/api/market/indices")
      .then((r) => r.json())
      .then((d: { indices?: IndexData[] }) => { setIndices(d.indices ?? []); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="overflow-hidden">
      <div className="px-3 pt-3 pb-2 border-b border-[#E0D9CC]">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#1F1A14]">{t.market.indicesTitle}</h2>
        <p className="text-[10px] text-[#8A8378] mt-0.5">{t.market.indicesSubtitle}</p>
      </div>

      {loading ? (
        <div className="divide-y divide-[#E8E2D4]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5">
              <div className="h-3 w-20 skeleton rounded" />
              <div className="h-3 w-16 skeleton rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="px-3 py-5 text-center">
          <p className="text-xs text-[#8A8378] mb-2">{t.errors.loadFailed}</p>
          <button
            onClick={load}
            className="text-xs font-bold text-[#5B8A2A] hover:underline focus-visible:underline"
          >
            {t.errors.retry}
          </button>
        </div>
      ) : indices.length === 0 ? (
        <p className="px-3 py-5 text-xs text-[#8A8378] text-center">{t.common.noData}</p>
      ) : (
        <div className="divide-y divide-[#E8E2D4]">
          {indices.map(({ symbol, name, price, change, sparkline }) => {
            const positive = change >= 0;
            const changeColor = positive ? "#16A34A" : "#DC2626";
            return (
              <div key={symbol} className="flex items-center gap-3 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate text-[#1F1A14]">{name}</div>
                  <div className="text-[10px] text-[#8A8378]">{symbol}</div>
                </div>
                <Sparkline prices={sparkline} positive={positive} />
                <div className="text-right flex-shrink-0">
                  <div
                    className="text-xs font-bold text-[#1F1A14]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    ${price.toFixed(2)}
                  </div>
                  <div
                    className="text-xs font-bold"
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
