"use client";

import { AppShell } from "@/components/AppShell";
import { Card }     from "@/components/Card";
import { Link }     from "@/i18n/navigation";
import { useI18n }  from "@/lib/i18n";

const UPDATED = "June 2025";

export default function PrivacyPage() {
  const { lang } = useI18n();
  const isEn     = lang === "en";

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">

        <div className="rounded border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700 p-3 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          {isEn ? (
            <><strong>Template — not legal advice.</strong> Must be reviewed against Thailand&apos;s PDPA and applicable laws before public launch.</>
          ) : (
            <><strong>ฉบับร่าง — ไม่ใช่คำแนะนำทางกฎหมาย</strong> ต้องทบทวนให้สอดคล้องกับ PDPA และกฎหมายที่เกี่ยวข้องก่อนเผยแพร่</>
          )}
        </div>

        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest mb-1">
            {isEn ? "Privacy Policy" : "นโยบายความเป็นส่วนตัว"}
          </h1>
          <p className="text-xs text-[#8A8378]">
            {isEn ? `Last updated: ${UPDATED} · InvestMart` : `ปรับปรุงล่าสุด: มิถุนายน 2568 · InvestMart`}
          </p>
        </div>

        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">
            {isEn ? "1. Data We Collect" : "1. ข้อมูลที่เราเก็บ"}
          </h2>
          <ul className="flex flex-col gap-1.5 text-xs leading-relaxed list-disc list-inside">
            {isEn ? (
              <>
                <li><strong>Google sign-in:</strong> name, email, profile photo</li>
                <li><strong>Password accounts:</strong> email, bcrypt-hashed password (never plaintext)</li>
                <li><strong>Guest users:</strong> UUID generated in your browser — no name or email</li>
                <li><strong>Usage data:</strong> simulated trades, portfolio, posts, watchlist</li>
                <li><strong>Cookies:</strong> HTTP-only session cookie; localStorage for theme/language</li>
              </>
            ) : (
              <>
                <li><strong>Google:</strong> ชื่อ อีเมล รูปโปรไฟล์</li>
                <li><strong>รหัสผ่าน:</strong> อีเมล รหัสผ่าน bcrypt (ไม่เก็บข้อความธรรมดา)</li>
                <li><strong>แขก:</strong> UUID ในเบราว์เซอร์ ไม่มีชื่อหรืออีเมล</li>
                <li><strong>การใช้งาน:</strong> การซื้อขายจำลอง พอร์ต โพสต์ watchlist</li>
                <li><strong>คุกกี้:</strong> คุกกี้เซสชัน HTTP-only; localStorage สำหรับธีม/ภาษา</li>
              </>
            )}
          </ul>
        </Card>

        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">
            {isEn ? "2. How We Use Data" : "2. วิธีที่เราใช้ข้อมูล"}
          </h2>
          <p className="text-xs leading-relaxed">
            {isEn
              ? "Data is used solely to operate InvestMart: authenticate you, persist your portfolio, and display community posts. We do not sell data or use it for advertising. Third-party processors: Neon (database), Vercel (hosting), Sentry (error monitoring)."
              : "ข้อมูลใช้เพื่อดำเนินงาน InvestMart เท่านั้น: ยืนยันตัวตน บันทึกพอร์ต และแสดงโพสต์ เราไม่ขายข้อมูลหรือใช้เพื่อโฆษณา ผู้ประมวลผลบุคคลที่สาม: Neon (ฐานข้อมูล), Vercel (hosting), Sentry (ตรวจสอบข้อผิดพลาด)"
            }
          </p>
        </Card>

        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">
            {isEn ? "3. Cookies & Storage" : "3. คุกกี้และที่เก็บข้อมูล"}
          </h2>
          <p className="text-xs leading-relaxed">
            {isEn
              ? "Only essential cookies: (1) HTTP-only session cookie for authentication, (2) localStorage for theme and language preference. No advertising or cross-site tracking."
              : "เฉพาะคุกกี้ที่จำเป็น: (1) คุกกี้เซสชัน HTTP-only สำหรับการยืนยันตัวตน (2) localStorage สำหรับธีมและภาษา ไม่มีโฆษณาหรือการติดตามข้ามไซต์"
            }
          </p>
        </Card>

        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">
            {isEn ? "4. Your Rights (PDPA)" : "4. สิทธิของคุณ (PDPA)"}
          </h2>
          <p className="text-xs leading-relaxed">
            {isEn
              ? "Under Thailand's PDPA you have the right to access, correct, delete, or port your personal data. Contact us via the community or project repository. This section is a template — adapt it with legal counsel before launch."
              : "ภายใต้ PDPA คุณมีสิทธิ์เข้าถึง แก้ไข ลบ หรือส่งออกข้อมูลส่วนบุคคล ติดต่อผ่านชุมชนหรือ repository ส่วนนี้เป็นต้นแบบ ต้องปรับแก้กับที่ปรึกษากฎหมายก่อนเปิดตัว"
            }
          </p>
        </Card>

        <div className="flex gap-4 text-xs text-[#8A8378] pt-1 border-t border-[#E8E2D4]">
          <Link href="/terms" className="hover:underline">
            {isEn ? "Terms of Service" : "ข้อกำหนดการใช้งาน"}
          </Link>
          <Link href="/" className="hover:underline">
            {isEn ? "← Home" : "← กลับหน้าหลัก"}
          </Link>
        </div>

      </div>
    </AppShell>
  );
}
