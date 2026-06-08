"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/Card";
import { OffsetButton } from "@/components/OffsetButton";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { useUser } from "@/lib/userContext";

const CURRENCIES = ["THB", "USD", "EUR", "GBP", "JPY"] as const;
type Currency = (typeof CURRENCIES)[number];

export function ExchangeClient() {
  const { user, loading: userLoading, refreshUser } = useUser();

  const [fromCurrency, setFromCurrency] = useState<Currency>("THB");
  const [toCurrency, setToCurrency]     = useState<Currency>("USD");
  const [amount, setAmount]             = useState("10000");
  const [rates, setRates]               = useState<Record<string, number>>({});
  const [source, setSource]             = useState("");
  const [loading, setLoading]           = useState(true);
  const [exchanging, setExchanging]         = useState(false);
  const [msg, setMsg]                       = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    async function loadRates() {
      setLoading(true);
      try {
        const res  = await fetch("/api/fx");
        const data = (await res.json()) as { rates: Record<string, number>; source: string };
        setRates(data.rates ?? {});
        setSource(data.source ?? "");
      } finally {
        setLoading(false);
      }
    }
    void loadRates();
  }, []);

  function getRate(from: Currency, to: Currency): number {
    if (from === to) return 1;
    const fromUsd = from === "USD" ? 1 : 1 / (rates[`USD${from}`] ?? 1);
    const toUsd   = to   === "USD" ? 1 : (rates[`USD${to}`]   ?? 1);
    return fromUsd * toUsd;
  }

  const rate   = getRate(fromCurrency, toCurrency);
  const result = (parseFloat(amount) || 0) * rate;

  async function executeExchange() {
    if (!user) { setShowLoginPrompt(true); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setMsg("กรุณากรอกจำนวนเงิน"); return; }
    if (!["THB", "USD"].includes(fromCurrency)) {
      setMsg("รองรับเฉพาะ THB และ USD ในการแลกเปลี่ยนจากพอร์ต"); return;
    }
    if (!["THB", "USD"].includes(toCurrency)) {
      setMsg("รองรับเฉพาะ THB และ USD ในการรับ"); return;
    }
    setExchanging(true); setMsg("");
    try {
      const res  = await fetch("/api/exchange", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ fromCurrency, toCurrency, amount: amt, rate }),
      });
      const data = (await res.json()) as { error?: string; cashThb?: number; cashUsd?: number };
      if (!res.ok) { setMsg(data.error ?? "เกิดข้อผิดพลาด"); }
      else {
        setMsg(`แลกเปลี่ยนสำเร็จ ✓ · THB: ฿${(data.cashThb ?? 0).toLocaleString()} · USD: $${(data.cashUsd ?? 0).toFixed(2)}`);
        await refreshUser();
      }
    } catch { setMsg("เกิดข้อผิดพลาด"); }
    finally { setExchanging(false); }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      {showLoginPrompt && (
        <LoginPromptModal
          message="เข้าสู่ระบบเพื่อแลกเปลี่ยนเงินในพอร์ตจำลอง · เริ่มต้นด้วย ฿1,250,000"
          onClose={() => setShowLoginPrompt(false)}
        />
      )}
      <h1 className="text-xs font-bold uppercase tracking-widest mb-1">แลกเปลี่ยนเงิน · Exchange</h1>
      <p className="text-xs text-[#8A8378] mb-4">
        อัตราโดยประมาณ · แหล่งข้อมูล: <span className="font-bold">{source || "..."}</span>
      </p>

      {/* Current balances */}
      {user && (
        <div className="flex gap-2 mb-3">
          <Card className="p-2 flex-1 text-center">
            <div className="text-xs text-[#8A8378] uppercase tracking-wide">THB</div>
            <div className="text-xs font-bold" style={{ fontFamily: "var(--font-mono)" }}>
              ฿{user.cashThb.toLocaleString("th-TH")}
            </div>
          </Card>
          <Card className="p-2 flex-1 text-center">
            <div className="text-xs text-[#8A8378] uppercase tracking-wide">USD</div>
            <div className="text-xs font-bold" style={{ fontFamily: "var(--font-mono)" }}>
              ${user.cashUsd.toFixed(2)}
            </div>
          </Card>
        </div>
      )}

      <Card className="p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-[#8A8378] uppercase tracking-wide block mb-1" htmlFor="from-amount">
              จำนวน
            </label>
            <input
              id="from-amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-[#1F1A14] bg-[#FBF7ED] px-2 py-1.5 text-sm font-bold"
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </div>
          <div>
            <label className="text-xs text-[#8A8378] uppercase tracking-wide block mb-1" htmlFor="from-currency">
              จาก
            </label>
            <select
              id="from-currency"
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value as Currency)}
              className="border border-[#1F1A14] bg-[#FBF7ED] px-2 py-1.5 text-sm font-bold h-full"
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-[#1F1A14]" />
          <button
            onClick={() => { setFromCurrency(toCurrency); setToCurrency(fromCurrency); }}
            className="text-sm px-3 py-1 border border-[#1F1A14] font-bold hover:bg-[#1F1A14] hover:text-white transition-colors"
            aria-label="สลับสกุลเงิน"
          >
            ⇄
          </button>
          <div className="flex-1 h-px bg-[#1F1A14]" />
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <div className="text-xs text-[#8A8378] uppercase tracking-wide mb-1">ผลลัพธ์</div>
            <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-mono)" }}>
              {loading ? "..." : result.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-[#8A8378] mt-0.5">
              1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
            </div>
          </div>
          <div>
            <label className="text-xs text-[#8A8378] uppercase tracking-wide block mb-1" htmlFor="to-currency">
              เป็น
            </label>
            <select
              id="to-currency"
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value as Currency)}
              className="border border-[#1F1A14] bg-[#FBF7ED] px-2 py-1.5 text-sm font-bold"
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {!user && !userLoading ? (
          <OffsetButton variant="lime" className="w-full text-center" onClick={() => setShowLoginPrompt(true)}>
            เข้าสู่ระบบเพื่อแลกเงิน
          </OffsetButton>
        ) : (
          <OffsetButton
            variant="lime"
            className="w-full text-center"
            onClick={executeExchange}
            disabled={exchanging}
          >
            {exchanging ? "กำลังแลกเปลี่ยน..." : "อัพเดทยอดคงเหลือ"}
          </OffsetButton>
        )}

        {msg && (
          <p
            className="text-xs font-bold text-center"
            style={{ color: msg.includes("✓") ? "#5B8A2A" : "#E5484D" }}
          >
            {msg}
          </p>
        )}
        <p className="text-xs text-[#8A8378] text-center">
          อัตราแลกเปลี่ยนโดยประมาณ
        </p>
      </Card>

      {/* Rate table */}
      <Card className="mt-4 overflow-hidden">
        <div className="px-3 py-2 border-b border-[#1F1A14] text-xs font-bold uppercase tracking-wide bg-[#1F1A14] text-[#F3EDE0]">
          อัตราแลกเปลี่ยน (base USD)
        </div>
        {Object.entries(rates)
          .filter(([k]) => k.startsWith("USD") && k !== "USDUSD")
          .slice(0, 8)
          .map(([pair, rate]) => (
            <div key={pair} className="flex justify-between px-3 py-1.5 border-b border-[#E8E2D4] last:border-0 text-xs">
              <span className="text-[#8A8378]">{pair}</span>
              <span className="font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                {(rate as number).toFixed(4)}
              </span>
            </div>
          ))}
      </Card>
    </div>
  );
}
