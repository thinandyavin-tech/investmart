"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { MarketStatusBanner } from "@/components/market/MarketStatusBanner";
import { IndicesCard }        from "@/components/market/IndicesCard";
import { SectorCard }         from "@/components/market/SectorCard";
import { MarketNewsCard }     from "@/components/market/MarketNewsCard";

const TradingViewMarketOverview = dynamic(
  () => import("@/components/tradingview/TradingViewMarketOverview").then(m => m.TradingViewMarketOverview),
  { ssr: false, loading: () => <WidgetSkeleton height={460} /> },
);

const TradingViewHotlists = dynamic(
  () => import("@/components/tradingview/TradingViewHotlists").then(m => m.TradingViewHotlists),
  { ssr: false, loading: () => <WidgetSkeleton height={380} /> },
);

const TradingViewHeatmap = dynamic(
  () => import("@/components/tradingview/TradingViewHeatmap").then(m => m.TradingViewHeatmap),
  { ssr: false, loading: () => <WidgetSkeleton height={500} /> },
);

function WidgetSkeleton({ height }: { height: number }) {
  return (
    <div
      className="w-full animate-pulse bg-[#F0EBE1] rounded"
      style={{ height }}
      aria-hidden="true"
    />
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title:    string;
  subtitle?: string;
  action?:  React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#1F1A14]">{title}</h2>
        {subtitle && <p className="text-[10px] text-[#8A8378] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function MarketPageClient() {
  return (
    <div className="flex flex-col min-h-screen">
      <MarketStatusBanner />

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 flex flex-col gap-6">

        {/* ── Hero: Live multi-asset quote board ── */}
        <section aria-label="ภาพรวมตลาดโลก">
          <div className="border border-[#E0D9CC] bg-[#FDFAF4] overflow-hidden">
            <div className="px-4 pt-3 pb-2 border-b border-[#E0D9CC]">
              <SectionHeader
                title="ภาพรวมตลาดโลก · Global Markets"
                subtitle="ข้อมูลสด · TradingView · Indices · Commodities · Currencies (USDTHB) · Crypto · Bonds · ETFs"
              />
            </div>
            <div className="p-2">
              <TradingViewMarketOverview height={460} />
            </div>
          </div>
        </section>

        {/* ── Market Movers ── */}
        <section aria-label="หุ้นที่เคลื่อนไหวมากที่สุด">
          <div className="border border-[#E0D9CC] bg-[#FDFAF4] overflow-hidden">
            <div className="px-4 pt-3 pb-2 border-b border-[#E0D9CC]">
              <SectionHeader
                title="Market Movers · Most Active · Top Gainers · Top Losers"
                subtitle="ตลาดสหรัฐ US — รายการนี้ถูกครอบงำโดยหุ้น small-cap ที่ผันผวนสูง ดูเพื่อรับทราบความเคลื่อนไหว ไม่ใช่คำแนะนำ"
              />
            </div>
            <div className="p-2">
              <TradingViewHotlists height={380} />
            </div>
          </div>
        </section>

        {/* ── Two-column: Indices (our data) + Sector ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section aria-label="ดัชนีหลัก">
            <IndicesCard />
          </section>
          <section aria-label="Sector Performance">
            <SectorCard />
          </section>
        </div>

        {/* ── S&P 500 Heatmap ── */}
        <section aria-label="Heatmap S&P 500">
          <div className="border border-[#E0D9CC] bg-[#FDFAF4] overflow-hidden">
            <div className="px-4 pt-3 pb-2 border-b border-[#E0D9CC]">
              <SectionHeader
                title="S&P 500 Heatmap"
                subtitle="สี = % เปลี่ยนแปลงวันนี้ · ขนาด = Market Cap · กดดูรายละเอียด"
                action={
                  <Link
                    href="/browse"
                    className="text-xs font-bold text-[#5B8A2A] hover:underline flex-shrink-0"
                  >
                    Browse →
                  </Link>
                }
              />
            </div>
            <div className="p-2">
              <TradingViewHeatmap height={500} />
            </div>
          </div>
        </section>

        {/* ── Market News ── */}
        <section aria-label="ข่าวตลาด">
          <MarketNewsCard />
        </section>

        {/* ── Links ── */}
        <div className="flex flex-wrap gap-3 pb-2">
          <Link href="/calendar" className="text-xs text-[#8A8378] hover:text-[#1F1A14] hover:underline transition-colors">
            ปฏิทินเศรษฐกิจ →
          </Link>
          <Link href="/news" className="text-xs text-[#8A8378] hover:text-[#1F1A14] hover:underline transition-colors">
            ข่าวทั้งหมด →
          </Link>
          <Link href="/screener" className="text-xs text-[#8A8378] hover:text-[#1F1A14] hover:underline transition-colors">
            Stock Screener →
          </Link>
        </div>

        <p className="text-[10px] text-[#8A8378] text-center pb-2 leading-relaxed">
          ข้อมูล TradingView widgets: real-time ·  ข้อมูล Finnhub (ดัชนี/sector): อาจล่าช้า 15–20 นาที
          · ไม่ใช่คำแนะนำการลงทุน · InvestMart เป็น paper trading simulator เท่านั้น
        </p>
      </div>
    </div>
  );
}
