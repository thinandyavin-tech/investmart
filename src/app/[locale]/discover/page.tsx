import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { DiscoverClient } from "@/components/discover/DiscoverClient";

export const metadata: Metadata = { title: "Discover — InvestMart" };

export default function DiscoverPage() {
  return (
    <AppShell>
      <DiscoverClient />
    </AppShell>
  );
}
