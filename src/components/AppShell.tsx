import { IconRail } from "@/components/IconRail";
import { BottomNav } from "@/components/BottomNav";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      {/* Desktop icon rail — hidden on mobile */}
      <div className="hidden lg:block">
        <IconRail />
      </div>

      {/* Main content — left-padded on desktop for the rail */}
      <main className="lg:pl-12 pb-16 lg:pb-0 min-h-screen">
        {children}
      </main>

      {/* Phone bottom nav — hidden on desktop */}
      <BottomNav />
    </>
  );
}
