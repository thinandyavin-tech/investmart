import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ComposePageClient } from "@/components/social/ComposePageClient";

export const metadata: Metadata = { title: "เขียนโพสต์" };

export default function ComposePage() {
  return (
    <AppShell>
      <ComposePageClient />
    </AppShell>
  );
}
