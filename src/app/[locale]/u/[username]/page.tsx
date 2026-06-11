import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { TraderProfileClient } from "@/components/social/TraderProfileClient";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function TraderProfilePage({ params }: Props) {
  const { username } = await params;
  return (
    <AppShell>
      <TraderProfileClient username={username} />
    </AppShell>
  );
}
