import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { SavedPostsClient } from "@/components/social/SavedPostsClient";

export const metadata: Metadata = { title: "โพสต์ที่บันทึก" };

export default function SavedPage() {
  return (
    <AppShell>
      <SavedPostsClient />
    </AppShell>
  );
}
