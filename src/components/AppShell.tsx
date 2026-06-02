import { IconRail } from "@/components/IconRail";
import { BottomNav } from "@/components/BottomNav";
import { FloatingAssistant } from "@/components/ai/FloatingAssistant";

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
      <main className="lg:pl-12 min-h-screen shell-main">
        {children}
      </main>

      {/* Phone bottom nav — hidden on desktop */}
      <BottomNav />
      <FloatingAssistant />
    </>
  );
}
