"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { MarketStatusBanner } from "@/components/market/MarketStatusBanner";
import { IndicesCard }        from "@/components/market/IndicesCard";
import { TopMoversCard }      from "@/components/market/TopMoversCard";
import { SectorCard }         from "@/components/market/SectorCard";
import { MarketNewsCard }     from "@/components/market/MarketNewsCard";

const TradingViewMarketOverview = dynamic(
  () => import("@/components/tradingview/TradingViewMarketOverview").then(m => m.TradingViewMarketOverview),
  { ssr: false, loading: () => <div className="h-96 bg-white/40 animate-pulse rounded-2xl" /> },
);

const TradingViewHeatmap = dynamic(
  () => import("@/components/tradingview/TradingViewHeatmap").then(m => m.TradingViewHeatmap),
  { ssr: false, loading: () => <div className="h-[500px] bg-white/40 animate-pulse rounded-2xl" /> },
);

export function MarketPageClient() {
  return (
    <div className="flex flex-col min-h-screen">
      <MarketStatusBanner />

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 flex flex-col gap-5">
        {/* Our own data: Indices + Movers */}
        <section aria-label="ดัชนีหลัก">
          <IndicesCard />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section aria-label="หุ้นที่เคลื่อนไหวมาก">
            <TopMoversCard />
          </section>
          <section aria-label="Sector Performance">
            <SectorCard />
          </section>
        </div>

        {/* TradingView Market Overview — global coverage, no Finnhub, no API key */}
        <section aria-label="ภาพรวมตลาดโลก">
          <div className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700">
                  ภาพรวมตลาดโลก · Global Markets
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  TradingView · Indices, Futures, Bonds, Forex, Crypto, Commodities
                </p>
              </div>
            </div>
            <div className="p-1">
              <TradingViewMarketOverview height={420} />
            </div>
          </div>
        </section>

        {/* TradingView Heatmap — S&P 500 by sector/market cap */}
        <section aria-label="Heatmap S&P 500">
          <div className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700">
                  S&P 500 Heatmap
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  สี = % เปลี่ยนแปลงวันนี้ · ขนาด = Market Cap · กดแต่ละบริษัทเพื่อดูรายละเอียด
                </p>
              </div>
              <Link href="/browse" className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                Browse ทั้งหมด →
              </Link>
            </div>
            <div className="p-1">
              <TradingViewHeatmap height={520} />
            </div>
          </div>
        </section>

        {/* News */}
        <section aria-label="ข่าวตลาด">
          <MarketNewsCard />
        </section>

        <p className="text-xs text-slate-400 text-center pb-2">
          ข้อมูล Finnhub อาจล่าช้า 15–20 นาที · TradingView widgets real-time ·
          ไม่ใช่คำแนะนำการลงทุน
        </p>
      </div>
    </div>
  );
}
