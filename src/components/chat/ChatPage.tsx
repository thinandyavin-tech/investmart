"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/lib/userContext";
import { useI18n } from "@/lib/i18n";
import { Link } from "@/i18n/navigation";

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

function authorInitial(msg: ChatMessage): string {
  if (msg.isSystem) return "📡";
  const a = msg.author;
  return ((a?.username ?? a?.name ?? "?")[0] ?? "?").toUpperCase();
}

const POLL_MS = 3000;

export function ChatPage() {
  const { user } = useUser();
  const { t, lang } = useI18n();
  const tc = t.chat;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(true);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const lastIdRef  = useRef<string | null>(null);

  const timeLabel = useCallback((iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleTimeString(lang === "th" ? "th-TH" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [lang]);

  const authorDisplay = useCallback((msg: ChatMessage): string => {
    if (msg.isSystem) return "InvestMart";
    const a = msg.author;
    if (!a) return tc.user;
    return a.username ?? a.name ?? tc.user;
  }, [tc.user]);

  const fetchMessages = useCallback(async (initial = false) => {
    try {
      const res  = await fetch("/api/chat");
      const data = (await res.json()) as { messages: ChatMessage[] };
      const msgs = data.messages ?? [];

      setMessages((prev) => {
        if (initial) return msgs;
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

  useEffect(() => { void fetchMessages(true); }, [fetchMessages]);

  useEffect(() => {
    const id = setInterval(() => void fetchMessages(false), POLL_MS);
    return () => clearInterval(id);
  }, [fetchMessages]);

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
        setError(data.error ?? tc.sendError);
      } else {
        setInput("");
        await fetchMessages(false);
      }
    } catch {
      setError(tc.networkError);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col page-fullheight bg-transparent">
      {/* Header */}
      <div className="border-b border-[#1F1A14] bg-[#faedcd] px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
        <div className="flex-1">
          <h1 className="text-xs font-bold uppercase tracking-widest">{tc.communityTitle}</h1>
          <p className="text-xs text-[#8A8378]">{tc.communityDesc}</p>
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
            <span className="text-xs text-[#8A8378]">{t.common.loading}</span>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-xs text-[#8A8378]">{tc.empty}</p>
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
              <div
                className="w-7 h-7 rounded-full border border-[#1F1A14] flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: isMe ? "#1F1A14" : "#faedcd", color: isMe ? "#faedcd" : "#1F1A14" }}
              >
                {authorInitial(msg)}
              </div>

              <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                <span className="text-xs text-[#8A8378]">
                  {isMe ? tc.you : authorDisplay(msg)} · {timeLabel(msg.createdAt)}
                </span>
                <div
                  className="px-3 py-1.5 text-xs leading-relaxed border border-[#1F1A14]"
                  style={{
                    background: isMe ? "#1F1A14" : "#fefae0",
                    color:      isMe ? "#faedcd" : "#1F1A14",
                    boxShadow:  isMe ? "none" : "2px 2px 0 #e9edc9",
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
      <div className="border-t border-[#1F1A14] bg-[#faedcd] px-3 py-2 flex-shrink-0">
        {error && (
          <p className="text-xs text-[#E5484D] mb-1">{error}</p>
        )}
        {!user ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8A8378]">{tc.loginPrompt}</span>
            <Link
              href="/signin"
              className="text-xs font-bold border border-[#1F1A14] px-3 py-1 hover:bg-[#1F1A14] hover:text-white transition-colors"
            >
              {t.common.signIn}
            </Link>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              placeholder={tc.inputPlaceholder}
              maxLength={500}
              className="flex-1 border border-[#1F1A14] bg-transparent px-3 py-1.5 text-xs placeholder:text-[#8A8378] focus:outline-none focus:border-[#5B8A2A]"
              disabled={sending}
            />
            <button
              onClick={() => void send()}
              disabled={sending || !input.trim()}
              className="border-2 border-[#1F1A14] px-4 py-1.5 text-xs font-bold uppercase tracking-wide disabled:opacity-40"
              style={{ background: "#1F1A14", color: "#faedcd", boxShadow: "2px 2px 0 #5B8A2A" }}
            >
              {sending ? "..." : tc.send}
            </button>
          </div>
        )}
        <p className="text-xs text-[#8A8378] mt-1">{tc.systemNote}</p>
      </div>
    </div>
  );
}
