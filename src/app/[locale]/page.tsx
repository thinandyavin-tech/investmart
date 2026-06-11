import { redirect }   from "next/navigation";
import { cookies }    from "next/headers";
import { AppShell }   from "@/components/AppShell";
import { HomeDesktop } from "@/components/home/HomeDesktop";
import { HomeMobile }  from "@/components/home/HomeMobile";

export const metadata = {
  title: "InvestMart",
};

export default async function HomePage() {
  const jar        = await cookies();
  const hasSession = !!(jar.get("demo_user_id") || jar.get("next-auth.session-token") || jar.get("__Secure-next-auth.session-token"));

  if (!hasSession) {
    redirect("/signin");
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
