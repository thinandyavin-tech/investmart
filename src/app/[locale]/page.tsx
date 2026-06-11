import { AppShell } from "@/components/AppShell";
import { HomeDesktop } from "@/components/home/HomeDesktop";
import { HomeMobile } from "@/components/home/HomeMobile";

export const metadata = {
  title: "หน้าหลัก",
};

export default function HomePage() {
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
