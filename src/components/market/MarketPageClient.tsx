"use client";

import { MarketStatusBanner } from "@/components/market/MarketStatusBanner";
import { IndicesCard }        from "@/components/market/IndicesCard";
import { TopMoversCard }      from "@/components/market/TopMoversCard";
import { SectorCard }         from "@/components/market/SectorCard";
import { MarketNewsCard }     from "@/components/market/MarketNewsCard";

export function MarketPageClient() {
  return (
    <div className="flex flex-col min-h-screen">
      <MarketStatusBanner />

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 flex flex-col gap-4">
        {/* Indices row */}
        <section aria-label="ดัชนีหลัก">
          <IndicesCard />
        </section>

        {/* Movers + Sectors side by side on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section aria-label="หุ้นที่เคลื่อนไหวมาก">
            <TopMoversCard />
          </section>
          <section aria-label="Sector Performance">
            <SectorCard />
          </section>
        </div>

        {/* News full-width */}
        <section aria-label="ข่าวตลาด">
          <MarketNewsCard />
        </section>

        <p className="text-xs text-slate-400 text-center pb-2">
          ข้อมูลอาจล่าช้า 15–20 นาที · ไม่ใช่คำแนะนำการลงทุน
        </p>
      </div>
    </div>
  );
}
