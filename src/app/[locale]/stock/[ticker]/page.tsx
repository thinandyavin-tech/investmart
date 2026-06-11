import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { StockPageClient } from "@/components/stock/StockPageClient";

interface StockPageProps {
  params: Promise<{ ticker: string }>;
}

export async function generateMetadata({ params }: StockPageProps): Promise<Metadata> {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();
  return {
    title: `${upper} · รายละเอียดหุ้น`,
    description: `ราคา ข้อมูล และการวิเคราะห์หุ้น ${upper} บน InvestMart`,
  };
}

export default async function StockPage({ params }: StockPageProps) {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();

  return (
    <AppShell>
      <StockPageClient ticker={upper} />
    </AppShell>
  );
}
