"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@/lib/i18n";
import { MartinActionButtons, splitActions } from "@/components/ai/MartinActions";

const StockInfographic = dynamic(
  () => import("@/components/stock/StockInfographic").then(m => m.StockInfographic),
  { ssr: false },
);

const INFOGRAPHIC_RE = /(?:infographic|อินโฟกราฟิก|สร้างภาพ|ทำ infographic)[^\w]*\$?([A-Z][A-Z.\-]{0,9})/i;
const INFOGRAPHIC_TH = /(?:infographic|อินโฟกราฟิก).*\$?([A-Z][A-Z.\-]{1,9})/i;

function extractInfographicTicker(text: string): string | null {
  const m = INFOGRAPHIC_RE.exec(text) ?? INFOGRAPHIC_TH.exec(text);
  return m?.[1]?.toUpperCase() ?? null;
}

interface Message {
  role:         "user" | "assistant";
  content:      string;
  infographic?: string;
}

function MessageBubble({ role, content, infographic }: { role: "user" | "assistant"; content: string; infographic?: string }) {
  const { lang } = useI18n();
  const shown    = splitActions(content);

  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-3 py-2 text-sm leading-relaxed text-white break-words rounded-xl rounded-br-sm bg-violet-600">
          {content}
        </div>
      </div>
    );
  }

  if (infographic) {
    return (
      <div className="flex justify-start gap-2">
        <div className="w-7 h-7 rounded-full bg-slate-900/80 border border-[#ccd5ae] flex items-center justify-center flex-shrink-0 mt-0.5">
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
      <div className="w-7 h-7 rounded-full bg-slate-900/80 border border-[#ccd5ae] flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-violet-400 text-xs">✦</span>
      </div>
      <div className="max-w-[88%]">
        <p className="text-xs font-bold text-violet-400 mb-0.5">Martin</p>
        {content ? (
          <div className="text-sm leading-relaxed text-slate-800 break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p:          ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong:     ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
                em:         ({ children }) => <em className="italic">{children}</em>,
                h1:         ({ children }) => <p className="font-bold text-base text-slate-900 mt-3 mb-1">{children}</p>,
                h2:         ({ children }) => <p className="font-bold text-sm text-slate-900 mt-2.5 mb-1 uppercase tracking-wide">{children}</p>,
                h3:         ({ children }) => <p className="font-semibold text-sm text-slate-800 mt-2 mb-0.5">{children}</p>,
                ul:         ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                ol:         ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                li:         ({ children }) => <li className="text-sm">{children}</li>,
                hr:         () => <hr className="border-[#ccd5ae] my-3" />,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-violet-300 pl-3 italic text-slate-600 my-1.5">{children}</blockquote>,
                code:       ({ children }) => <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                table:      ({ children }) => <div className="overflow-x-auto my-2"><table className="text-xs border-collapse w-full">{children}</table></div>,
                th:         ({ children }) => <th className="border border-[#ccd5ae] px-2 py-1.5 bg-[#e9edc9] font-semibold text-left">{children}</th>,
                td:         ({ children }) => <td className="border border-[#ccd5ae] px-2 py-1.5">{children}</td>,
              }}
            >
              {shown.text}
            </ReactMarkdown>
            <MartinActionButtons actions={shown.actions} lang={lang} />
          </div>
        ) : (
          <p className="text-xs text-slate-400 animate-pulse">กำลังคิด...</p>
        )}
      </div>
    </div>
  );
}

const SUGGESTED_PROMPTS = [
  "วิเคราะห์ $NVDA ให้หน่อย",
  "P/E และ PEG ของ $AAPL คืออะไร?",
  "ข่าวล่าสุดของ $TSLA",
  "อธิบาย RSI คืออะไร",
  "สร้าง infographic ของ $NVDA",
];

