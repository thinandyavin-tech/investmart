"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const StockInfographic = dynamic(
  () => import("@/components/stock/StockInfographic").then(m => m.StockInfographic),
  { ssr: false },
);

// Infographic trigger: "infographic NVDA", "สร้าง infographic ของ NVDA", etc.
const INFOGRAPHIC_RE = /(?:infographic|อินโฟกราฟิก|สร้างภาพ|ทำ infographic)[^\w]*\$?([A-Z][A-Z.\-]{0,9})/i;
const INFOGRAPHIC_TH = /(?:infographic|อินโฟกราฟิก).*\$?([A-Z][A-Z.\-]{1,9})/i;

function extractInfographicTicker(text: string, fallback?: string): string | null {
  const m = INFOGRAPHIC_RE.exec(text) ?? INFOGRAPHIC_TH.exec(text);
  if (m?.[1]) return m[1].toUpperCase();
  // If user just said "infographic" with no ticker, use the page/context ticker
  if (/infographic|อินโฟกราฟิก/i.test(text) && fallback) return fallback;
  return null;
}

interface Message {
  role:      "user" | "assistant";
  content:   string;
  infographic?: string; // ticker — renders StockInfographic instead of text
}

const STOCK_PATH_RE = /^\/stock\/([A-Z][A-Z.\-]{0,9})(\/|$)/;

function tickerFromPath(pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  return STOCK_PATH_RE.exec(pathname)?.[1];
}

function suggestedPrompts(ticker?: string): string[] {
  if (ticker) return [
    `วิเคราะห์ $${ticker} ให้หน่อย`,
    `สร้าง infographic ของ $${ticker}`,
    `P/E และ PEG ของ $${ticker}?`,
    `ข่าวล่าสุดของ $${ticker}`,
    `$${ticker} มีความเสี่ยงอะไรบ้าง?`,
  ];
  return [
    "วิเคราะห์ $NVDA ให้หน่อย",
    "สร้าง infographic ของ $NVDA",
    "P/E และ PEG ของ $AAPL คืออะไร?",
    "ข่าวล่าสุดของ $TSLA",
    "อธิบาย RSI คืออะไร",
  ];
}

function MessageBubble({ role, content, infographic }: { role: "user" | "assistant"; content: string; infographic?: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-3 py-2 text-xs leading-relaxed text-white break-words rounded-xl rounded-br-sm bg-violet-600">
          {content}
        </div>
      </div>
    );
  }

  // Infographic message — render card instead of text
  if (infographic) {
    return (
      <div className="flex justify-start gap-2">
        <div className="w-6 h-6 rounded-full bg-slate-900/80 border border-white/20 flex items-center justify-center flex-shrink-0 mt-0.5 flex-shrink-0">
          <span className="text-violet-400 text-xs">✦</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-violet-400 mb-1.5">Martin</p>
          <StockInfographic ticker={infographic} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2">
      <div className="w-6 h-6 rounded-full bg-slate-900/80 border border-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-violet-400 text-xs">✦</span>
      </div>
      <div className="max-w-[88%]">
        <p className="text-xs font-bold text-violet-400 mb-0.5">Martin</p>
        {content ? (
          <p className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
            {content}
          </p>
        ) : (
          <p className="text-xs text-slate-400 animate-pulse">กำลังคิด...</p>
        )}
      </div>
    </div>
  );
}

function SuggestedPromptsPanel({ ticker, onSelect }: { ticker?: string; onSelect: (p: string) => void }) {
  const prompts = suggestedPrompts(ticker);
  return (
    <div className="py-4 px-1">
      <div className="flex items-center gap-2 justify-center mb-4">
        <div className="w-8 h-8 rounded-full bg-slate-900/80 border border-white/20 flex items-center justify-center">
          <span className="text-violet-400 text-sm">✦</span>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">Martin</p>
          <p className="text-xs text-slate-500">InvestMart AI · ข้อมูลจริง Finnhub</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            className="w-full text-left text-xs px-3 py-2.5 rounded-lg border border-white/30 bg-white/40 hover:bg-white/60 hover:border-violet-300 transition-colors text-slate-700 leading-snug"
          >
            {p}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-4 text-center leading-snug">
        Martin ตอบจากข้อมูลจริงเท่านั้น · ไม่ใช่คำแนะนำการลงทุน
      </p>
    </div>
  );
}

