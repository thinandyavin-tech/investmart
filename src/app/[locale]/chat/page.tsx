import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ChatPage } from "@/components/chat/ChatPage";

export const metadata: Metadata = {
  title: "แชท · InvestMart",
  description: "แชทกับนักลงทุนคนอื่นๆ · รับข่าวสารตลาดหุ้นจากระบบ",
};

export default function ChatRoute() {
  return (
    <AppShell>
      <ChatPage />
    </AppShell>
  );
}
