import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { HistoryClient } from "@/components/history/HistoryClient";

export const metadata: Metadata = { title: "ประวัติซื้อขาย" };

export default function HistoryPage() {
  return (
    <AppShell>
      <HistoryClient />
    </AppShell>
  );
}
