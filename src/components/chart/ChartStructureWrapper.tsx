"use client";

import dynamic from "next/dynamic";

const ChartStructureClient = dynamic(
  () => import("@/components/chart/ChartStructureClient").then(m => m.ChartStructureClient),
  {
    ssr:     false,
    loading: () => <div className="h-96 bg-[#e9edc9] animate-pulse rounded-xl" />,
  },
);

export function ChartStructureWrapper({ ticker }: { ticker: string }) {
  return <ChartStructureClient ticker={ticker} />;
}
