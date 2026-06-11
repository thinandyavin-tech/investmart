"use client";

import { AppShell } from "@/components/AppShell";
import { Card }     from "@/components/Card";
import { Link }     from "@/i18n/navigation";
import { useI18n }  from "@/lib/i18n";

const UPDATED = "June 2025";

export default function TermsPage() {
  const { lang } = useI18n();
  const isEn     = lang === "en";

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">

        {/* Legal review notice — always visible */}
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 leading-relaxed">
          {isEn ? (
            <><strong>Template — not legal advice.</strong> This is a starter document. Because InvestMart handles user accounts and Google profile data for users in Thailand, it must be reviewed and adapted against Thailand's PDPA (Personal Data Protection Act) and any other applicable laws before public launch. Do not rely on this document without legal review.</>
          ) : (
            <><strong>ฉบับร่าง — ไม่ใช่คำแนะนำทางกฎหมาย</strong> เอกสารนี้เป็นต้นแบบสำหรับเริ่มต้น เนื่องจาก InvestMart เก็บบัญชีผู้ใช้และข้อมูลโปรไฟล์ Google ของผู้ใช้ในไทย จึงต้องผ่านการทบทวนและปรับแก้ให้สอดคล้องกับ PDPA (พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล) และกฎหมายที่เกี่ยวข้องก่อนเผยแพร่สู่สาธารณะ</>
          )}
        </div>

        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest mb-1">
            {isEn ? "Terms of Service" : "ข้อกำหนดการใช้งาน"}
          </h1>
          <p className="text-xs text-[#8A8378]">
            {isEn ? `Last updated: ${UPDATED} · InvestMart` : `ปรับปรุงล่าสุด: มิถุนายน 2568 · InvestMart`}
          </p>
        </div>

        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">
            {isEn ? "1. What InvestMart Is" : "1. InvestMart คืออะไร"}
          </h2>
          <p className="text-xs leading-relaxed">
            {isEn
              ? "InvestMart is an educational paper-trading simulator. All trades use simulated money — no real currency is involved. Prices are sourced from third-party APIs (Finnhub, TradingView) and may be delayed. InvestMart is not a licensed broker, investment adviser, or financial institution. Nothing on this platform constitutes investment advice."
              : "InvestMart เป็นแพลตฟอร์มจำลองการซื้อขายหุ้นเพื่อการศึกษา การซื้อขายทั้งหมดใช้เงินจำลอง ไม่มีเงินจริงเข้ามาเกี่ยวข้อง ราคาหุ้นมาจาก API บุคคลที่สาม (Finnhub, TradingView) และอาจมีความล่าช้า InvestMart ไม่ใช่บริษัทหลักทรัพย์ ที่ปรึกษาการลงทุน หรือสถาบันการเงิน ข้อมูลทั้งหมดมีวัตถุประสงค์เพื่อการศึกษาเท่านั้น"
            }
          </p>
        </Card>

        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">
            {isEn ? "2. Accounts & Guest Access" : "2. บัญชีผู้ใช้และการเข้าใช้แบบแขก"}
          </h2>
          <p className="text-xs leading-relaxed">
            {isEn
              ? "You may sign in with Google or create a password account. Guest users are assigned a unique browser-based ID stored in localStorage and a cookie; guest data is tied to that browser — clearing browser data or switching browsers/devices loses your progress. You are responsible for maintaining the security of your credentials."
              : "คุณสามารถเข้าสู่ระบบด้วย Google หรือสร้างบัญชีด้วยรหัสผ่าน ผู้ใช้แขกจะได้รับ ID เฉพาะที่เก็บใน localStorage และ cookie ของเบราว์เซอร์ ข้อมูลแขกผูกกับเบราว์เซอร์นั้น การล้างข้อมูลเบราว์เซอร์หรือเปลี่ยนอุปกรณ์จะสูญเสียความคืบหน้า คุณรับผิดชอบในการรักษาความปลอดภัยของข้อมูลรับรองของคุณ"
            }
          </p>
        </Card>

        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">
            {isEn ? "3. Data Collected" : "3. ข้อมูลที่เก็บรวบรวม"}
          </h2>
          <p className="text-xs leading-relaxed">
            {isEn
              ? "For Google sign-in: name, email address, and profile picture from your Google account. For password accounts: email and hashed password. For all users: portfolio data, trade history, posts, and usage activity. For guest users: a randomly generated UUID stored locally."
              : "สำหรับการเข้าสู่ระบบด้วย Google: ชื่อ อีเมล และรูปโปรไฟล์จากบัญชี Google สำหรับบัญชีรหัสผ่าน: อีเมลและรหัสผ่านที่เข้ารหัส สำหรับผู้ใช้ทุกคน: ข้อมูลพอร์ต ประวัติการซื้อขาย โพสต์ และกิจกรรมการใช้งาน สำหรับผู้ใช้แขก: UUID ที่สร้างแบบสุ่มเก็บในเบราว์เซอร์"
            }
          </p>
        </Card>

        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">
            {isEn ? "4. Third-Party Data Sources" : "4. แหล่งข้อมูลจากบุคคลที่สาม"}
          </h2>
          <p className="text-xs leading-relaxed">
            {isEn
              ? "InvestMart uses Finnhub API, TradingView widgets, Stooq, and AI services (Groq/Gemini) to provide market data, charts, and analysis. These services have their own terms of service. Data is used for display and educational purposes only."
              : "InvestMart ใช้ Finnhub API, TradingView widgets, Stooq และบริการ AI (Groq/Gemini) เพื่อให้ข้อมูลตลาด กราฟ และการวิเคราะห์ บริการเหล่านี้มีข้อกำหนดการใช้งานของตนเอง ข้อมูลถูกใช้เพื่อการแสดงผลและการศึกษาเท่านั้น"
            }
          </p>
        </Card>

        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">
            {isEn ? "5. User Responsibilities" : "5. ความรับผิดชอบของผู้ใช้"}
          </h2>
          <p className="text-xs leading-relaxed">
            {isEn
              ? "You agree not to post content that is illegal, harmful, or misleading. Do not attempt to reverse-engineer, scrape, or misuse the platform. You accept that simulated returns do not predict real-world investment performance."
              : "คุณตกลงที่จะไม่โพสต์เนื้อหาที่ผิดกฎหมาย เป็นอันตราย หรือเป็นเท็จ ห้ามพยายาม reverse-engineer, scrape หรือใช้แพลตฟอร์มในทางที่ผิด คุณยอมรับว่าผลตอบแทนจำลองไม่สามารถทำนายผลการลงทุนจริงได้"
            }
          </p>
        </Card>

        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">
            {isEn ? "6. Limitation of Liability" : "6. การจำกัดความรับผิด"}
          </h2>
          <p className="text-xs leading-relaxed">
            {isEn
              ? "InvestMart is provided \"as is\" without warranties of any kind. We are not liable for any losses (financial or otherwise) arising from use of the platform, reliance on AI analysis, or third-party data. The platform may be unavailable at any time without notice."
              : "InvestMart ให้บริการ \"ตามสภาพที่เป็น\" โดยไม่มีการรับประกันใดๆ เราไม่รับผิดชอบต่อความเสียหายใดๆ (ทางการเงินหรืออื่นๆ) ที่เกิดจากการใช้แพลตฟอร์ม การพึ่งพาการวิเคราะห์ AI หรือข้อมูลบุคคลที่สาม แพลตฟอร์มอาจไม่พร้อมใช้งานได้ทุกเมื่อโดยไม่แจ้งล่วงหน้า"
            }
          </p>
        </Card>

        <Card className="p-3 text-xs text-[#8A8378] leading-relaxed">
          {isEn
            ? "Questions? Contact us at the project repository or through the community chat."
            : "คำถาม? ติดต่อเราผ่าน repository ของโครงการหรือผ่านชุมชนแชท"
          }
        </Card>

        <div className="flex gap-4 text-xs text-[#8A8378] pt-1 border-t border-[#E8E2D4]">
          <Link href="/privacy" className="hover:underline">
            {isEn ? "Privacy Policy" : "นโยบายความเป็นส่วนตัว"}
          </Link>
          <Link href="/" className="hover:underline">
            {isEn ? "← Home" : "← กลับหน้าหลัก"}
          </Link>
        </div>

      </div>
    </AppShell>
  );
}
