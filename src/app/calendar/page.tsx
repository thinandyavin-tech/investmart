import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { CalendarClient } from "@/components/calendar/CalendarClient";

export const metadata: Metadata = {
  title:       "ปฏิทินเศรษฐกิจ · InvestMart",
  description: "ปฏิทินเศรษฐกิจโลก — CPI, Fed, NFP, GDP, PMI, ECB, BoE และอื่นๆ · ข้อมูลจริงจาก TradingView",
};

export default function CalendarPage() {
  return (
    <AppShell>
      <CalendarClient />
    </AppShell>
  );
}
