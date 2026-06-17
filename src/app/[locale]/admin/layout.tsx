import { redirect } from "next/navigation";
import { auth } from "@/auth";

const ADMIN_EMAIL = "thinandyavin@gmail.com";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email || session.user.email.toLowerCase() !== ADMIN_EMAIL) {
    redirect("/");
  }
  return (
    <div className="min-h-screen bg-[#fefae0] text-[#1F1A14]">
      <div className="border-b-2 border-[#1F1A14] bg-[#1F1A14] px-6 py-3 flex items-center gap-4">
        <span className="font-mono font-bold text-[#fefae0] text-sm">🛡 InvestMart Admin</span>
        <a href="/" className="ml-auto text-xs text-[#A89F94] hover:text-[#fefae0] font-mono">← Back to site</a>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
