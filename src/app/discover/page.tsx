import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Discover" };

export default function DiscoverPage() {
  return (
    <AppShell>
      <ComingSoon
        titleThai="Discover — ค้นพบหุ้นและผู้เทรด"
        descThai="เร็วๆ นี้: ดูโพสต์ยอดนิยม, ผู้เทรดที่น่าติดตาม, และหุ้นที่ถูกพูดถึงมากที่สุด"
      />
    </AppShell>
  );
}
