import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { NewsPage } from "@/components/news/NewsPage";

export const metadata: Metadata = {
  title: "ข่าวตลาดหุ้น",
  description: "ข่าวหุ้นล่าสุดจากตลาดอเมริกา แยกตามอุตสาหกรรม · เทคโนโลยี การเงิน สุขภาพ พลังงาน อวกาศ และอื่น ๆ",
};

export default function NewsRoute() {
  return (
    <AppShell>
      <NewsPage />
    </AppShell>
  );
}
