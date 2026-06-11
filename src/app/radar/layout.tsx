import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Radar — Market Movers · InvestMart",
  description:
    "Live market movers — top gainers, losers, and most active US stocks. Paper trading simulator powered by FMP data.",
};

export default function RadarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
