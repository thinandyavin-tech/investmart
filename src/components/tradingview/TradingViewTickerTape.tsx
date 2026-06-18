"use client";

import { useEffect, useState, useRef } from "react";

interface TickerItem {
  symbol: string;
  label:  string;
  price:  number | null;
  dp:     number | null;
}

const TICKERS: { symbol: string; label: string }[] = [
  { symbol: "SPY",  label: "S&P 500"  },
  { symbol: "QQQ",  label: "Nasdaq"   },
  { symbol: "AAPL", label: "AAPL"     },
  { symbol: "NVDA", label: "NVDA"     },
  { symbol: "MSFT", label: "MSFT"     },
  { symbol: "TSLA", label: "TSLA"     },
  { symbol: "GOOGL",label: "GOOGL"    },
  { symbol: "META", label: "META"     },
  { symbol: "AMZN", label: "AMZN"     },
  { symbol: "JPM",  label: "JPM"      },
];

interface TradingViewTickerTapeProps {
  theme?:    "light" | "dark";
  locale?:   string;
  className?: string;
}

export function TradingViewTickerTape({ className = "" }: TradingViewTickerTapeProps) {
  const [items, setItems] = useState<TickerItem[]>(
    TICKERS.map(t => ({ ...t, price: null, dp: null }))
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const results = await Promise.allSettled(
        TICKERS.map(t =>
          fetch(`/api/stock/quote?ticker=${t.symbol}`)
            .then(r => r.json() as Promise<{ c?: number; dp?: number }>)
        )
      );
      setItems(TICKERS.map((t, i) => {
        const r = results[i];
        if (r.status === "fulfilled" && r.value.c) {
          return { ...t, price: r.value.c, dp: r.value.dp ?? null };
        }
        return { ...t, price: null, dp: null };
      }));
    }
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, []);

  const loaded = items.some(i => i.price !== null);

  return (
    <div
      className={`overflow-hidden bg-[#faedcd] border-b border-[#ccd5ae] ${className}`}
      style={{ height: 36 }}
    >
      {!loaded ? (
        // skeleton while loading
        <div className="flex items-center h-full gap-6 px-4">
          {[80, 60, 72, 55, 68].map(w => (
            <div key={w} className="h-3 bg-[#e9edc9] animate-pulse rounded flex-shrink-0" style={{ width: w }} />
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex items-center h-full gap-0 select-none"
          style={{ animation: "ticker-scroll 40s linear infinite", width: "max-content" }}
        >
          {/* Duplicate list for seamless loop */}
          {[...items, ...items].map((item, i) => {
            const pos = (item.dp ?? 0) >= 0;
            return (
              <div key={i} className="flex items-center gap-1.5 px-4 border-r border-[#e9edc9] flex-shrink-0 h-full">
                <span className="text-xs font-bold text-slate-700">{item.label}</span>
                {item.price !== null && (
                  <>
                    <span className="text-xs font-mono text-slate-600">${item.price.toFixed(2)}</span>
                    {item.dp !== null && (
                      <span
                        className="text-[10px] font-bold"
                        style={{ color: pos ? "#16A34A" : "#DC2626" }}
                      >
                        {pos ? "+" : ""}{item.dp.toFixed(2)}%
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
