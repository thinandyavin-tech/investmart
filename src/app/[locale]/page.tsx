import { cookies }              from "next/headers";
import { AppShell }             from "@/components/AppShell";
import { HomeDesktop }          from "@/components/home/HomeDesktop";
import { HomeMobile }           from "@/components/home/HomeMobile";
import { getOrCreateGuestUser } from "@/lib/demoSession";

export const metadata = {
  title: "InvestMart",
};

export default async function HomePage() {
  const jar        = await cookies();
  const hasSession = !!(jar.get("demo_user_id") || jar.get("next-auth.session-token") || jar.get("__Secure-next-auth.session-token"));

  if (!hasSession) {
    const guestId = crypto.randomUUID();
    const guest   = await getOrCreateGuestUser(guestId);
    jar.set("demo_user_id", guest.id, {
      httpOnly: true,
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 30,
      path:     "/",
    });
  }

  return (
    <AppShell>
      <div className="hidden lg:block">
        <HomeDesktop />
      </div>
      <div className="block lg:hidden">
        <HomeMobile />
      </div>
    </AppShell>
  );
}
