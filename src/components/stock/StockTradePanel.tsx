"use client";

import { useState } from "react";
import { useUser } from "@/lib/userContext";
import { useI18n } from "@/lib/i18n";

interface StockTradePanelProps {
  ticker:       string;
  currentPrice: number | undefined; // undefined = no live price available
}

const FALLBACK_FX = 35.5;

export function StockTradePanel({ ticker, currentPrice }: StockTradePanelProps) {
  const { user, refreshUser } = useUser();
  const { lang } = useI18n();
  const isEn = lang === "en";

  const price = currentPrice ?? 0;
  const hasPrice = price > 0;

  // Tabs
  const [tab, setTab] = useState<"stock" | "options">("stock");

  // Stock order state
  const [dollarMode,  setDollarMode]  = useState(false);
  const [sharesInput, setSharesInput] = useState("");
  const [dollarInput, setDollarInput] = useState("");
  const [orderType,   setOrderType]   = useState<"market" | "limit">("market");
  const [limitInput,  setLimitInput]  = useState("");

  // Options state
  const [optType,      setOptType]      = useState<"CALL" | "PUT">("CALL");
  const [optStrike,    setOptStrike]    = useState("");
  const [optContracts, setOptContracts] = useState("1");
  const [optExpiry,    setOptExpiry]    = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0] ?? "";
  });

  const [trading, setTrading] = useState(false);
  const [msg,     setMsg]     = useState("");

  function calcShares(): number {
    if (dollarMode) {
      const usd = parseFloat(dollarInput);
      return usd > 0 && price > 0 ? usd / price : 0;
    }
    return parseFloat(sharesInput) || 0;
  }

  const sharesCalc  = calcShares();
  const totalUsd    = sharesCalc * (orderType === "limit" ? (parseFloat(limitInput) || price) : price);
  const totalThb    = totalUsd * FALLBACK_FX;

  async function trade(side: "BUY" | "SELL") {
    if (!user) { setMsg(isEn ? "Please sign in to trade" : "กรุณาเข้าสู่ระบบก่อน"); return; }
    if (sharesCalc <= 0) { setMsg(isEn ? "Enter quantity" : "กรอกจำนวน"); return; }
    setTrading(true);
    setMsg("");

    if (orderType === "limit") {
      const lp = parseFloat(limitInput);
      if (!lp || lp <= 0) { setMsg(isEn ? "Enter limit price" : "กรอกราคา Limit"); setTrading(false); return; }
      const res = await fetch("/api/trade/limit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, side, shares: sharesCalc, limitPrice: lp }),
      }).catch(() => null);
      const data = res ? (await res.json() as { error?: string }) : null;
      setMsg(res?.ok ? `✓ Limit ${side} ${sharesCalc.toFixed(2)} @ $${lp.toFixed(2)}` : (data?.error ?? "Error"));
    } else {
      if (!hasPrice) { setMsg(isEn ? "No live price available" : "ไม่มีราคา"); setTrading(false); return; }
      const res = await fetch("/api/trade", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, side, shares: sharesCalc }),
      }).catch(() => null);
      const data = res ? (await res.json() as { error?: string }) : null;
      if (res?.ok) {
        setMsg(`✓ ${side} ${sharesCalc.toFixed(2)} ${ticker} @ $${price.toFixed(2)}`);
        await refreshUser();
      } else {
        setMsg(data?.error ?? "Error");
      }
    }
    setTrading(false);
  }

  async function buyOption() {
    if (!user) { setMsg(isEn ? "Please sign in" : "กรุณาเข้าสู่ระบบ"); return; }
    const strike    = parseFloat(optStrike);
    const contracts = parseInt(optContracts);
    if (!strike || !contracts) { setMsg(isEn ? "Fill in all option fields" : "กรอกข้อมูลให้ครบ"); return; }
    const intrinsic = optType === "CALL" ? Math.max(0, price - strike) : Math.max(0, strike - price);
    const premium   = intrinsic + price * 0.05;
    const totalCost = premium * contracts * 100;
    if (user.cashUsd < totalCost) { setMsg(`เงินไม่พอ (ต้องการ $${totalCost.toFixed(2)})`); return; }
    setTrading(true);
    const res = await fetch("/api/trade/options", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, optionType: optType, strikePrice: strike, expiry: optExpiry, contracts, premium }),
    }).catch(() => null);
    const data = res ? (await res.json() as { error?: string }) : null;
    if (res?.ok) {
      setMsg(`✓ ${optType} ${ticker} Strike $${strike} × ${contracts} contracts ($${totalCost.toFixed(2)})`);
      await refreshUser();
    } else {
      setMsg(data?.error ?? "Error");
    }
    setTrading(false);
  }

  // Option premium preview
  const optStrikeNum  = parseFloat(optStrike) || 0;
  const optContractsN = parseInt(optContracts) || 1;
  const estPremium    = optStrikeNum > 0 && hasPrice
    ? (Math.max(0, optType === "CALL" ? price - optStrikeNum : optStrikeNum - price) + price * 0.05)
    : null;
  const estCost     = estPremium ? estPremium * optContractsN * 100 : null;
  const isItm       = optStrikeNum > 0 && hasPrice && (optType === "CALL" ? price > optStrikeNum : price < optStrikeNum);

  return (
    <div className="rounded-2xl border border-[#ccd5ae] bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#ccd5ae] bg-[#faedcd] flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">
          {isEn ? "Paper Trade" : "ซื้อ/ขาย (จำลอง)"}
        </h3>
        {hasPrice ? (
          <span className="text-sm font-mono font-bold text-slate-900">${price.toFixed(2)}</span>
        ) : (
          <span className="text-xs text-amber-600 font-medium">ไม่มีราคา Finnhub</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#ccd5ae]">
        {(["stock", "options"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
              tab === t ? "bg-[#1F1A14] text-white" : "text-slate-500 hover:bg-[#e9edc9]"
            }`}>
            {t === "stock" ? "📈 Stocks" : "⚡ Options"}
          </button>
        ))}
      </div>

      <div className="p-4 flex flex-col gap-3">
        {tab === "stock" ? (
          <>
            {/* Order type */}
            <div className="flex gap-1.5">
              {(["market", "limit"] as const).map(ot => (
                <button key={ot} onClick={() => setOrderType(ot)}
                  className={`flex-1 py-1 text-[10px] font-bold uppercase rounded-lg border transition-colors ${
                    orderType === ot ? "bg-[#1F1A14] text-white border-[#1F1A14]" : "border-[#ccd5ae] text-slate-500"
                  }`}>
                  {ot === "market" ? (isEn ? "Market" : "Market") : (isEn ? "Limit" : "Limit")}
                </button>
              ))}
            </div>

            {/* Input mode */}
            <div className="flex gap-1.5">
              {([false, true] as const).map(dm => (
                <button key={String(dm)} onClick={() => setDollarMode(dm)}
                  className={`flex-1 py-1 text-[10px] font-bold uppercase rounded-lg border transition-colors ${
                    dollarMode === dm ? "bg-violet-600 text-white border-violet-600" : "border-[#ccd5ae] text-slate-500"
                  }`}>
                  {dm ? "$ Amount" : (isEn ? "# Shares" : "# หุ้น")}
                </button>
              ))}
            </div>

            {/* Quantity input */}
            {dollarMode ? (
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">
                  {isEn ? "Dollar Amount (USD)" : "จำนวนเงิน (USD)"}
                </label>
                <input type="number" inputMode="decimal" placeholder="เช่น 500"
                  value={dollarInput} onChange={e => setDollarInput(e.target.value)}
                  className="w-full border border-[#ccd5ae] rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  style={{ fontFamily: "var(--font-mono)" }} />
                {dollarInput && hasPrice && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    ≈ {(parseFloat(dollarInput) / price).toFixed(3)} {isEn ? "shares" : "หุ้น"}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">
                  {isEn ? "Number of Shares" : "จำนวนหุ้น"}
                </label>
                <input type="number" inputMode="decimal" placeholder="เช่น 10"
                  value={sharesInput} onChange={e => setSharesInput(e.target.value)}
                  className="w-full border border-[#ccd5ae] rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  style={{ fontFamily: "var(--font-mono)" }} />
              </div>
            )}

            {/* Limit price */}
            {orderType === "limit" && (
              <div>
                <label className="text-[10px] text-amber-600 uppercase tracking-wide block mb-1">
                  Limit Price (USD)
                </label>
                <input type="number" inputMode="decimal" placeholder={hasPrice ? price.toFixed(2) : "0.00"}
                  value={limitInput} onChange={e => setLimitInput(e.target.value)}
                  className="w-full border border-amber-300 rounded-xl px-3 py-2 text-sm font-bold bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  style={{ fontFamily: "var(--font-mono)" }} />
              </div>
            )}

            {/* Cost summary */}
            {sharesCalc > 0 && (
              <div className="bg-[#e9edc9] rounded-xl px-3 py-2 text-xs flex justify-between">
                <span className="text-slate-500">{isEn ? "Total" : "รวม"}</span>
                <div className="text-right">
                  <span className="font-bold font-mono">${totalUsd.toFixed(2)}</span>
                  <span className="text-slate-400 ml-1.5">≈ ฿{totalThb.toLocaleString("th-TH", { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            )}

            {/* Cash */}
            {user && (
              <div className="text-xs flex justify-between text-slate-500">
                <span>USD: <span className="font-bold font-mono text-slate-800">${user.cashUsd.toFixed(2)}</span></span>
                <span>THB: <span className="font-bold font-mono text-slate-800">฿{user.cashThb.toLocaleString()}</span></span>
              </div>
            )}

            {/* BUY / SELL */}
            <div className="flex gap-2">
              <button onClick={() => void trade("BUY")} disabled={trading || (!hasPrice && orderType === "market")}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl disabled:opacity-40 transition-colors">
                {trading ? "..." : isEn ? "BUY" : "ซื้อ"}
              </button>
              <button onClick={() => void trade("SELL")} disabled={trading || (!hasPrice && orderType === "market")}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl disabled:opacity-40 transition-colors">
                {trading ? "..." : isEn ? "SELL" : "ขาย"}
              </button>
            </div>

            {!hasPrice && orderType === "market" && (
              <p className="text-xs text-amber-600 text-center">
                {isEn ? "No live price — switch to Limit order to set your price" : "ไม่มีราคาสด — ใช้ Limit order ตั้งราคาเองได้"}
              </p>
            )}
          </>
        ) : (
          /* Options tab */
          <>
            <div className="flex gap-1.5">
              {(["CALL", "PUT"] as const).map(ot => (
                <button key={ot} onClick={() => setOptType(ot)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-colors ${
                    optType === ot
                      ? ot === "CALL" ? "bg-emerald-600 text-white border-emerald-600" : "bg-red-600 text-white border-red-600"
                      : "border-[#ccd5ae] text-slate-500"
                  }`}>
                  {ot === "CALL" ? "📈 CALL" : "📉 PUT"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Strike Price $</label>
                <input type="number" value={optStrike} onChange={e => setOptStrike(e.target.value)}
                  placeholder={hasPrice ? price.toFixed(0) : "0"}
                  className="w-full border border-[#ccd5ae] rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400"
                  style={{ fontFamily: "var(--font-mono)" }} />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Contracts (×100)</label>
                <input type="number" value={optContracts} onChange={e => setOptContracts(e.target.value)}
                  min="1" placeholder="1"
                  className="w-full border border-[#ccd5ae] rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400"
                  style={{ fontFamily: "var(--font-mono)" }} />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Expiry Date</label>
              <input type="date" value={optExpiry} onChange={e => setOptExpiry(e.target.value)}
                className="w-full border border-[#ccd5ae] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>

            {estPremium !== null && estCost !== null && (
              <div className="bg-[#e9edc9] rounded-xl p-3 text-xs flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Premium (est.)</span>
                  <span className="font-bold font-mono">${estPremium.toFixed(2)}/share</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Cost</span>
                  <span className="font-bold font-mono">${estCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className={`font-bold ${isItm ? "text-emerald-600" : "text-slate-500"}`}>
                    {isItm ? "In The Money ✓" : "Out of The Money"}
                  </span>
                </div>
              </div>
            )}

            <button onClick={() => void buyOption()} disabled={trading || !hasPrice}
              className={`w-full py-3 font-bold text-sm rounded-xl text-white disabled:opacity-40 transition-colors ${
                optType === "CALL" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
              }`}>
              {trading ? "..." : `Buy ${optType} Option`}
            </button>

            {!hasPrice && (
              <p className="text-xs text-amber-600 text-center">ต้องมีราคาสดเพื่อซื้อ Options</p>
            )}

            <p className="text-[10px] text-slate-400 text-center">
              Premium = Intrinsic + 5% time value · จำลองเท่านั้น
            </p>
          </>
        )}

        {msg && (
          <p className={`text-xs font-bold text-center ${msg.startsWith("✓") ? "text-emerald-600" : "text-red-600"}`}>
            {msg}
          </p>
        )}
        <p className="text-[10px] text-slate-400 text-center">
          {isEn ? "Simulated only · No real money · Not investment advice" : "จำลองเท่านั้น · ไม่ใช้เงินจริง · ไม่ใช่คำแนะนำลงทุน"}
        </p>
      </div>
    </div>
  );
}
