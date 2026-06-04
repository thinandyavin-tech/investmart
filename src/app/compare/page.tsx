import type { Metadata } from "next";

import { AppShell } from "@/components/AppShell";
import { CompareClient } from "@/components/compare/CompareClient";

export const metadata: Metadata = {
  title: "เทียบหุ้น",
  description: "เปรียบเทียบหุ้นหลายตัวเคียงข้างกันด้วยข้อมูลราคา, ปัจจัยพื้นฐาน, RSI และอื่น ๆ",
};

interface ComparePageProps {
  searchParams: Promise<{ tickers?: string }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { tickers } = await searchParams;
  return (
    <AppShell>
      <CompareClient initialTickers={tickers ?? ""} />
    </AppShell>
  );
}
