import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";

export const metadata: Metadata = { title: "ข้อกำหนดการใช้งาน — InvestMart" };

const SECTIONS = [
  {
    title: "1. ยอมรับข้อกำหนด",
    body: "การใช้ InvestMart แสดงว่าคุณยอมรับข้อกำหนดเหล่านี้ หากไม่ยอมรับ กรุณาหยุดใช้งาน",
  },
  {
    title: "2. ลักษณะของบริการ",
    body: "InvestMart เป็นแพลตฟอร์มจำลองการลงทุนเพื่อการศึกษาเท่านั้น การซื้อขายทั้งหมดเป็นการจำลอง ไม่มีเงินจริงเข้ามาเกี่ยวข้อง มูลค่าพอร์ตและกำไร/ขาดทุนทั้งหมดเป็นตัวเลขสมมติ",
  },
  {
    title: "3. ไม่ใช่คำแนะนำการลงทุน",
    body: "ข้อมูล การวิเคราะห์ AI และเนื้อหาทั้งหมดบนแพลตฟอร์มนี้มีวัตถุประสงค์เพื่อการศึกษาเท่านั้น ไม่ถือเป็นคำแนะนำทางการเงินหรือการลงทุน ราคาหุ้นที่แสดงอาจมีความล่าช้า กรุณาตัดสินใจลงทุนด้วยตัวเองหรือปรึกษาผู้เชี่ยวชาญด้านการเงิน",
  },
  {
    title: "4. การใช้งานที่ยอมรับได้",
    body: "คุณตกลงจะไม่: โพสต์เนื้อหาที่ผิดกฎหมาย หยาบคาย หรือสร้างความเกลียดชัง; ปลอมตัวเป็นบุคคลอื่น; ส่ง spam หรือเนื้อหาเพื่อการโฆษณา; พยายามเจาะระบบหรือดัดแปลงคะแนนพอร์ต; ใช้บอทหรือ automation โดยไม่ได้รับอนุญาต",
  },
  {
    title: "5. เนื้อหาของผู้ใช้",
    body: "คุณเป็นเจ้าของเนื้อหาที่คุณโพสต์ แต่ให้ InvestMart ใช้งานบนแพลตฟอร์มได้ เราขอสงวนสิทธิ์ลบเนื้อหาที่ละเมิดข้อกำหนดโดยไม่ต้องแจ้งล่วงหน้า",
  },
  {
    title: "6. ข้อจำกัดความรับผิด",
    body: "InvestMart ไม่รับผิดชอบต่อการตัดสินใจลงทุนจริงที่อ้างอิงจากข้อมูลในแพลตฟอร์ม ข้อมูลอาจมีความผิดพลาดหรือล่าช้า ใช้เพื่อการศึกษาเท่านั้น",
  },
  {
    title: "7. การเปลี่ยนแปลงบริการ",
    body: "เราขอสงวนสิทธิ์ปรับเปลี่ยน ระงับ หรือยุติบริการได้ตลอดเวลา โดยไม่ต้องแจ้งล่วงหน้า",
  },
  {
    title: "8. กฎหมายที่ใช้บังคับ",
    body: "ข้อพิพาทใดๆ อยู่ภายใต้กฎหมายประเทศไทย",
  },
];

export default function TermsPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest mb-1">ข้อกำหนดการใช้งาน</h1>
          <p className="text-[10px] text-[#8A8378]">มีผลตั้งแต่ มิถุนายน 2025 · InvestMart</p>
        </div>

        <Card className="p-3 border-l-4" style={{ borderLeftColor: "#DC2626" }}>
          <p className="text-[11px] font-bold text-[#DC2626]">
            InvestMart เป็นแพลตฟอร์มจำลอง ไม่ใช่ broker และไม่ได้รับใบอนุญาตการเงิน
            การซื้อขายทั้งหมดเป็นการจำลองเพื่อการศึกษาเท่านั้น
          </p>
        </Card>

        {SECTIONS.map((s) => (
          <Card key={s.title} className="p-4 flex flex-col gap-1.5">
            <h2 className="text-[11px] font-bold">{s.title}</h2>
            <p className="text-[11px] text-[#8A8378] leading-relaxed">{s.body}</p>
          </Card>
        ))}

        <div className="flex gap-4 text-[10px]">
          <Link href="/privacy" className="text-[#5B8A2A] hover:underline">นโยบายความเป็นส่วนตัว</Link>
          <Link href="/about"   className="text-[#5B8A2A] hover:underline">เกี่ยวกับเรา</Link>
          <Link href="/"        className="text-[#8A8378] hover:underline">กลับหน้าหลัก</Link>
        </div>
      </div>
    </AppShell>
  );
}
