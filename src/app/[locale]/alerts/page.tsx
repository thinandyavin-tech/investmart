import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { AlertsPage } from "@/components/alerts/AlertsPage";

export const metadata: Metadata = {
  title: "แจ้งเตือนราคา · InvestMart",
  description: "ตั้งค่าแจ้งเตือนราคาหุ้น — รับการแจ้งเตือนเมื่อราคาถึงเป้าหมาย",
};

export default function AlertsRoute() {
  return (
    <AppShell>
      <AlertsPage />
    </AppShell>
  );
}
