"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useUser } from "@/lib/userContext";

const PriceChart = dynamic(
  () => import("@/components/PriceChart").then((m) => m.PriceChart),
  { ssr: false }
);

interface RadarPick {
  ticker:      string;
  price:       number;
  change:      number;
  companyName: string;
  sector:      string;
}

interface Candle {
  time:   number;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

interface HistoryResponse {
  candles?:   Candle[];
  simulated?: boolean;
}

export function RadarPickCard() {
  const { user } = useUser();
  const [pick, setPick]               = useState<RadarPick | null>(null);
  const [candles, setCandles]         = useState<Candle[]>([]);
  const [simulated, setSimulated]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [watched, setWatched]         = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/radar/top");
        if (!res.ok) return;
        const data = (await res.json()) as RadarPick;
        setPick(data);

        const histRes  = await fetch(`/api/stock/history?symbol=${data.ticker}&timeframe=3M`);
        const histData = (await histRes.json()) as HistoryResponse;
        setCandles(histData.candles ?? []);
        setSimulated(histData.simulated ?? false);
      } catch {
        // pick stays null — error state renders
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  // Check watchlist status once pick + user are known
  useEffect(() => {
    if (!user || !pick) return;
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((d: { items?: { ticker: string }[] }) => {
        setWatched((d.items ?? []).some((i) => i.ticker === pick.ticker));
      })
      .catch(() => {});
  }, [user, pick]);

  async function toggleWatch() {
    if (!pick || !user || watchLoading) return;
    setWatchLoading(true);
    try {
      if (watched) {
        await fetch(`/api/watchlist/${pick.ticker}`, { method: "DELETE" });
        setWatched(false);
      } else {
        await fetch("/api/watchlist", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ ticker: pick.ticker }),
        });
        setWatched(true);
      }
    } catch {
      // leave state unchanged
    } finally {
      setWatchLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-3 mb-3 border border-[#1F1A14] bg-[#F3EDE0] p-4 animate-pulse">
        <div className="h-3 w-32 bg-[#E8E2D4] mb-3 rounded" />
        <div className="h-8 w-28 bg-[#E8E2D4] mb-2 rounded" />
        <div className="h-3 w-48 bg-[#E8E2D4] mb-4 rounded" />
        <div className="h-24 bg-[#E8E2D4] rounded" />
        <div className="flex gap-2 mt-3">
          <div className="flex-1 h-9 bg-[#E8E2D4] rounded" />
          <div className="flex-1 h-9 bg-[#E8E2D4] rounded" />
        </div>
      </div>
    );
  }

  if (!pick) {
    return (
      <div className="mx-3 mb-3 border border-[#1F1A14] bg-[#F3EDE0] p-4 text-center">
        <p className="text-xs text-[#8A8378]">ไม่สามารถโหลด Radar Pick ได้</p>
      </div>
    );
  }

  const up = pick.change >= 0;

  return (
    <div className="mx-3 mb-3 border border-[#1F1A14] bg-[#F3EDE0]">
      <div className="px-4 pt-3 pb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#5B8A2A" }}>
          ● ▶ RADAR PICK · 3M
        </span>
      </div>

      <div className="flex items-end justify-between px-4 pb-2">
        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl font-bold leading-none" style={{ fontFamily: "var(--font-mono)" }}>
              {pick.ticker}
            </span>
            <span className="text-xl font-bold" style={{ fontFamily: "var(--font-mono)" }}>
              ${pick.price.toFixed(2)}
            </span>
          </div>
          <div className="text-[10px] text-[#8A8378] mt-1">
            {pick.companyName} · {pick.sector}
          </div>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: up ? "#5B8A2A" : "#E5484D", color: "#fff" }}
        >
          {up ? "+" : ""}{pick.change.toFixed(2)}%
        </span>
      </div>

      <div className="px-4 pb-3">
        <PriceChart candles={candles} mode="Price" simulated={simulated} height={100} mini />
      </div>

      <div className="flex gap-2 px-4 pb-4">
        <button
          className="flex-1 py-2.5 text-xs font-bold border transition-colors"
          style={{
            borderColor: watched ? "#5B8A2A" : "#1F1A14",
            background:  watched ? "#F0FAE5"  : "#F3EDE0",
            color:       watched ? "#5B8A2A"  : "#1F1A14",
            boxShadow:   watched ? "none" : "2px 2px 0 #FF3D9A",
          }}
          onClick={() => void toggleWatch()}
          disabled={watchLoading || !user}
          aria-pressed={watched}
          aria-label={watched ? `ลบ ${pick.ticker} จาก watchlist` : `เพิ่ม ${pick.ticker} ใน watchlist`}
        >
          {watchLoading ? "..." : watched ? "✓ ติดตามแล้ว" : "+ ติดตาม"}
        </button>
        <Link
          href={`/stock/${pick.ticker}`}
          className="flex-1 py-2.5 text-xs font-bold text-center bg-[#1F1A14] text-white shadow-offset-lime"
        >
          ดูกราฟเต็ม
        </Link>
      </div>
    </div>
  );
}
