import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { RadarPage } from "@/components/radar/RadarPage";

export const metadata: Metadata = {
  title: "เรดาร์แสกนหุ้น · AI investing simulator",
  description:
    "เรดาร์แสกนหุ้นโมเมนตัมอเมริกา · AI investing simulator · paper trading game · พอร์ตหุ้นจำลอง ไม่ใช้เงินจริง · เว็บหุ้นเหมือนเกม InvestMart",
};

export default function RadarRoute() {
  return (
    <AppShell>
      <RadarPage />
    </AppShell>
  );
}