export function MartinChatPage() {
  const { lang }       = useI18n();
  const searchParams   = useSearchParams();
  const initialQ       = searchParams.get("q") ?? "";

  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const sentInitial = useRef(false);

  const abortRef  = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef  = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setError(null);
    setInput("");

    const infographicTicker = extractInfographicTicker(trimmed);
    if (infographicTicker) {
      setMessages(prev => [
        ...prev,
        { role: "user",      content: trimmed },
        { role: "assistant", content: "", infographic: infographicTicker },
      ]);
      return;
    }

    const history = messages
      .filter(m => !m.infographic && m.content.trim().length > 0)
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content.slice(0, 10000) }));
    const outgoing: Message[] = [...history, { role: "user", content: trimmed }];
    setMessages(prev => [...prev, { role: "user", content: trimmed }, { role: "assistant", content: "" }]);
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/ai/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: outgoing, locale: lang }),
        signal:  ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string; retryAfter?: number };
        if (res.status === 429) {
          const wait = errBody.retryAfter ?? 60;
          throw new Error(`ระบบ AI กำลังใช้งานหนัก 🙏 รอ ${wait} วินาที แล้วลองใหม่`);
        }
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
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setError(msg);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        return last?.role === "assistant" && last.content === "" ? prev.slice(0, -1) : prev;
      });
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, lang]);

  // Auto-send the ?q= param once on mount
  useEffect(() => {
    if (initialQ && !sentInitial.current) {
      sentInitial.current = true;
      void send(initialQ);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once — `send` is stable after mount

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
    <div className="flex flex-col h-full min-h-0 bg-[#fefae0]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#ccd5ae] flex-shrink-0 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-violet-500/40 flex items-center justify-center">
            <span className="text-violet-400 text-sm">✦</span>
          </div>
          <div>
            <p className="text-base font-bold text-white">Martin</p>
            <p className="text-xs text-slate-400">Licensed Financial Analyst · Real-time Data</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white transition-colors"
          aria-label="เริ่มการสนทนาใหม่"
        >
          ใหม่
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="py-6 px-1">
            <div className="flex items-center gap-3 justify-center mb-6">
              <div className="w-10 h-10 rounded-full bg-slate-900/80 border border-[#ccd5ae] flex items-center justify-center">
                <span className="text-violet-400 text-lg">✦</span>
              </div>
              <div>
                <p className="text-base font-bold text-slate-800">Martin</p>
                <p className="text-xs text-slate-500">Licensed Financial Analyst · Real-time Data</p>
              </div>
            </div>
            <div className="space-y-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => void send(p)}
                  className="w-full text-left text-sm px-4 py-3 rounded-lg border border-[#ccd5ae] bg-[#faedcd] hover:border-violet-300 transition-colors text-slate-700 leading-snug"
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-5 text-center leading-snug">
              Martin ใช้ข้อมูลจริงจาก Finnhub เท่านั้น · Licensed Financial Analyst
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} infographic={m.infographic} />
        ))}

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

      {/* Input */}
      <div className="flex-shrink-0 border-t border-[#ccd5ae] bg-[#faedcd] p-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); }
            }}
            placeholder="ถามเกี่ยวกับหุ้น, กราฟ, ข่าว..."
            disabled={streaming}
            rows={2}
            className="flex-1 text-sm border border-[#ccd5ae] bg-[#faedcd] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-violet-400 disabled:opacity-50 text-slate-800 placeholder:text-slate-400"
            aria-label="พิมพ์คำถาม"
          />
          <button
            onClick={() => void send(input)}
            disabled={!input.trim() || streaming}
            className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-colors flex-shrink-0 self-stretch flex items-center bg-violet-600 hover:bg-violet-700"
            aria-label="ส่งข้อความ"
          >
            {streaming ? "· · ·" : "ส่ง"}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1.5 leading-snug">
          Martin · Licensed Financial Analyst · Real-time Finnhub Data
        </p>
      </div>
    </div>
  );
}
