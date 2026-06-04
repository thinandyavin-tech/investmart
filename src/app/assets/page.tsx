import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { AssetsPage } from "@/components/assets/AssetsPage";

export const metadata: Metadata = {
  title: "Assets · พอร์ตโฟลิโอ",
};

export default function AssetsRoute() {
  return (
    <AppShell>
      <AssetsPage />
    </AppShell>
  );
}
