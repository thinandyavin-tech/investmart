"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { OffsetButton } from "@/components/OffsetButton";

interface Notification {
  id:        string;
  type:      string;
  message:   string;
  read:      boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unread:        number;
}

export default function MailPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread]               = useState(0);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json() as Promise<NotificationsResponse>)
      .then(({ notifications: n, unread: u }) => {
        setNotifications(n ?? []);
        setUnread(u ?? 0);
      })
      .catch(() => setError("ไม่สามารถโหลดการแจ้งเตือนได้"))
      .finally(() => setLoading(false));
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  return (
    <AppShell>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xs font-bold uppercase tracking-widest">
            จดหมาย / แจ้งเตือน
          </h1>
          {unread > 0 && (
            <OffsetButton variant="lime" size="sm" onClick={() => void markAllRead()}>
              อ่านทั้งหมด ({unread})
            </OffsetButton>
          )}
        </div>

        {loading ? (
          <div className="text-xs text-[#8A8378] text-center py-8">กำลังโหลด...</div>
        ) : error ? (
          <div className="text-xs text-red-600 text-center py-8">{error}</div>
        ) : notifications.length === 0 ? (
          <Card className="p-4 text-center">
            <p className="text-xs text-[#8A8378]">ยังไม่มีการแจ้งเตือน</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <Card key={n.id} className={`p-3 ${n.read ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold bg-[#1F1A14] text-white px-2 py-0.5 flex-shrink-0 uppercase tracking-widest">
                    {n.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">{n.message}</p>
                    <p className="text-xs text-[#8A8378] mt-0.5">
                      {new Date(n.createdAt).toLocaleString("th-TH")}
                    </p>
                  </div>
                  {!n.read && (
                    <span
                      className="w-2 h-2 rounded-full bg-[#5B8A2A] flex-shrink-0 mt-0.5"
                      aria-label="ยังไม่ได้อ่าน"
                    />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
