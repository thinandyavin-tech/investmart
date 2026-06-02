import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";

export const metadata: Metadata = { title: "นโยบายความเป็นส่วนตัว — InvestMart" };

const SECTIONS = [
  {
    title: "ข้อมูลที่เราเก็บ",
    body: [
      "ข้อมูลบัญชี: ชื่อ, อีเมล, ชื่อผู้ใช้ที่คุณให้มาตอนสมัคร",
      "ข้อมูลการใช้งาน: โพสต์, คอมเมนต์, การซื้อขายจำลอง, watchlist ที่คุณสร้าง",
      "ข้อมูลเซสชัน: cookie ที่ใช้จดจำการเข้าสู่ระบบ (httpOnly, secure)",
      "ข้อมูล Demo: หากใช้โหมด Demo จะมี cookie ชั่วคราว ไม่มีข้อมูลส่วนบุคคล",
    ],
  },
  {
    title: "วิธีที่เราใช้ข้อมูล",
    body: [
      "แสดงพอร์ตและประวัติการเทรดของคุณ",
      "แสดง leaderboard และโปรไฟล์สาธารณะ (username, โพสต์)",
      "ส่งข้อมูลหุ้นไปยัง AI เพื่อสร้างการวิเคราะห์ (ไม่รวมข้อมูลส่วนตัวของคุณ)",
      "ไม่ขายข้อมูลส่วนบุคคลให้บุคคลที่สาม",
    ],
  },
  {
    title: "บริการภายนอก",
    body: [
      "Finnhub: ข้อมูลหุ้น (server-side เท่านั้น, ไม่ส่ง IP ของคุณ)",
      "Groq / Google Gemini: รับ prompt ที่มีข้อมูลหุ้นสาธารณะเท่านั้น",
      "Vercel: โฮสต์เว็บ, อาจเก็บ logs มาตรฐาน (IP, request path)",
      "Neon Postgres: ฐานข้อมูล (ใน region us-east)",
    ],
  },
  {
    title: "สิทธิ์ของคุณ",
    body: [
      "ลบบัญชีและข้อมูลทั้งหมดได้ตลอดเวลา (ติดต่อผ่านโพสต์หรืออีเมล)",
      "ข้อมูลที่แสดงสาธารณะ: username, โพสต์, จำนวน follower",
      "ข้อมูลที่เป็นส่วนตัว: อีเมล, พอร์ตมูลค่า, ประวัติการเทรดส่วนตัว",
    ],
  },
  {
    title: "ความปลอดภัย",
    body: [
      "HTTPS ทุก request",
      "API keys อยู่ server-side เท่านั้น ไม่ expose ถึง browser",
      "รหัสผ่าน hash ด้วย bcrypt",
      "ราคาซื้อขายดึงจาก server เสมอ ไม่รับราคาจาก client",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest mb-1">นโยบายความเป็นส่วนตัว</h1>
          <p className="text-[10px] text-[#8A8378]">มีผลตั้งแต่ มิถุนายน 2025 · InvestMart</p>
        </div>

        <p className="text-[11px] text-[#8A8378] leading-relaxed">
          InvestMart เป็นแพลตฟอร์มจำลองการลงทุนเพื่อการศึกษา
          เราเคารพความเป็นส่วนตัวของคุณและเก็บข้อมูลเฉพาะที่จำเป็น
        </p>

        {SECTIONS.map((s) => (
          <Card key={s.title} className="p-4 flex flex-col gap-2">
            <h2 className="text-[11px] font-bold uppercase tracking-widest">{s.title}</h2>
            <ul className="flex flex-col gap-1">
              {s.body.map((line) => (
                <li key={line} className="text-[11px] flex gap-1.5">
                  <span className="text-[#5B8A2A] flex-shrink-0">·</span>
                  <span className="leading-relaxed">{line}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}

        <div className="flex gap-4 text-[10px]">
          <Link href="/terms" className="text-[#5B8A2A] hover:underline">ข้อกำหนดการใช้งาน</Link>
          <Link href="/about" className="text-[#5B8A2A] hover:underline">เกี่ยวกับเรา</Link>
          <Link href="/"      className="text-[#8A8378] hover:underline">กลับหน้าหลัก</Link>
        </div>
      </div>
    </AppShell>
  );
}
