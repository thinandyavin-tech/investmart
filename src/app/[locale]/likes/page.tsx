import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { LikedPostsClient } from "@/components/social/LikedPostsClient";

export const metadata: Metadata = { title: "โพสต์ที่ถูกใจ" };

export default function LikesPage() {
  return (
    <AppShell>
      <LikedPostsClient />
    </AppShell>
  );
}
