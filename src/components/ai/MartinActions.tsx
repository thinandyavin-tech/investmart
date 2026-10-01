"use client";

import { useState } from "react";

// Martin ends a reply with lines like  [[ACTION {"type":"alert","ticker":"NVDA","condition":"below","price":120}]]
// They are hidden from the text and shown as buttons. Nothing runs until the user taps (trades need a second tap).

export type MartinAction =
  | { type: "watchlist"; ticker: string }
  | { type: "alert"; ticker: string; condition: "above" | "below"; price: number }
  | { type: "trade"; ticker: string; side: "BUY" | "SELL"; shares: number };

const LINE_RE    = /\[\[ACTION\s+(\{[^\n]*?\})\s*\]\]/g;
const PARTIAL_RE = /\[\[A?C?T?I?O?N?[^\]\n]*$/;   // an action still streaming in — hide it
const TICKER_RE  = /^[A-Z][A-Z.\-]{0,9}$/;

function valid(a: unknown): a is MartinAction {
  if (!a || typeof a !== "object") return false;
  const o = a as Record<string, unknown>;
  if (typeof o.ticker !== "string" || !TICKER_RE.test(o.ticker)) return false;
  if (o.type === "watchlist") return true;
  if (o.type === "alert") return (o.condition === "above" || o.condition === "below") && typeof o.price === "number" && o.price > 0;
  if (o.type === "trade") return (o.side === "BUY" || o.side === "SELL") && typeof o.shares === "number" && o.shares > 0 && o.shares <= 1_000_000;
  return false;
}

export function splitActions(content: string): { text: string; actions: MartinAction[] } {
  const actions: MartinAction[] = [];
  const text = content.replace(LINE_RE, (_, json: string) => {
    try {
      const a = JSON.parse(json) as unknown;
      if (valid(a) && actions.length < 3) actions.push(a);
    } catch { /* ignore malformed */ }
    return "";
  }).replace(PARTIAL_RE, "").trimEnd();
  return { text, actions };
}

function label(a: MartinAction, th: boolean): string {
  if (a.type === "watchlist") return th ? `เพิ่ม ${a.ticker} ในรายการเฝ้าดู` : `Add ${a.ticker} to watchlist`;
  if (a.type === "alert") {
    const dir = a.condition === "above" ? (th ? "ขึ้นถึง" : "rises above") : (th ? "ลงถึง" : "falls below");
    return th ? `แจ้งเตือนเมื่อ ${a.ticker} ${dir} $${a.price}` : `Alert me when ${a.ticker} ${dir} $${a.price}`;
  }
  const verb = a.side === "BUY" ? (th ? "ซื้อ" : "Buy") : (th ? "ขาย" : "Sell");
  return th ? `${verb} ${a.ticker} ${a.shares} หุ้น (เงินจำลอง)` : `${verb} ${a.shares} ${a.ticker} (paper)`;
}

async function run(a: MartinAction): Promise<string | null> {
  const req = a.type === "watchlist"
    ? { url: "/api/watchlist", body: { ticker: a.ticker } }
    : a.type === "alert"
      ? { url: "/api/alerts", body: { ticker: a.ticker, threshold: a.price, condition: a.condition } }
      : { url: "/api/trade", body: { ticker: a.ticker, side: a.side, shares: a.shares } };
  const res = await fetch(req.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req.body) });
  if (res.ok) return null;
  const j = await res.json().catch(() => ({})) as { error?: string };
  return j.error ?? `HTTP ${res.status}`;
}

function ActionButton({ action, th }: { action: MartinAction; th: boolean }) {
  const [state, setState] = useState<"idle" | "confirm" | "busy" | "done" | "error">("idle");
  const [err, setErr]     = useState("");
  const isTrade = action.type === "trade";

  async function onClick() {
    if (state === "busy" || state === "done") return;
    if (isTrade && state !== "confirm") { setState("confirm"); return; }
    setState("busy");
    const e = await run(action).catch(() => (th ? "เชื่อมต่อไม่ได้" : "Network error"));
    if (e) { setErr(e); setState("error"); }
    else {
      setState("done");
      window.dispatchEvent(new CustomEvent("investmart:account-changed"));
    }
  }

  const text =
    state === "confirm" ? (th ? `ยืนยัน: ${label(action, th)} ที่ราคาตลาด?` : `Confirm: ${label(action, th)} at market price?`)
    : state === "busy"  ? (th ? "กำลังทำ…" : "Working…")
    : state === "done"  ? `✓ ${label(action, th)}`
    : label(action, th);

  const tone =
    state === "done"    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
    : state === "confirm" ? "border-amber-500 bg-amber-50 text-amber-800"
    : state === "error"   ? "border-rose-400 bg-rose-50 text-rose-700"
    : "border-violet-400 bg-white text-violet-700 hover:bg-violet-50";

  return (
    <div className="flex flex-col items-start gap-0.5">
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={onClick} disabled={state === "busy" || state === "done"}
          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${tone}`}>
          {text}
        </button>
        {state === "confirm" && (
          <button type="button" onClick={() => setState("idle")} className="text-xs text-slate-500 underline">
            {th ? "ยกเลิก" : "Cancel"}
          </button>
        )}
      </div>
      {state === "error" && <p className="text-[11px] text-rose-600">{err}</p>}
    </div>
  );
}

export function MartinActionButtons({ actions, lang }: { actions: MartinAction[]; lang: string }) {
  if (actions.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {actions.map((a, i) => <ActionButton key={i} action={a} th={lang !== "en"} />)}
    </div>
  );
}
