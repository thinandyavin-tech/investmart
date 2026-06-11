import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { BrowseClient } from "@/components/browse/BrowseClient";

export const metadata: Metadata = {
  title: "Browse Stocks · InvestMart",
  description: "เรียกดูหุ้น S&P 500, Nasdaq 100, Dow 30, ETFs, ADRs ตามหมวดหมู่ · ข้อมูลชื่อ-ตลาด ฟรี ไม่มีค่าธรรมเนียม",
};

export default function BrowsePage() {
  return (
    <AppShell>
      <BrowseClient />
    </AppShell>
  );
}
