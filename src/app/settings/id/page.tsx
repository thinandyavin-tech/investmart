"use client";

import { useState } from "react";
import { useUser } from "@/lib/userContext";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { OffsetButton } from "@/components/OffsetButton";

export default function SettingsIdPage() {
  const { user, loading, refreshUser } = useUser();

  const [username, setUsername] = useState("");
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState("");

  async function handleSave() {
    if (!username.trim()) return;
    setSaving(true);
    setMsg("");
    try {
      const res  = await fetch("/api/user/username", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username: username.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setMsg(data.error ?? "เกิดข้อผิดพลาด"); return; }
      await refreshUser();
      setMsg("ตั้งค่า username แล้ว ✓");
      setUsername("");
    } catch {
      setMsg("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-sm mx-auto px-4 py-8 space-y-3">
          <div className="h-10 bg-[#E8E2D4] animate-pulse rounded" />
          <div className="h-10 bg-[#E8E2D4] animate-pulse rounded" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="max-w-sm mx-auto px-4 py-8 text-center">
          <p className="text-xs text-[#8A8378]">กรุณาเข้าสู่ระบบก่อน</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-sm mx-auto px-4 py-4 flex flex-col gap-4">
        <h1 className="text-xs font-bold uppercase tracking-widest">ตั้งค่าไอดี</h1>

        <Card className="p-4 flex flex-col gap-3">
          <div>
            <p className="text-[9px] text-[#8A8378] uppercase tracking-wide mb-0.5">User ID (ถาวร)</p>
            <p
              className="text-xs font-bold break-all"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {user.id}
            </p>
          </div>

          <div className="border-t border-[#E8E2D4] pt-3">
            <p className="text-[9px] text-[#8A8378] uppercase tracking-wide mb-0.5">Username ปัจจุบัน</p>
            <p className="text-xs font-bold" style={{ fontFamily: "var(--font-mono)" }}>
              {user.username ? `@${user.username}` : "ยังไม่ได้ตั้ง"}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-[10px] font-bold uppercase tracking-widest">
            {user.username ? "เปลี่ยน Username" : "ตั้ง Username"}
          </h2>
          <p className="text-[9px] text-[#8A8378] leading-relaxed">
            3-30 ตัวอักษร · ใช้ a-z, A-Z, 0-9, _ เท่านั้น · ไม่มีช่องว่าง
          </p>

          <div>
            <label className="block text-[9px] text-[#8A8378] uppercase tracking-wide mb-1" htmlFor="username-input">
              Username ใหม่
            </label>
            <div className="flex items-center border border-[#1F1A14] bg-[#FBF7ED] overflow-hidden">
              <span className="px-2 text-[10px] text-[#8A8378] border-r border-[#1F1A14] py-2">@</span>
              <input
                id="username-input"
                type="text"
                value={username}
                maxLength={30}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                className="flex-1 px-2 py-2 text-xs font-bold bg-transparent focus:outline-none"
                placeholder="username"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>

          <OffsetButton
            variant="lime"
            onClick={() => void handleSave()}
            disabled={saving || username.trim().length < 3}
            className="w-full"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก Username"}
          </OffsetButton>

          {msg && (
            <p
              className="text-[10px] font-bold text-center"
              style={{ color: msg.includes("✓") ? "#5B8A2A" : "#DC2626" }}
              role="status"
              aria-live="polite"
            >
              {msg}
            </p>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
