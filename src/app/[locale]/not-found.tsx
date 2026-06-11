import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { AppShell } from "@/components/AppShell";

export default function NotFound() {
  return (
    <AppShell>
      <div className="min-h-screen flex items-center justify-center p-6">
        <div
          className="w-full max-w-sm bg-[#F3EDE0] border border-[#1F1A14] p-8 flex flex-col items-center gap-5"
          style={{ boxShadow: "4px 4px 0 #1F1A14" }}
        >
          <Logo size={32} className="text-[#1F1A14]" />

          <div className="text-center">
            <p
              className="text-4xl font-bold mb-2"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              404
            </p>
            <h1 className="text-xs font-bold uppercase tracking-widest mb-1">
              ไม่พบหน้าที่ต้องการ
            </h1>
            <p className="text-xs text-[#8A8378] leading-relaxed">
              ลิงก์นี้อาจถูกย้าย ลบ หรือยังไม่ได้สร้างขึ้น
            </p>
          </div>

          <Link
            href="/"
            className="text-xs font-bold text-[#1F1A14] border border-[#1F1A14] px-4 py-1.5 hover:bg-[#1F1A14] hover:text-white transition-colors"
          >
            ← กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
