"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  role:    "user" | "assistant";
  content: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STOCK_PATH_RE = /^\/stock\/([A-Z][A-Z.\-]{0,9})(\/|$)/;

function tickerFromPath(pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  return STOCK_PATH_RE.exec(pathname)?.[1];
}

function suggestedPrompts(ticker?: string): string[] {
  if (ticker) {
    return [
      `วิเคราะห์ $${ticker} ให้หน่อย`,
      `P/E และ PEG ของ $${ticker}?`,
      `ข่าวล่าสุดของ $${ticker}`,
      `$${ticker} มีความเสี่ยงอะไรบ้าง?`,
      `อธิบาย Beta ratio คืออะไร`,
    ];
  }
  return [
    "วิเคราะห์ $NVDA ให้หน่อย",
    "P/E และ PEG ของ $AAPL คืออะไร?",
    "ข่าวล่าสุดของ $TSLA",
    "$AMD มีความเสี่ยงอะไรบ้าง?",
    "อธิบาย RSI คืออะไร",
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MessageBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[80%] px-3 py-2 text-[11px] leading-relaxed text-white break-words"
          style={{ background: "#1F1A14" }}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%]">
        <p className="text-[8px] font-bold uppercase tracking-widest mb-1" style={{ color: "#8B5CF6" }}>
          ✦ InvestMart AI
        </p>
        {content ? (
          <p className="text-[11px] leading-relaxed text-[#1F1A14] whitespace-pre-wrap break-words">
            {content}
          </p>
        ) : (
          <p className="text-[10px] text-[#8A8378] animate-pulse">กำลังคิด...</p>
        )}
      </div>
    </div>
  );
}

