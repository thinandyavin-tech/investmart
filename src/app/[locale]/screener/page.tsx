import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ScreenerClient } from "@/components/screener/ScreenerClient";

export const metadata: Metadata = {
  title: "Stock Screener · InvestMart",
  description: "คัดกรองหุ้นอเมริกาด้วย sector, market cap, P/E, beta, momentum score",
};

export default function ScreenerPage() {
  return (
    <AppShell>
      <ScreenerClient />
    </AppShell>
  );
}
