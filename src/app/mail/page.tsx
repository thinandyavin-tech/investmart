import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";

export const metadata: Metadata = { title: "จดหมาย / แจ้งเตือน" };

export default function MailPage() {
  return (
    <AppShell>
      <div className="p-4 max-w-2xl mx-auto">
        <h1 className="text-xs font-bold uppercase tracking-widest mb-4">จดหมาย / แจ้งเตือน</h1>
        <Card className="p-3 mb-2">
          <div className="flex items-start gap-2">
            <span className="text-xs font-bold bg-[#1F1A14] text-white px-2 py-0.5 flex-shrink-0">SYSTEM</span>
            <div>
              <p className="text-xs font-bold">ยินดีต้อนรับสู่ InvestMart</p>
              <p className="text-[10px] text-[#8A8378]">พอร์ตหุ้นจำลอง · ไม่ใช้เงินจริง · เริ่มต้นด้วยเงิน ฿1,250,000</p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