export function FloatingAssistant() {
  const pathname      = usePathname();
  const contextTicker = tickerFromPath(pathname);

  const [isOpen,    setIsOpen]    = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const abortRef  = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef  = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setIsOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setError(null);
    setInput("");

    // ── Infographic shortcut: skip AI, render card directly ──
    const infographicTicker = extractInfographicTicker(trimmed, contextTicker);
    if (infographicTicker) {
      setMessages(prev => [
        ...prev,
        { role: "user",      content: trimmed },
        { role: "assistant", content: "", infographic: infographicTicker },
      ]);
      return;
    }

    const history = messages.slice(-10).map(m => ({ ...m, content: m.content.slice(0, 10000) }));
    const outgoing: Message[] = [...history, { role: "user", content: trimmed }];
    setMessages([...messages, { role: "user", content: trimmed }, { role: "assistant", content: "" }]);
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/ai/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: outgoing, ticker: contextTicker }),
        signal:  ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error ?? "Martin ไม่พร้อมใช้งานตอนนี้");
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buf     = "";
      let   sseEnd  = false;

      while (!sseEnd) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") { sseEnd = true; break; }
          try {
            const chunk = JSON.parse(payload) as { token?: string; error?: string };
            if (chunk.error) throw new Error(chunk.error);
            if (chunk.token) {
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (!last || last.role !== "assistant") return prev;
                return [...prev.slice(0, -1), { role: "assistant", content: last.content + chunk.token }];
              });
            }
          } catch (parseErr) {
            if ((parseErr as Error).message !== "Unexpected end of JSON input") throw parseErr;
          }
        }
      }
      reader.cancel().catch(() => {});
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const raw = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      // Surface rate-limit errors with a clear Thai message
      const msg = /429|rate.?limit|too many|quota/i.test(raw)
        ? "Martin ถูกใช้งานหนักมากตอนนี้ 🙏 รอสักครู่แล้วลองใหม่"
        : raw;
      setError(msg);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        return last?.role === "assistant" && last.content === "" ? prev.slice(0, -1) : prev;
      });
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, contextTicker]);

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setError(null);
    setStreaming(false);
  }

  function retryLast() {
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (lastUser) void send(lastUser.content);
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="fixed z-50 w-12 h-12 rounded-full flex flex-col items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 bg-slate-900/90 backdrop-blur-sm border border-violet-500/40 shadow-lg shadow-violet-900/30"
        style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))", right: "1rem" }}
        aria-label={isOpen ? "ปิด Martin AI" : "เปิด Martin AI"}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className="text-violet-400 text-base leading-none" aria-hidden="true">✦</span>
        <span className="text-xs leading-none font-bold tracking-wide text-violet-300">M</span>
      </button>

      {/* Chat panel */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed z-50 flex flex-col
              inset-x-0 bottom-0 h-[88vh] rounded-t-2xl
              lg:inset-x-auto lg:bottom-24 lg:right-6 lg:w-96 lg:h-[600px] lg:rounded-2xl
              bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/40
              shadow-2xl shadow-slate-900/20"
            role="dialog"
            aria-modal="true"
            aria-label="Martin — InvestMart AI"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/20 flex-shrink-0 rounded-t-2xl bg-slate-900/60 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-violet-500/40 flex items-center justify-center">
                  <span className="text-violet-400 text-xs">✦</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Martin</p>
                  {contextTicker ? (
                    <p className="text-xs text-violet-300">กำลังดู ${contextTicker}</p>
                  ) : (
                    <p className="text-xs text-slate-400">InvestMart AI · ข้อมูลจริง</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={reset}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white transition-colors"
                  aria-label="เริ่มการสนทนาใหม่"
                >
                  ใหม่
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors text-xl leading-none font-light w-7 h-7 flex items-center justify-center"
                  aria-label="ปิด"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
              {messages.length === 0 ? (
                <SuggestedPromptsPanel ticker={contextTicker} onSelect={p => void send(p)} />
              ) : (
                messages.map((m, i) => <MessageBubble key={i} role={m.role} content={m.content} infographic={m.infographic} />)
              )}

              {error && (
                <div className="rounded-xl bg-red-50/80 border border-red-200/60 px-3 py-2.5 text-center">
                  <p className="text-xs text-red-600 mb-1.5">{error}</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={retryLast} className="text-xs font-semibold text-red-700 underline">
                      ลองใหม่
                    </button>
                    <span className="text-red-300">·</span>
                    <button onClick={() => setError(null)} className="text-xs text-red-500 underline">
                      ปิด
                    </button>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 border-t border-white/20 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-3 rounded-b-2xl">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); }
                  }}
                  placeholder={contextTicker ? `ถามเกี่ยวกับ $${contextTicker}...` : "ถามเกี่ยวกับหุ้น, กราฟ, ข่าว..."}
                  disabled={streaming}
                  rows={2}
                  className="flex-1 text-xs border border-white/30 bg-white/60 dark:bg-slate-700/60 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-violet-400 disabled:opacity-50 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                  aria-label="พิมพ์คำถาม"
                />
                <button
                  onClick={() => void send(input)}
                  disabled={!input.trim() || streaming}
                  className="px-3 py-2 rounded-xl text-white text-xs font-semibold disabled:opacity-40 transition-colors flex-shrink-0 self-stretch flex items-center bg-violet-600 hover:bg-violet-700"
                  aria-label="ส่งข้อความ"
                >
                  {streaming ? "· · ·" : "ส่ง"}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-snug">
                Martin ใช้ข้อมูลจาก Finnhub · วิเคราะห์เพื่อการศึกษา ไม่ใช่คำแนะนำลงทุน
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
