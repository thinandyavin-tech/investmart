import { auth } from "@/auth";
import { cookies } from "next/headers";
import { DEMO_COOKIE, verifyDemoCookie } from "@/lib/demoCookie";

export async function getSessionUserId(): Promise<string | null> {
  try {
    const session = await auth();
    if (session?.user?.id) return session.user.id;
  } catch {
    // auth() may fail outside a request context
  }
  const jar = await cookies();
  return verifyDemoCookie(jar.get(DEMO_COOKIE)?.value);
}

export async function getSessionInfo(): Promise<{ userId: string | null; isDemo: boolean }> {
  try {
    const session = await auth();
    if (session?.user?.id) return { userId: session.user.id, isDemo: false };
  } catch {
    // fall through
  }
  const jar    = await cookies();
  const userId = await verifyDemoCookie(jar.get(DEMO_COOKIE)?.value);
  return { userId, isDemo: true };
}
