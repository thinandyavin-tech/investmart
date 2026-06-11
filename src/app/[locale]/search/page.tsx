import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { SearchClient } from "@/components/search/SearchClient";

export const metadata: Metadata = { title: "ค้นหาหุ้น" };

export default function SearchPage() {
  return (
    <AppShell>
      <SearchClient />
    </AppShell>
  );
}
