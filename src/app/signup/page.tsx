"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { OffsetButton } from "@/components/OffsetButton";
import { useUser } from "@/lib/userContext";

export default function SignUpPage() {
  const router = useRouter();
  const { refreshUser } = useUser();

  const [email,    setEmail]    = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    if (password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    setLoading(true);

    const res  = await fetch("/api/auth/signup", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        email:    email.trim().toLowerCase(),
        password,
        username: username.trim() || undefined,
      }),
    });
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "เกิดข้อผิดพลาด");
      setLoading(false);
      return;
    }

    // Auto sign-in after successful signup
    const result = await signIn("credentials", {
      email:    email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    if (result?.error) {
      // Signup succeeded but sign-in failed — redirect to sign-in page
      router.push("/signin");
      return;
    }

    await refreshUser();
    router.push("/profile");
    router.refresh();
  }

  return (
    <AppShell>
      <div className="max-w-sm mx-auto px-4 py-8 flex flex-col gap-4">
        <div>
          <h1 className="text-xs font-bold uppercase tracking-widest">สมัครสมาชิก</h1>
          <p className="text-[9px] text-[#8A8378] mt-0.5">เริ่มต้นด้วย ฿1,250,000 จำลอง</p>
        </div>

        <Card className="p-4">
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
            <div>
              <label className="block text-[9px] text-[#8A8378] uppercase tracking-wide mb-1" htmlFor="su-email">
                อีเมล <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="su-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full border border-[#1F1A14] bg-[#FBF7ED] px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#1F1A14]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-[9px] text-[#8A8378] uppercase tracking-wide mb-1" htmlFor="su-username">
                Username <span className="text-[#8A8378]">(ไม่บังคับ)</span>
              </label>
              <div className="flex items-center border border-[#1F1A14] bg-[#FBF7ED] overflow-hidden">
                <span className="px-2 text-[10px] text-[#8A8378] border-r border-[#1F1A14] py-2">@</span>
                <input
                  id="su-username"
                  type="text"
                  value={username}
                  maxLength={30}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  className="flex-1 px-2 py-2 text-xs font-bold bg-transparent focus:outline-none"
                  placeholder="yourname"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <p className="text-[9px] text-[#8A8378] mt-0.5">3-30 ตัวอักษร a-z 0-9 _ เท่านั้น</p>
            </div>

            <div>
              <label className="block text-[9px] text-[#8A8378] uppercase tracking-wide mb-1" htmlFor="su-password">
                รหัสผ่าน <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="su-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="w-full border border-[#1F1A14] bg-[#FBF7ED] px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#1F1A14]"
                placeholder="อย่างน้อย 8 ตัวอักษร"
              />
            </div>

            <div>
              <label className="block text-[9px] text-[#8A8378] uppercase tracking-wide mb-1" htmlFor="su-confirm">
                ยืนยันรหัสผ่าน <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="su-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                className="w-full border border-[#1F1A14] bg-[#FBF7ED] px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#1F1A14]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-[10px] font-bold text-center" style={{ color: "#DC2626" }} role="alert">
                {error}
              </p>
            )}

            <OffsetButton
              variant="lime"
              className="w-full"
              disabled={loading || !email.trim() || !password || !confirm}
            >
              {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
            </OffsetButton>
          </form>
        </Card>

        <p className="text-[10px] text-center text-[#8A8378]">
          มีบัญชีแล้ว?{" "}
          <Link href="/signin" className="font-bold text-[#5B8A2A] underline">
            เข้าสู่ระบบ
          </Link>
        </p>

        <p className="text-[9px] text-[#8A8378] text-center">
          พอร์ตหุ้นจำลอง ไม่ใช้เงินจริง · InvestMart
        </p>
      </div>
    </AppShell>
  );
}
