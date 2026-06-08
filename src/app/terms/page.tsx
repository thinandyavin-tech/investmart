import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";

export const metadata: Metadata = {
  title:       "ข้อกำหนดการใช้งาน — InvestMart",
  description: "เงื่อนไขการใช้งาน InvestMart แพลตฟอร์มจำลองการลงทุนเพื่อการศึกษา",
};

const IS_PRODUCTION = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

export default function TermsPage() {
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
          <h1 className="text-sm font-bold uppercase tracking-widest mb-1">ข้อกำหนดการใช้งาน</h1>
          <p className="text-xs text-[#8A8378]">ปรับปรุงล่าสุด: มิถุนายน 2025 · InvestMart</p>
        </div>

        <Card className="p-3 border-l-4" style={{ borderLeftColor: "#DC2626" }}>
          <p className="text-xs font-bold text-[#DC2626] leading-relaxed">
            InvestMart ไม่ใช่บริษัทหลักทรัพย์ ไม่ได้รับใบอนุญาตทางการเงิน
            และไม่ได้ให้บริการซื้อขายหุ้นจริง การซื้อขายทั้งหมดเป็นการจำลองเพื่อการศึกษาเท่านั้น
          </p>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="text-xs font-bold">§1 — ลักษณะของบริการ</h2>
          <p className="text-xs text-[#8A8378] leading-relaxed">
            InvestMart เป็นแพลตฟอร์มออนไลน์สำหรับ (1) จำลองการซื้อขายหุ้นด้วยเงินสมมติ
            (2) เรียนรู้แนวคิดการลงทุน และ (3) แลกเปลี่ยนความคิดเห็นในชุมชนนักเรียนรู้
            ไม่มีการโอนเงินจริง ไม่มีการซื้อหรือขายหุ้นในตลาดจริง และไม่มีการถือครองทรัพย์สินในชื่อผู้ใช้
          </p>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="text-xs font-bold">§2 — ไม่ใช่คำแนะนำทางการเงิน</h2>
          <p className="text-xs text-[#8A8378] leading-relaxed">
            เนื้อหาทุกอย่างบนแพลตฟอร์ม ไม่ว่าจะเป็นการวิเคราะห์ AI เรดาร์ โพสต์จากผู้ใช้ หรือข้อมูลสถิติ
            มีวัตถุประสงค์เพื่อการศึกษาและการฝึกฝนเท่านั้น ไม่ถือเป็นคำแนะนำในการซื้อหรือขายหลักทรัพย์
            ผลการเทรดจำลองไม่สะท้อนผลที่จะเกิดขึ้นจริงในตลาด
          </p>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="text-xs font-bold">§3 — ความถูกต้องของข้อมูล</h2>
          <p className="text-xs text-[#8A8378] leading-relaxed">
            ราคาหุ้นและข้อมูลตลาดดึงมาจากบริการข้อมูลภายนอก อาจมีความล่าช้าหรือข้อผิดพลาด
            InvestMart ไม่รับประกันความถูกต้อง ครบถ้วน หรือความทันเวลาของข้อมูลใด ๆ
            ผู้ใช้รับทราบว่าข้อมูลนี้อาจแตกต่างจากราคาจริงในตลาด
          </p>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="text-xs font-bold">§4 — การใช้งานที่ยอมรับได้</h2>
          <p className="text-xs text-[#8A8378] mb-1">ผู้ใช้ตกลงจะไม่กระทำสิ่งต่อไปนี้</p>
          <ul className="flex flex-col gap-1 text-xs">
            {([
              "โพสต์เนื้อหาที่ผิดกฎหมาย หมิ่นประมาท ยั่วยุความรุนแรง หรือสร้างความเกลียดชัง",
              "ปลอมตัวเป็นบุคคลอื่น หรือสร้างบัญชีปลอมเพื่อหลบเลี่ยงการระงับบัญชี",
              "พยายามเจาะระบบ แก้ไขข้อมูลพอร์ต หรือรบกวนบริการไม่ว่าด้วยวิธีใด",
              "ใช้บอท script หรือการ automation โดยไม่ได้รับอนุญาตเพื่อ scrape ข้อมูล",
              "แพร่กระจายข้อมูลเท็จที่อาจทำให้ผู้อื่นเข้าใจผิดเรื่องการลงทุน",
            ] as const).map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-[#DC2626] flex-shrink-0">·</span>
                <span className="text-[#8A8378] leading-relaxed">{line}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="text-xs font-bold">§5 — เนื้อหาของผู้ใช้</h2>
          <p className="text-xs text-[#8A8378] leading-relaxed">
            คุณเป็นเจ้าของเนื้อหาที่คุณโพสต์ แต่ให้ InvestMart แสดงเนื้อหานั้นบนแพลตฟอร์มได้
            เราขอสงวนสิทธิ์ลบหรือซ่อนเนื้อหาที่ละเมิดข้อกำหนด หรือที่ผู้ดูแลพิจารณาว่าเป็นอันตราย
            โดยไม่ต้องแจ้งล่วงหน้าและไม่จำเป็นต้องอธิบายเหตุผล
          </p>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="text-xs font-bold">§6 — ข้อจำกัดความรับผิด</h2>
          <p className="text-xs text-[#8A8378] leading-relaxed">
            InvestMart และผู้ดูแลระบบไม่รับผิดชอบต่อความสูญเสียทางการเงินใด ๆ ที่อาจเกิดจาก
            การนำข้อมูล การวิเคราะห์ หรือแนวคิดจากแพลตฟอร์มไปใช้ในการลงทุนจริง
            บริการนี้ให้บริการ "ตามสภาพ" (as-is) โดยไม่มีการรับประกันใด ๆ
          </p>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="text-xs font-bold">§7 — บัญชีและการระงับ</h2>
          <p className="text-xs text-[#8A8378] leading-relaxed">
            เราขอสงวนสิทธิ์ระงับหรือลบบัญชีที่ละเมิดข้อกำหนด ข้อมูลในบัญชีที่ถูกระงับอาจถูกลบหลังระยะเวลาที่กำหนด
            คุณสามารถขอลบบัญชีของตัวเองได้ตลอดเวลาผ่านช่องทางติดต่อที่ระบุใน นโยบายความเป็นส่วนตัว
          </p>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="text-xs font-bold">§8 — การเปลี่ยนแปลงบริการ</h2>
          <p className="text-xs text-[#8A8378] leading-relaxed">
            เราขอสงวนสิทธิ์เปลี่ยนแปลง ระงับ หรือปิดบริการได้ตลอดเวลา การเปลี่ยนแปลงสำคัญ
            จะแจ้งผ่าน feed หรืออีเมลล่วงหน้าเท่าที่สามารถทำได้
          </p>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="text-xs font-bold">§9 — กฎหมายที่ใช้บังคับ</h2>
          <p className="text-xs text-[#8A8378] leading-relaxed">
            ข้อพิพาทที่เกิดจากการใช้งานแพลตฟอร์มนี้อยู่ภายใต้กฎหมายของประเทศไทย
            ทั้งนี้ขึ้นอยู่กับการทบทวนโดยผู้เชี่ยวชาญด้านกฎหมายก่อนบังคับใช้จริง
          </p>
        </Card>

        <div className="flex flex-wrap gap-4 text-xs pt-2 border-t border-[#E8E2D4]">
          <Link href="/privacy" className="text-[#5B8A2A] hover:underline">นโยบายความเป็นส่วนตัว</Link>
          <Link href="/faq"     className="text-[#5B8A2A] hover:underline">คำถามที่พบบ่อย</Link>
          <Link href="/about"   className="text-[#5B8A2A] hover:underline">เกี่ยวกับ InvestMart</Link>
          <Link href="/"        className="text-[#8A8378] hover:underline">กลับหน้าหลัก</Link>
        </div>
      </div>
    </AppShell>
  );
}
