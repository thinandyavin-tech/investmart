import { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { MartinChatPage } from "@/components/ai/MartinChatPage";

export const metadata: Metadata = {
  title: "Martin AI · InvestMart",
  description: "คุยกับ Martin — Licensed Financial Analyst วิเคราะห์หุ้นจากข้อมูลจริง Real-time",
};

export default function MartinRoute() {
  return (
    <AppShell>
      <Suspense>
        <MartinChatPage />
      </Suspense>
    </AppShell>
  );
}
