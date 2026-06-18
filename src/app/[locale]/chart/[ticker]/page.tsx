import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { Link } from "@/i18n/navigation";
import { ChartStructureWrapper } from "@/components/chart/ChartStructureWrapper";

interface Props { params: Promise<{ ticker: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();
  return {
    title: `${upper} · Chart Structure — InvestMart`,
    description: `Swing highs/lows, support/resistance, supply/demand zones for ${upper}`,
  };
}

export default async function ChartPage({ params }: Props) {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-4 pb-24 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900">{upper} · Chart Structure</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Swing highs/lows · Support & Resistance · Supply & Demand zones
            </p>
          </div>
          <Link href={`/stock/${upper}`}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors border border-[#ccd5ae] px-3 py-1.5 rounded-lg">
            ← {upper}
          </Link>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <p className="text-[10px] text-amber-700 leading-snug">
            Technical levels are areas of historical price interest. Auto-detected by algorithm — will differ from hand-drawn analysis.
            Observational only. Not a buy/sell signal. Past structure does not predict future price.
          </p>
        </div>

        {/* Chart */}
        <ChartStructureWrapper ticker={upper} />
      </div>
    </AppShell>
  );
}
