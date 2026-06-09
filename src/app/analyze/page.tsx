import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { AnalyzeClient } from "@/components/analysis/AnalyzeClient";

interface Props {
  searchParams: Promise<{ ticker?: string; timeframe?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { ticker } = await searchParams;
  const t = ticker?.toUpperCase();
  return {
    title: t ? `Martin · Chart Analysis · ${t}` : "Martin · Chart Analysis",
    description: t
      ? `การวิเคราะห์กราฟเทคนิค ${t} โดย Martin AI — สัญญาณ, Scenario Playbook, ระดับราคาสำคัญ`
      : "Martin Chart Analysis — การวิเคราะห์กราฟเทคนิคเชิงลึกโดย AI บน InvestMart",
  };
}

export default async function AnalyzePage({ searchParams }: Props) {
  const { ticker, timeframe } = await searchParams;
  return (
    <AppShell>
      <AnalyzeClient
        initialTicker={ticker?.toUpperCase()}
        initialTimeframe={(timeframe as "3M" | "1Y" | "5Y") ?? "3M"}
      />
    </AppShell>
  );
}
