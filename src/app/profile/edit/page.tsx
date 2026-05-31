"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { OffsetButton } from "@/components/OffsetButton";

const NAME_COOLDOWN_DAYS = 5;

function daysUntilNameChange(lastNameChangeAt: string | null): number | null {
  if (!lastNameChangeAt) return null;
  const msSinceChange = Date.now() - new Date(lastNameChangeAt).getTime();
  const msCooldown    = NAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  const msRemaining   = msCooldown - msSinceChange;
  if (msRemaining <= 0) return null;
  return Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
}

export default function ProfileEditPage() {
  const { user, loading, refreshUser } = useUser();
  const router = useRouter();

  const [name, setName]     = useState(() => user?.name ?? "");
  const [bio,  setBio]      = useState(() => user?.bio  ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");

  // Sync fields once user loads
  if (!loading && user && name === "" && bio === "" && (user.name || user.bio)) {
    setName(user.name ?? "");
    setBio(user.bio   ?? "");
  }

  const cooldownDays = daysUntilNameChange(user?.lastNameChangeAt ?? null);
  const nameChangeLocked = cooldownDays !== null;

  async function handleSave() {
    setSaving(true);
    setMsg("");
    try {
      // Send name even if empty — server treats "" as clearing the name (sets null)
      const res  = await fetch("/api/user/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, bio: bio.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setMsg(data.error ?? "เกิดข้อผิดพลาด"); return; }
      await refreshUser();
      setMsg("บันทึกแล้ว ✓");
      setTimeout(() => router.push("/profile"), 800);
    } catch {
      setMsg("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 py-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-[#E8E2D4] animate-pulse rounded" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 py-8 text-center">
          <p className="text-xs text-[#8A8378]">กรุณาเข้าสู่ระบบก่อนแก้ไขโปรไฟล์</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-4">
        <h1 className="text-xs font-bold uppercase tracking-widest">แก้ไขโปรไฟล์</h1>

        <Card className="p-4 flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[9px] text-[#8A8378] uppercase tracking-wide" htmlFor="edit-name">
                ชื่อแสดง (max 50 ตัวอักษร)
              </label>
              {nameChangeLocked && (
                <span className="text-[9px] text-[#DC2626] font-bold">
                  เปลี่ยนชื่อได้อีกครั้งใน {cooldownDays} วัน
                </span>
              )}
            </div>
            <input
              id="edit-name"
              type="text"
              value={name}
              maxLength={50}
              disabled={nameChangeLocked}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[#1F1A14] bg-[#FBF7ED] px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#1F1A14] disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="ชื่อของคุณ"
              aria-describedby="name-count name-cooldown"
            />
            <div className="flex justify-between">
              {nameChangeLocked ? (
                <p id="name-cooldown" className="text-[9px] text-[#DC2626] mt-0.5">
                  ล็อกชั่วคราว — เปลี่ยนชื่อได้ทุก {NAME_COOLDOWN_DAYS} วัน
                </p>
              ) : (
                <span />
              )}
              <p id="name-count" className="text-[9px] text-[#8A8378] mt-0.5 text-right">
                {name.length}/50
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[9px] text-[#8A8378] uppercase tracking-wide mb-1" htmlFor="edit-bio">
              Bio (max 300 ตัวอักษร)
            </label>
            <textarea
              id="edit-bio"
              value={bio}
              maxLength={300}
              rows={4}
              onChange={(e) => setBio(e.target.value)}
              className="w-full border border-[#1F1A14] bg-[#FBF7ED] px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#1F1A14]"
              placeholder="แนะนำตัวเองสั้นๆ — ตัวอักษรเท่านั้น ไม่มีอีโมจิ"
              aria-describedby="bio-count"
            />
            <p id="bio-count" className="text-[9px] text-[#8A8378] mt-0.5 text-right">
              {bio.length}/300
            </p>
          </div>

          <OffsetButton
            variant="lime"
            onClick={() => void handleSave()}
            disabled={saving || nameChangeLocked}
            className="w-full"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
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

        <p className="text-[9px] text-[#8A8378] text-center">
          InvestMart ใช้ข้อความล้วน ไม่มีรูป ไม่มีอีโมจิ
        </p>
      </div>
    </AppShell>
  );
}
