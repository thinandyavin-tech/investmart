import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";

interface ComingSoonProps {
  titleThai: string;
  descThai:  string;
}

export function ComingSoon({ titleThai, descThai }: ComingSoonProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div
        className="w-full max-w-sm bg-[#F3EDE0] border border-[#1F1A14] p-8 flex flex-col items-center gap-5"
        style={{ boxShadow: "4px 4px 0 #1F1A14" }}
      >
        <Logo size={32} className="text-[#1F1A14]" />

        <div className="text-center">
          <h1 className="text-xs font-bold uppercase tracking-widest text-[#1F1A14] mb-1">
            {titleThai}
          </h1>
          <p className="text-xs text-[#8A8378] leading-relaxed">{descThai}</p>
        </div>

        <div
          className="text-xs font-bold tracking-widest uppercase px-3 py-1.5"
          style={{ background: "#FFD9E8", color: "#D6336C" }}
        >
          กำลังพัฒนา · Coming soon
        </div>

        <Link
          href="/"
          className="text-xs font-bold text-[#1F1A14] border border-[#1F1A14] px-4 py-1.5 hover:bg-[#1F1A14] hover:text-white transition-colors"
        >
          ← กลับหน้าหลัก
        </Link>
      </div>
    </div>
  );
}
