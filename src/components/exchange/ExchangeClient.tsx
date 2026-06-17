"use client";

import { useState, useEffect } from "react";

import { Card } from "@/components/Card";
import { OffsetButton } from "@/components/OffsetButton";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { useUser } from "@/lib/userContext";
import { useI18n } from "@/lib/i18n";

const CURRENCIES = ["THB", "USD", "EUR", "GBP", "JPY"] as const;
type Currency = (typeof CURRENCIES)[number];

export function ExchangeClient() {
  const { user, loading: userLoading, refreshUser } = useUser();
  const { t } = useI18n();

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
    if (isNaN(amt) || amt <= 0) { setMsg(t.exchange.enterAmount); return; }
    if (!["THB", "USD"].includes(fromCurrency)) { setMsg(t.exchange.onlyTHBUSD); return; }
    if (!["THB", "USD"].includes(toCurrency))   { setMsg(t.exchange.onlyTHBUSDReceive); return; }
    setExchanging(true); setMsg("");
    try {
      const res  = await fetch("/api/exchange", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ fromCurrency, toCurrency, amount: amt, rate }),
      });
      const data = (await res.json()) as { error?: string; cashThb?: number; cashUsd?: number };
      if (!res.ok) { setMsg(data.error ?? t.exchange.genericError); }
      else {
        setMsg(t.exchange.success(
          (data.cashThb ?? 0).toLocaleString(),
          (data.cashUsd ?? 0).toFixed(2),
        ));
        await refreshUser();
      }
    } catch { setMsg(t.exchange.genericError); }
    finally { setExchanging(false); }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      {showLoginPrompt && (
        <LoginPromptModal
          message={t.exchange.loginMessage}
          onClose={() => setShowLoginPrompt(false)}
        />
      )}
      <h1 className="text-xs font-bold uppercase tracking-widest mb-1">{t.exchange.title}</h1>
      <p className="text-xs text-[#8A8378] mb-4">
        {t.exchange.rateLabel} <span className="font-bold">{source || "..."}</span>
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
              {t.exchange.amountLabel}
            </label>
            <input
              id="from-amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-[#1F1A14] bg-[#fefae0] px-2 py-1.5 text-sm font-bold"
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </div>
          <div>
            <label className="text-xs text-[#8A8378] uppercase tracking-wide block mb-1" htmlFor="from-currency">
              {t.exchange.fromLabel}
            </label>
            <select
              id="from-currency"
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value as Currency)}
              className="border border-[#1F1A14] bg-[#fefae0] px-2 py-1.5 text-sm font-bold h-full"
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
            aria-label={t.exchange.swapAria}
          >
            ⇄
          </button>
          <div className="flex-1 h-px bg-[#1F1A14]" />
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <div className="text-xs text-[#8A8378] uppercase tracking-wide mb-1">{t.exchange.resultLabel}</div>
            <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-mono)" }}>
              {loading ? "..." : result.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-[#8A8378] mt-0.5">
              1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
            </div>
          </div>
          <div>
            <label className="text-xs text-[#8A8378] uppercase tracking-wide block mb-1" htmlFor="to-currency">
              {t.exchange.toLabel}
            </label>
            <select
              id="to-currency"
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value as Currency)}
              className="border border-[#1F1A14] bg-[#fefae0] px-2 py-1.5 text-sm font-bold"
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {!user && !userLoading ? (
          <OffsetButton variant="lime" className="w-full text-center" onClick={() => setShowLoginPrompt(true)}>
            {t.exchange.loginToExchange}
          </OffsetButton>
        ) : (
          <OffsetButton
            variant="lime"
            className="w-full text-center"
            onClick={executeExchange}
            disabled={exchanging}
          >
            {exchanging ? t.exchange.updating : t.exchange.updateBalance}
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
          {t.exchange.rateNote}
        </p>
      </Card>

      {/* Rate table */}
      <Card className="mt-4 overflow-hidden">
        <div className="px-3 py-2 border-b border-[#1F1A14] text-xs font-bold uppercase tracking-wide bg-[#1F1A14] text-[#faedcd]">
          {t.exchange.rateBase}
        </div>
        {Object.entries(rates)
          .filter(([k]) => k.startsWith("USD") && k !== "USDUSD")
          .slice(0, 8)
          .map(([pair, rate]) => (
            <div key={pair} className="flex justify-between px-3 py-1.5 border-b border-[#e9edc9] last:border-0 text-xs">
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
