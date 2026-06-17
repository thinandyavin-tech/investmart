"use client";

import { useState, useRef } from "react";
import { useRouter }  from "next/navigation";
import { Link }       from "@/i18n/navigation";
import { useI18n }   from "@/lib/i18n";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface GuidedFirstTradeProps {
  onClose:    () => void;
  onComplete: () => void;
}

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;
const SUGGESTED = [
  { ticker: "NVDA", name: "NVIDIA" },
  { ticker: "AAPL", name: "Apple"  },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "TSLA", name: "Tesla" },
  { ticker: "AMZN", name: "Amazon" },
];

type Step = "pick" | "read" | "trade";

export function GuidedFirstTrade({ onClose, onComplete }: GuidedFirstTradeProps) {
  const { lang }   = useI18n();
  const router     = useRouter();
  const isEn = lang === "en";

  const [step,   setStep]   = useState<Step>("pick");
  const [ticker, setTicker] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, onClose);

  function handlePickerSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    if (TICKER_RE.test(t)) { setTicker(t); setStep("read"); }
  }

  function handleSuggested(t: string) {
    setTicker(t); setStep("read");
  }

  function goToRadarWithTicker() {
    router.push(`/radar?ticker=${encodeURIComponent(ticker)}`);
    onClose();
  }

  function goToStockPage() {
    router.push(`/stock/${encodeURIComponent(ticker)}`);
    onClose();
  }

  function goToTrade() {
    // Navigate to radar which has buy/sell modal, pass the ticker
    router.push(`/radar?ticker=${encodeURIComponent(ticker)}&action=trade`);
    onComplete();
    onClose();
  }

  const STEPS: { id: Step; labelEn: string; labelTh: string }[] = [
    { id: "pick",  labelEn: "Pick a stock",     labelTh: "เลือกหุ้น" },
    { id: "read",  labelEn: "Read Martin's take", labelTh: "อ่านมุมมอง Martin" },
    { id: "trade", labelEn: "Place your trade",  labelTh: "วางคำสั่งซื้อขาย" },
  ];
  const currentIdx = STEPS.findIndex(s => s.id === step);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm mx-4 mb-4 lg:mb-0 border-2 border-[#1F1A14] bg-[#faedcd]"
        style={{ boxShadow: "6px 6px 0 #d4a373" }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isEn ? "Guided First Trade" : "เทรดหุ้นจำลองครั้งแรก"}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#8B5CF6]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white">
            {isEn ? "Your First Paper Trade" : "เทรดหุ้นจำลองครั้งแรก"}
          </span>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xs" aria-label="Close">✕</button>
        </div>

        {/* Step indicators */}
        <div className="flex border-b border-[#ccd5ae]">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className="flex-1 text-center py-2 text-[9px] font-bold transition-colors"
              style={{
                color: i <= currentIdx ? "#8B5CF6" : "#8A8378",
                borderBottom: i === currentIdx ? "2px solid #8B5CF6" : "2px solid transparent",
                background: i < currentIdx ? "#faedcd" : undefined,
              }}
            >
              {i < currentIdx ? "✓ " : `${i + 1}. `}
              {isEn ? s.labelEn : s.labelTh}
            </div>
          ))}
        </div>

        <div className="px-4 py-4">
          {/* Step 1: Pick */}
          {step === "pick" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-[#3D3730]">
                {isEn
                  ? "Which stock would you like to analyze and trade?"
                  : "คุณอยากวิเคราะห์และเทรดหุ้นตัวไหน?"}
              </p>
              {/* Suggested */}
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED.map(({ ticker: t, name }) => (
                  <button
                    key={t}
                    onClick={() => handleSuggested(t)}
                    className="px-3 py-1.5 text-xs font-bold border border-[#ccd5ae] bg-[#fefae0] hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition-colors"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {t} <span className="text-[#8A8378] font-normal text-[9px]">{name}</span>
                  </button>
                ))}
              </div>
              {/* Custom search */}
              <form onSubmit={handlePickerSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={ticker}
                  onChange={e => setTicker(e.target.value.toUpperCase())}
                  placeholder={isEn ? "Or type a ticker…" : "หรือพิมพ์ ticker เอง…"}
                  maxLength={10}
                  className="flex-1 border border-[#ccd5ae] bg-[#fefae0] px-3 py-2 text-sm font-bold focus:outline-none focus:border-[#8B5CF6]"
                  style={{ fontFamily: "var(--font-mono)" }}
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] transition-colors"
                >
                  →
                </button>
              </form>
              <p className="text-[9px] text-[#8A8378]">
                {isEn
                  ? "This is paper trading — no real money involved. Pick any US stock."
                  : "นี่คือการเทรดจำลอง ไม่ใช้เงินจริง เลือกหุ้น US ได้เลย"}
              </p>
            </div>
          )}

          {/* Step 2: Read */}
          {step === "read" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-mono)" }}>{ticker}</span>
                <span className="text-xs text-[#8A8378]">
                  {isEn ? "selected" : "ที่เลือก"}
                </span>
              </div>
              <p className="text-xs text-[#3D3730]">
                {isEn
                  ? "Before trading, get Martin's read on what's happening with this stock."
                  : "ก่อนเทรด ลองให้ Martin อ่านสถานการณ์หุ้นตัวนี้ก่อน"}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={goToStockPage}
                  className="flex items-center justify-between px-3 py-2.5 border border-[#ccd5ae] bg-[#fefae0] hover:border-[#8B5CF6] transition-colors text-left"
                >
                  <div>
                    <div className="text-xs font-bold text-[#1A1A1A]">
                      {isEn ? "📊 View stock page + Martin analysis" : "📊 ดูหน้าหุ้น + Martin วิเคราะห์"}
                    </div>
                    <div className="text-[9px] text-[#8A8378]">
                      {isEn ? "Chart, fundamentals, why it's moving" : "กราฟ, ตัวชี้วัด, ว่าเกิดอะไรขึ้น"}
                    </div>
                  </div>
                  <span className="text-[#8B5CF6] text-xs">↗</span>
                </button>
                <Link
                  href={`/chat?q=${encodeURIComponent(`Tell me about ${ticker} — what's the business, is it in a good theme, and what's currently moving the stock?`)}`}
                  onClick={onClose}
                  className="flex items-center justify-between px-3 py-2.5 border border-[#ccd5ae] bg-[#fefae0] hover:border-[#8B5CF6] transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-[#1A1A1A]">
                      {isEn ? "✦ Ask Martin directly" : "✦ ถาม Martin โดยตรง"}
                    </div>
                    <div className="text-[9px] text-[#8A8378]">
                      {isEn ? "Chat with Martin about this stock" : "คุยกับ Martin เรื่องหุ้นตัวนี้"}
                    </div>
                  </div>
                  <span className="text-[#8B5CF6] text-xs">↗</span>
                </Link>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep("pick")}
                  className="flex-1 py-2 text-xs font-bold border border-[#ccd5ae] text-[#8A8378] hover:text-[#1A1A1A] transition-colors"
                >
                  ← {isEn ? "Back" : "กลับ"}
                </button>
                <button
                  onClick={() => setStep("trade")}
                  className="flex-1 py-2 text-xs font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] transition-colors"
                >
                  {isEn ? "I'm ready to trade →" : "พร้อมเทรดแล้ว →"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Trade */}
          {step === "trade" && (
            <div className="flex flex-col gap-3">
              <div className="px-3 py-2.5 bg-[#F0FDF4] border border-[#86EFAC]">
                <p className="text-xs font-bold text-[#16A34A] mb-1">
                  {isEn ? "Ready to place your first paper trade!" : "พร้อมเทรดหุ้นจำลองครั้งแรก!"}
                </p>
                <p className="text-[10px] text-[#166534]">
                  {isEn
                    ? "Paper trades use your simulated THB 1,250,000 balance. No real money is involved."
                    : "การเทรดจำลองใช้ยอดเงิน ฿1,250,000 จำลอง ไม่เกี่ยวกับเงินจริง"}
                </p>
              </div>
              <p className="text-xs text-[#3D3730]">
                {isEn
                  ? `You'll be taken to the Radar where you can buy ${ticker} at the live market price.`
                  : `คุณจะถูกพาไปที่ Radar เพื่อซื้อ ${ticker} ที่ราคาตลาดจริง`}
              </p>
              <ul className="flex flex-col gap-1 text-[10px] text-[#6B6B6B]">
                <li>• {isEn ? "Find the ticker in Radar" : "ค้นหา ticker ใน Radar"}</li>
                <li>• {isEn ? "Click the stock → BUY button" : "คลิกที่หุ้น → ปุ่ม BUY"}</li>
                <li>• {isEn ? "Enter an amount and confirm" : "ใส่จำนวนเงินและยืนยัน"}</li>
              </ul>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep("read")}
                  className="flex-1 py-2 text-xs font-bold border border-[#ccd5ae] text-[#8A8378] hover:text-[#1A1A1A] transition-colors"
                >
                  ← {isEn ? "Back" : "กลับ"}
                </button>
                <button
                  onClick={goToTrade}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-[#1A1A1A] hover:bg-[#333] transition-colors"
                  style={{ boxShadow: "2px 2px 0 #8B5CF6" }}
                >
                  {isEn ? `Go trade ${ticker} →` : `ไปเทรด ${ticker} →`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
