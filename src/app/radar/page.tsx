import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { RadarPage } from "@/components/radar/RadarPage";

export const metadata: Metadata = {
  title: "เรดาร์แสกนหุ้น · AI investing simulator",
  description:
    "เรดาร์แสกนหุ้นโมเมนตัมอเมริกา · วิเคราะห์หุ้นด้วย AI · เว็บโซเชียลมีเดียหุ้นอเมริกา InvestMart",
};

export default function RadarRoute() {
  return (
    <AppShell>
      <RadarPage />
    </AppShell>
  );
}
