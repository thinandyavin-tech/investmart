"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { OffsetButton } from "@/components/OffsetButton";

interface WhyMovingCardProps {
  ticker: string;
}

export function WhyMovingCard({ ticker }: WhyMovingCardProps) {
  const [reason, setReason]   = useState("");
  const [loading, setLoading] = useState(false);
  const [shown, setShown]     = useState(false);
  const [error, setError]     = useState("");

  async function load() {
    if (shown) { setShown(false); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/stock/whymoving?symbol=${encodeURIComponent(ticker)}`);
      const data = (await res.json()) as { reason?: string; error?: string };
      if (!res.ok || !data.reason) {
        setError("ไม่สามารถโหลดข้อมูลได้");
      } else {
        setReason(data.reason);
        setShown(true);
      }
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <OffsetButton
        variant="black"
        size="sm"
        onClick={() => void load()}
        className="text-xs"
      >
        {loading ? "กำลังวิเคราะห์..." : shown ? "▲ ซ่อน" : "▶ ทำไมราคาถึงเปลี่ยน?"}
      </OffsetButton>

      {error && (
        <p className="text-xs text-[#DC2626]">{error}</p>
      )}

      {shown && reason && (
        <Card className="p-3 border-l-4" style={{ borderLeftColor: "#5B8A2A" }}>
          <p className="text-xs text-[#8A8378] leading-relaxed mb-1 uppercase tracking-widest font-bold">
            AI วิเคราะห์
          </p>
          <p className="text-xs leading-relaxed">{reason}</p>
        </Card>
      )}
    </div>
  );
}
