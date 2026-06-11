import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { MarketPageClient } from "@/components/market/MarketPageClient";

export const metadata: Metadata = {
  title: "ภาพรวมตลาด · InvestMart",
  description:
    "ภาพรวมตลาดหุ้นสหรัฐ · ดัชนี S&P 500, Nasdaq, Dow Jones · หุ้นขึ้นลงมาก · Sector performance · ข่าวตลาด",
};

export default function MarketRoute() {
  return (
    <AppShell>
      <MarketPageClient />
    </AppShell>
  );
}
