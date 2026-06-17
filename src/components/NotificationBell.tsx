"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";

interface Notification {
  id:        string;
  type:      string;
  message:   string;
  link:      string | null;
  read:      boolean;
  createdAt: string;
}

interface BellProps {
  size?: "sm" | "md";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "เมื่อกี้";
  if (m < 60) return `${m}น.ที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ชม.ที่แล้ว`;
  return `${Math.floor(h / 24)}วันที่แล้ว`;
}

function typeIcon(type: string): string {
  if (type === "like")    return "❤️";
  if (type === "comment") return "💬";
  if (type === "follow")  return "👥";
  if (type === "alert")   return "🔔";
  return "•";
}

export function NotificationBell({ size = "md" }: BellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread]               = useState(0);
  const [open, setOpen]                   = useState(false);
  const panelRef                          = useRef<HTMLDivElement>(null);
  const btnRef                            = useRef<HTMLButtonElement>(null);

  const fetch_ = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d: { notifications?: Notification[]; unread?: number }) => {
        setNotifications(d.notifications ?? []);
        setUnread(d.unread ?? 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 60_000);
    return () => clearInterval(id);
  }, [fetch_]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current   && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ markAllRead: true }),
    });
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
    setUnread(0);
  }

  const dim    = size === "sm" ? 16 : 20;
  const btnCls = size === "sm"
    ? "relative w-9 h-9 flex items-center justify-center border border-[#1F1A14] rounded-full bg-[#faedcd] hover:bg-[#1F1A14] hover:text-white transition-colors"
    : "relative w-9 h-9 flex items-center justify-center hover:bg-[#1F1A14] hover:text-white transition-colors";

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className={btnCls}
        aria-label={`การแจ้งเตือน${unread > 0 ? ` (${unread} ใหม่)` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <BellIcon size={dim} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-xs font-bold text-white px-0.5"
            style={{ background: "#FF3D9A" }}
            aria-hidden="true"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="การแจ้งเตือน"
          className="absolute right-0 top-full mt-1 w-72 bg-[#fefae0] border border-[#1F1A14] z-50 shadow-[2px_2px_0_#1F1A14]"
          style={{ maxHeight: "360px", display: "flex", flexDirection: "column" }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#e9edc9] flex-shrink-0">
            <span className="text-xs font-bold uppercase tracking-widest">การแจ้งเตือน</span>
            {unread > 0 && (
              <button
                onClick={() => void markAllRead()}
                className="text-xs text-[#5B8A2A] hover:underline"
              >
                อ่านทั้งหมด
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-3 py-4 text-xs text-[#8A8378] text-center">ยังไม่มีการแจ้งเตือน</p>
          ) : (
            <ul className="overflow-y-auto flex-1" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {notifications.map((n) => {
                const row = (
                  <div
                    className="flex items-start gap-2 px-3 py-2 border-b border-[#e9edc9] hover:bg-[#faedcd] transition-colors"
                    style={{ background: n.read ? "transparent" : "#F0FAE5" }}
                  >
                    <span className="text-base flex-shrink-0 leading-none mt-0.5">{typeIcon(n.type)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-snug break-words">{n.message}</p>
                      <p className="text-xs text-[#8A8378] mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF3D9A] flex-shrink-0 mt-1" aria-hidden="true" />
                    )}
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link href={n.link} onClick={() => setOpen(false)}>
                        {row}
                      </Link>
                    ) : row}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function BellIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
