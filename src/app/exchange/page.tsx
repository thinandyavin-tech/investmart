import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ExchangeClient } from "@/components/exchange/ExchangeClient";

export const metadata: Metadata = { title: "แลกเปลี่ยนเงิน · Exchange" };

export default function ExchangePage() {
  return (
    <AppShell>
      <ExchangeClient />
    </AppShell>
  );
}
