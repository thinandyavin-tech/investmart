import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";

export const metadata: Metadata = {
  title:       "นโยบายความเป็นส่วนตัว — InvestMart",
  description: "InvestMart เก็บข้อมูลอะไรบ้าง ใช้อย่างไร และสิทธิ์ของผู้ใช้",
};

// Show draft notice in non-production environments.
// NEXT_PUBLIC_VERCEL_ENV is set automatically by Vercel ("production" | "preview" | "development").
const IS_PRODUCTION = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

export default function PrivacyPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">

        {!IS_PRODUCTION && (
          <div className="rounded border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700 p-3 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            <strong>ฉบับร่าง — ยังไม่เสร็จสมบูรณ์</strong>
            {" "}เอกสารนี้เป็นฉบับร่างที่ยังต้องได้รับการทบทวนโดยเจ้าของแพลตฟอร์ม
            (และอาจปรึกษาผู้เชี่ยวชาญด้านกฎหมาย) ก่อนเผยแพร่สู่สาธารณะ
            ห้ามนำไปใช้เป็นเอกสารกฎหมายจนกว่าจะผ่านการตรวจสอบ
          </div>
        )}

        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest mb-1">นโยบายความเป็นส่วนตัว</h1>
          <p className="text-xs text-[#8A8378]">ปรับปรุงล่าสุด: มิถุนายน 2025 · InvestMart</p>
        </div>

        <p className="text-xs text-[#8A8378] leading-relaxed">
          InvestMart เป็นแพลตฟอร์มจำลองการลงทุนและเรียนรู้ เราเขียนนโยบายนี้ให้ตรงไปตรงมา
          ไม่มีวาระซ่อนเร้น บอกให้ครบว่าเก็บอะไร ทำไม และคุณมีสิทธิ์อะไรบ้าง
        </p>

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-widest">1. ข้อมูลที่เราเก็บ</h2>
          <div className="flex flex-col gap-2 text-xs">
            {([
              ["ข้อมูลบัญชี", "อีเมล ชื่อ username และรหัสผ่านที่เข้ารหัส (bcrypt) ที่คุณให้มาตอนสมัคร"],
              ["ข้อมูลการใช้งาน", "โพสต์ คอมเมนต์ การ like/bookmark ประวัติเทรดจำลอง และ watchlist ที่คุณสร้าง"],
              ["ข้อมูลเซสชัน", "Cookie สำหรับจดจำการเข้าสู่ระบบ (httpOnly, Secure, มีอายุ)"],
              ["โหมด Demo", "Cookie ชั่วคราวที่ไม่ผูกกับบัญชีจริง ไม่มีข้อมูลส่วนบุคคล"],
              ["ไม่เก็บ", "ข้อมูลการเงินจริง หมายเลขบัตร ข้อมูลการชำระเงิน หรือข้อมูลพาสปอร์ต/บัตรประชาชน"],
            ] as const).map(([label, desc]) => (
              <div key={label} className="flex gap-2">
                <span className="text-[#5B8A2A] font-bold flex-shrink-0">·</span>
                <span><strong>{label}:</strong> {desc}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-widest">2. วิธีที่เราใช้ข้อมูล</h2>
          <ul className="flex flex-col gap-1.5 text-xs">
            {([
              "แสดงพอร์ตจำลอง ประวัติเทรด และ watchlist ของคุณ",
              "แสดง leaderboard และโปรไฟล์สาธารณะ (username, โพสต์, สถิติพอร์ตที่คุณเลือกเปิดเผย)",
              "ส่งข้อมูลหุ้นสาธารณะ (ไม่มีข้อมูลส่วนตัวของคุณ) ไปยัง API ของ AI เพื่อสร้างการวิเคราะห์",
              "แจ้งเตือนเมื่อราคาหุ้นใน watchlist ถึงระดับที่ตั้งไว้",
              "ไม่ขายข้อมูลส่วนบุคคล ไม่ใช้ข้อมูลเพื่อโฆษณา",
            ] as const).map((line) => (
              <li key={line} className="flex gap-2 items-start">
                <span className="text-[#5B8A2A] flex-shrink-0">·</span>
                <span className="leading-relaxed text-[#8A8378]">{line}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-widest">3. บริการและบุคคลที่สาม</h2>
          <p className="text-xs text-[#8A8378] mb-1">
            InvestMart ใช้บริการภายนอกเหล่านี้ ซึ่งมีนโยบายความเป็นส่วนตัวของตัวเอง
          </p>
          <div className="flex flex-col gap-1.5 text-xs">
            {([
              ["Finnhub", "ข้อมูลหุ้นสหรัฐและข่าว ดึงจาก server เท่านั้น ไม่ส่ง IP ของคุณโดยตรง"],
              ["Groq / Google Gemini", "รับเฉพาะ prompt ที่ประกอบด้วยข้อมูลหุ้นสาธารณะ ไม่มีข้อมูลส่วนตัวของคุณ"],
              ["Vercel", "โฮสต์เว็บและ serverless functions อาจเก็บ access log มาตรฐาน (IP, path, timestamp)"],
              ["Neon Postgres", "ฐานข้อมูล cloud ที่ใช้เก็บข้อมูลบัญชีและการใช้งาน"],
            ] as const).map(([provider, desc]) => (
              <div key={provider} className="flex gap-2">
                <span className="font-bold text-[#1F1A14] dark:text-slate-200 flex-shrink-0 w-36">{provider}</span>
                <span className="text-[#8A8378]">{desc}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-widest">4. สิทธิ์ของคุณ</h2>
          <ul className="flex flex-col gap-1.5 text-xs">
            {([
              "ขอดูข้อมูลที่เราเก็บเกี่ยวกับคุณ",
              "ขอแก้ไขข้อมูลที่ไม่ถูกต้อง",
              "ขอลบบัญชีและข้อมูลทั้งหมด (ติดต่อผ่านโพสต์หรืออีเมลผู้ดูแล)",
              "เลือกว่าจะแสดงข้อมูลพอร์ตสาธารณะหรือไม่",
            ] as const).map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-[#5B8A2A] flex-shrink-0">·</span>
                <span className="text-[#8A8378] leading-relaxed">{line}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-widest">5. ความปลอดภัย</h2>
          <ul className="flex flex-col gap-1.5 text-xs">
            {([
              "HTTPS ทุก request ข้อมูลส่งเข้ารหัสระหว่างเบราว์เซอร์และ server ตลอดเวลา",
              "รหัสผ่านเก็บในรูป hash (bcrypt) ไม่มีใครรู้รหัสผ่านจริงของคุณ รวมถึงทีม",
              "API keys ทั้งหมดอยู่ server-side เท่านั้น ไม่ถูกส่งไปยัง browser",
              "ราคาหุ้นสำหรับเทรดดึงจาก server เสมอ ไม่รับราคาจาก client เพื่อป้องกันการปลอมแปลง",
            ] as const).map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-[#5B8A2A] flex-shrink-0">·</span>
                <span className="text-[#8A8378] leading-relaxed">{line}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-widest">6. การเปลี่ยนแปลงนโยบาย</h2>
          <p className="text-xs text-[#8A8378] leading-relaxed">
            หากมีการเปลี่ยนแปลงสำคัญ เราจะแจ้งใน feed หรืออีเมล วันที่ปรับปรุงจะแสดงที่ด้านบน
            การใช้งานต่อเนื่องถือว่ายอมรับนโยบายล่าสุด
          </p>
        </Card>

        <div className="flex flex-wrap gap-4 text-xs pt-2 border-t border-[#E8E2D4]">
          <Link href="/terms"  className="text-[#5B8A2A] hover:underline">ข้อกำหนดการใช้งาน</Link>
          <Link href="/about"  className="text-[#5B8A2A] hover:underline">เกี่ยวกับ InvestMart</Link>
          <Link href="/faq"    className="text-[#5B8A2A] hover:underline">คำถามที่พบบ่อย</Link>
          <Link href="/"       className="text-[#8A8378] hover:underline">กลับหน้าหลัก</Link>
        </div>
      </div>
    </AppShell>
  );
}