function SuggestedPromptsPanel({
  ticker,
  onSelect,
}: {
  ticker?:  string;
  onSelect: (p: string) => void;
}) {
  const prompts = suggestedPrompts(ticker);

  return (
    <div className="py-4 px-1">
      <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A8378] mb-3 text-center">
        สอบถาม InvestMart AI
      </p>
      <div className="space-y-1.5">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            className="w-full text-left text-[10px] px-3 py-2 border border-[#E8E2D4] hover:border-[#8B5CF6] hover:bg-[#F5F3FF] transition-colors text-[#1F1A14] leading-snug"
          >
            {p}
          </button>
        ))}
      </div>
      <p className="text-[8px] text-[#8A8378] mt-4 text-center leading-snug">
        คำตอบใช้ข้อมูลจริงจาก Finnhub · ไม่ใช่คำแนะนำการลงทุน
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FloatingAssistant() {
  const pathname     = usePathname();
  const contextTicker = tickerFromPath(pathname);

  const [isOpen,    setIsOpen]    = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const abortRef  = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef  = useRef<HTMLTextAreaElement | null>(null);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Dismiss on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setError(null);

    // Keep last 10 messages (5 turns) + new user message, truncate each to 6000 chars
    // so accumulated history never exceeds server validation limits.
    const history = messages.slice(-10).map(m => ({
      ...m,
      content: m.content.slice(0, 6000),
    }));
    const outgoing: Message[] = [...history, { role: "user", content: trimmed }];
    setMessages([...messages, { role: "user", content: trimmed }, { role: "assistant", content: "" }]);
    setInput("");
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
        throw new Error(errBody.error ?? "AI ไม่พร้อมใช้งาน");
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buf     = "";
      let   sseEnd  = false; // true once [DONE] is received

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
            if ((parseErr as Error).message !== "Unexpected end of JSON input") {
              throw parseErr;
            }
          }
        }
      }

      reader.cancel().catch(() => { /* cleanup only */ });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // AbortError is intentional (user hit reset); finally still runs.
        return;
      }
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
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
      {/* ── Floating button ───────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="fixed z-50 w-12 h-12 rounded-full flex flex-col items-center justify-center text-white transition-transform hover:scale-105 active:scale-95"
        style={{
          bottom:     "calc(4.75rem + env(safe-area-inset-bottom, 0px))",
          right:      "1rem",
          background: "#1F1A14",
          boxShadow:  isOpen ? "2px 2px 0 #8B5CF6" : "3px 3px 0 #8B5CF6",
        }}
        aria-label={isOpen ? "ปิด AI assistant" : "เปิด AI assistant"}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className="text-base leading-none" aria-hidden="true">✦</span>
        <span className="text-[8px] leading-none font-bold tracking-wider">AI</span>
      </button>

      {/* ── Chat panel ────────────────────────────────────────────────── */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            className="fixed z-50 bg-[#FBF7ED] border border-[#1F1A14] flex flex-col
              inset-x-0 bottom-0 h-[88vh] rounded-t-none
              lg:inset-x-auto lg:bottom-24 lg:right-6 lg:w-96 lg:h-[600px] lg:rounded-none"
            style={{ boxShadow: "4px 4px 0 #1F1A14" }}
            role="dialog"
            aria-modal="true"
            aria-label="InvestMart AI"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-[#1F1A14] flex-shrink-0"
              style={{ background: "#1F1A14" }}
            >
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-white">
                  ✦ InvestMart AI
                </p>
                {contextTicker && (
                  <p className="text-[9px] mt-0.5" style={{ color: "#8B5CF6" }}>
                    ดูหุ้น ${contextTicker}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={reset}
                  className="text-[9px] font-bold px-2 py-1 border border-[#4A4440] text-[#C8C0B0] hover:border-white hover:text-white transition-colors"
                  title="เริ่มการสนทนาใหม่"
                  aria-label="เริ่มการสนทนาใหม่"
                >
                  ใหม่
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[#C8C0B0] hover:text-white transition-colors text-xl leading-none font-light"
                  aria-label="ปิด"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
              {messages.length === 0 ? (
                <SuggestedPromptsPanel
                  ticker={contextTicker}
                  onSelect={p => void send(p)}
                />
              ) : (
                messages.map((m, i) => (
                  <MessageBubble key={i} role={m.role} content={m.content} />
                ))
              )}

              {error && (
                <p className="text-[10px] text-[#DC2626] text-center py-1">
                  {error}
                  {" · "}
                  <button onClick={retryLast} className="underline font-bold">
                    ลองใหม่
                  </button>
                  {" · "}
                  <button onClick={() => setError(null)} className="underline">
                    ปิด
                  </button>
                </p>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 border-t border-[#E8E2D4] bg-[#F3EDE0] p-3">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send(input);
                    }
                  }}
                  placeholder={
                    contextTicker
                      ? `ถามเกี่ยวกับ $${contextTicker}... (Enter ส่ง)`
                      : "ถามเกี่ยวกับหุ้น, กราฟ, ข่าว... (Enter ส่ง)"
                  }
                  disabled={streaming}
                  rows={2}
                  className="flex-1 text-xs border border-[#1F1A14] bg-[#FBF7ED] px-3 py-2 resize-none focus:outline-none focus:ring-1 disabled:opacity-50"
                  style={{ focusRingColor: "#8B5CF6" } as React.CSSProperties}
                  aria-label="พิมพ์คำถาม"
                />
                <button
                  onClick={() => void send(input)}
                  disabled={!input.trim() || streaming}
                  className="px-3 py-2 text-white text-xs font-bold disabled:opacity-40 transition-colors flex-shrink-0 self-stretch flex items-center"
                  style={{
                    background: "#1F1A14",
                    boxShadow:  "2px 2px 0 #8B5CF6",
                  }}
                  aria-label="ส่งข้อความ"
                >
                  {streaming ? "· · ·" : "ส่ง"}
                </button>
              </div>
              <p className="text-[8px] text-[#8A8378] mt-1.5 leading-snug">
                ข้อมูลจาก Finnhub · AI วิเคราะห์จากข้อมูลจริง ไม่ใช่คำแนะนำการลงทุน
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
