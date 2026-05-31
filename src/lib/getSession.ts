import { auth } from "@/auth";
import { cookies } from "next/headers";

export async function getSessionUserId(): Promise<string | null> {
  try {
    const session = await auth();
    if (session?.user?.id) return session.user.id;
  } catch {
    // auth() may fail outside a request context
  }
  const jar = await cookies();
  return jar.get("demo_user_id")?.value ?? null;
}

export async function getSessionInfo(): Promise<{ userId: string | null; isDemo: boolean }> {
  try {
    const session = await auth();
    if (session?.user?.id) return { userId: session.user.id, isDemo: false };
  } catch {
    // fall through
  }
  const jar    = await cookies();
  const userId = jar.get("demo_user_id")?.value ?? null;
  return { userId, isDemo: true };
}
