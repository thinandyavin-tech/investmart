"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/lib/userContext";
import Link from "next/link";

interface ChatAuthor {
  id:       string;
  username: string | null;
  name:     string | null;
}

interface ChatMessage {
  id:        string;
  content:   string;
  isSystem:  boolean;
  createdAt: string;
  author:    ChatAuthor | null;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function authorDisplay(msg: ChatMessage): string {
  if (msg.isSystem) return "InvestMart";
  const a = msg.author;
  if (!a) return "ผู้ใช้";
  return a.username ?? a.name ?? "ผู้ใช้";
}

function authorInitial(msg: ChatMessage): string {
  if (msg.isSystem) return "📡";
  const a = msg.author;
  return ((a?.username ?? a?.name ?? "?")[0] ?? "?").toUpperCase();
}

const POLL_MS = 3000;

export function ChatPage() {
  const { user } = useUser();
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);

  const fetchMessages = useCallback(async (initial = false) => {
    try {
      const res  = await fetch("/api/chat");
      const data = (await res.json()) as { messages: ChatMessage[] };
      const msgs = data.messages ?? [];

      setMessages((prev) => {
        if (initial) return msgs;
        // Only append genuinely new messages (avoid full re-render)
        if (msgs.length === 0) return prev;
        const newLastId = msgs[msgs.length - 1]?.id;
        if (newLastId === lastIdRef.current) return prev;
        return msgs;
      });

      if (msgs.length > 0) {
        lastIdRef.current = msgs[msgs.length - 1]!.id;
      }
    } catch {
      /* non-fatal polling error */
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { void fetchMessages(true); }, [fetchMessages]);

  // Polling
  useEffect(() => {
    const id = setInterval(() => void fetchMessages(false), POLL_MS);
    return () => clearInterval(id);
  }, [fetchMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const res  = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content: input.trim() }),
      });
      const data = (await res.json()) as { error?: string; message?: ChatMessage };
      if (!res.ok) {
        setError(data.error ?? "ส่งไม่ได้");
      } else {
        setInput("");
        await fetchMessages(false);
      }
    } catch {
      setError("เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col page-fullheight bg-[#FBF7ED]">
      {/* Header */}
      <div className="border-b border-[#1F1A14] bg-[#F3EDE0] px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
        <div className="flex-1">
          <h1 className="text-xs font-bold uppercase tracking-widest">แชท · InvestMart</h1>
          <p className="text-xs text-[#8A8378]">พูดคุยกับนักลงทุนคนอื่น · รับข่าวสารตลาดจากระบบ</p>
        </div>
        <span className="flex items-center gap-1 text-xs text-[#5B8A2A]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5B8A2A] animate-pulse" />
          LIVE
        </span>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {loading && (
          <div className="flex justify-center py-8">
            <span className="text-xs text-[#8A8378]">กำลังโหลด...</span>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-xs text-[#8A8378]">ยังไม่มีข้อความ · เป็นคนแรกที่พูดคุย!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = user?.id === msg.author?.id;
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <div
                  className="max-w-sm w-full border border-[#5B8A2A] p-2.5 text-xs leading-relaxed whitespace-pre-line"
                  style={{ background: "#F0FAE8", boxShadow: "2px 2px 0 #5B8A2A" }}
                >
                  <div className="text-xs font-bold text-[#5B8A2A] uppercase tracking-widest mb-1">
                    📡 InvestMart · {timeLabel(msg.createdAt)}
                  </div>
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-full border border-[#1F1A14] flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: isMe ? "#1F1A14" : "#F3EDE0", color: isMe ? "#F3EDE0" : "#1F1A14" }}
              >
                {authorInitial(msg)}
              </div>

              {/* Bubble */}
              <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                <span className="text-xs text-[#8A8378]">
                  {isMe ? "คุณ" : authorDisplay(msg)} · {timeLabel(msg.createdAt)}
                </span>
                <div
                  className="px-3 py-1.5 text-xs leading-relaxed border border-[#1F1A14]"
                  style={{
                    background: isMe ? "#1F1A14" : "#FBF7ED",
                    color:      isMe ? "#F3EDE0" : "#1F1A14",
                    boxShadow:  isMe ? "none" : "2px 2px 0 #E8E2D4",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-[#1F1A14] bg-[#F3EDE0] px-3 py-2 flex-shrink-0">
        {error && (
          <p className="text-xs text-[#E5484D] mb-1">{error}</p>
        )}
        {!user ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8A8378]">เข้าสู่ระบบเพื่อส่งข้อความ</span>
            <Link
              href="/signin"
              className="text-xs font-bold border border-[#1F1A14] px-3 py-1 hover:bg-[#1F1A14] hover:text-white transition-colors"
            >
              เข้าสู่ระบบ
            </Link>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              placeholder="พิมพ์ข้อความ... (กด Enter เพื่อส่ง)"
              maxLength={500}
              className="flex-1 border border-[#1F1A14] bg-[#FBF7ED] px-3 py-1.5 text-xs placeholder:text-[#8A8378] focus:outline-none focus:border-[#5B8A2A]"
              disabled={sending}
            />
            <button
              onClick={() => void send()}
              disabled={sending || !input.trim()}
              className="border-2 border-[#1F1A14] px-4 py-1.5 text-xs font-bold uppercase tracking-wide disabled:opacity-40"
              style={{ background: "#1F1A14", color: "#F3EDE0", boxShadow: "2px 2px 0 #5B8A2A" }}
            >
              {sending ? "..." : "ส่ง"}
            </button>
          </div>
        )}
        <p className="text-xs text-[#8A8378] mt-1">
          ระบบจะส่งสรุปตลาดหุ้นทุกวันหลังปิดตลาด ET · ไม่ใช่คำแนะนำลงทุน
        </p>
      </div>
    </div>
  );
}
