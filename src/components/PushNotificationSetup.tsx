"use client";

import { useEffect, useState } from "react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

async function subscribe(reg: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return null;

  // Convert base64url VAPID key to Uint8Array
  const raw    = atob(vapidKey.replace(/-/g, "+").replace(/_/g, "/"));
  const keyArr = Uint8Array.from(raw, (c) => c.charCodeAt(0));

  try {
    return await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: keyArr,
    });
  } catch {
    return null;
  }
}

async function saveSub(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  await fetch("/api/push/subscribe", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      endpoint: json.endpoint,
      keys:     { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    }),
  });
}

interface PushNotificationSetupProps {
  /** Compact chip style (for inside alert cards) vs. standalone card */
  compact?: boolean;
}

export function PushNotificationSetup({ compact = false }: PushNotificationSetupProps) {
  const [status, setStatus] = useState<PermissionState>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) { setStatus("unsupported"); return; }
    if (Notification.permission === "granted") setStatus("granted");
    if (Notification.permission === "denied")  setStatus("denied");
  }, []);

  if (status === "unsupported" || status === "granted") return null;

  async function enable() {
    if (loading) return;
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus("denied"); return; }

      const reg = await registerSW();
      if (!reg) { setStatus("unsupported"); return; }

      const sub = await subscribe(reg);
      if (sub) await saveSub(sub);

      setStatus("granted");
    } catch {
      setStatus("denied");
    } finally {
      setLoading(false);
    }
  }

  if (status === "denied") {
    if (compact) return null;
    return (
      <p className="text-xs text-slate-400">
        การแจ้งเตือนถูกบล็อก — เปิดในการตั้งค่าเบราว์เซอร์เพื่อรับแจ้งเตือน
      </p>
    );
  }

  if (compact) {
    return (
      <button
        onClick={() => void enable()}
        disabled={loading}
        className="text-xs text-violet-600 hover:text-violet-800 underline disabled:opacity-50 flex-shrink-0"
      >
        {loading ? "กำลังเปิด..." : "เปิดการแจ้งเตือน"}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 bg-violet-50 border border-violet-200 rounded-xl">
      <div>
        <p className="text-xs font-semibold text-violet-800">รับแจ้งเตือนราคาหุ้น</p>
        <p className="text-xs text-violet-600 mt-0.5">แจ้งเตือนทันทีเมื่อราคาถึงเป้าหมาย</p>
      </div>
      <button
        onClick={() => void enable()}
        disabled={loading}
        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors flex-shrink-0"
      >
        {loading ? "..." : "เปิด"}
      </button>
    </div>
  );
}
