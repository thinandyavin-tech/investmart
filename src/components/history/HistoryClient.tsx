"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { useUser } from "@/lib/userContext";

interface Trade {
  id:        string;
  ticker:    string;
  side:      string;
  shares:    number;
  price:     number;
  total:     number;
  currency:  string;
  createdAt: string;
}

export function HistoryClient() {
  const { user } = useUser();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res  = await fetch("/api/user/history");
        const data = (await res.json()) as { trades: Trade[] };
        setTrades(data.trades ?? []);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [user]);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xs font-bold uppercase tracking-widest mb-1">ประวัติซื้อขาย</h1>
      <p className="text-[10px] text-[#8A8378] mb-4">
        รายการซื้อขายทั้งหมด · พอร์ตหุ้นจำลอง ไม่ใช้เงินจริง
      </p>

      {!user && !loading && (
        <Card className="p-4 text-center mb-4 flex flex-col gap-2">
          <p className="text-xs text-[#8A8378]">เข้าสู่ระบบเพื่อดูประวัติการซื้อขาย</p>
          <div className="flex gap-2 justify-center">
            <Link href="/signin">
              <span className="inline-block px-4 py-2 text-xs font-bold bg-[#1F1A14] text-white border-2 border-[#1F1A14]" style={{ boxShadow: "2px 2px 0 #5B8A2A" }}>
                เข้าสู่ระบบ
              </span>
            </Link>
            <Link href="/signup">
              <span className="inline-block px-4 py-2 text-xs font-bold border-2 border-[#5B8A2A] text-[#5B8A2A] hover:bg-[#9BE15D] transition-colors">
                สมัครสมาชิก
              </span>
            </Link>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-xs text-[#8A8378] text-center py-8">กำลังโหลด...</div>
      ) : trades.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-xs text-[#8A8378]">ยังไม่มีประวัติการซื้อขาย</p>
          <p className="text-[10px] text-[#8A8378] mt-1">
            ซื้อหุ้นครั้งแรกจากหน้าเรดาร์เพื่อเริ่มต้น
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#1F1A14] text-[#F3EDE0]">
                {["วันที่", "หุ้น", "ซื้อ/ขาย", "จำนวน", "ราคา", "รวม"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-[9px] uppercase tracking-wide font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="border-b border-[#E8E2D4] last:border-0">
                  <td className="px-3 py-2 text-[9px] text-[#8A8378]">
                    {new Date(t.createdAt).toLocaleDateString("th-TH", {
                      day:   "numeric",
                      month: "short",
                      year:  "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2 font-bold">{t.ticker}</td>
                  <td className="px-3 py-2">
                    <span
                      className="px-1.5 py-0.5 text-[9px] font-bold"
                      style={{
                        background: t.side === "BUY" ? "#3FA34D22" : "#E5484D22",
                        color:      t.side === "BUY" ? "#3FA34D"   : "#E5484D",
                        border:     `1px solid ${t.side === "BUY" ? "#3FA34D" : "#E5484D"}`,
                      }}
                    >
                      {t.side}
                    </span>
                  </td>
                  <td className="px-3 py-2" style={{ fontFamily: "var(--font-mono)" }}>{t.shares}</td>
                  <td className="px-3 py-2" style={{ fontFamily: "var(--font-mono)" }}>${t.price.toFixed(2)}</td>
                  <td className="px-3 py-2 font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                    ${t.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
