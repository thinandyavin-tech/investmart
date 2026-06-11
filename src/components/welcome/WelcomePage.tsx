"use client";

import { useState, useCallback } from "react";
import Image                     from "next/image";
import { signIn }                from "next-auth/react";
import { useRouter }             from "@/i18n/navigation";
import { useI18n }               from "@/lib/i18n";
import { useUser }               from "@/lib/userContext";
import { Link }                  from "@/i18n/navigation";

export function WelcomePage() {
  const { t }         = useI18n();
  const { initDemo }  = useUser();
  const router        = useRouter();
  const wt            = t.welcome;

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [busy,          setBusy]          = useState(false);
  const [error,         setError]         = useState("");

  const handleGuest = useCallback(async () => {
    setBusy(true);
    try {
      await initDemo();
      router.replace("/");
    } finally {
      setBusy(false);
    }
  }, [initDemo, router]);

  const handleGoogle = useCallback(async () => {
    setBusy(true);
    await signIn("google", { callbackUrl: "/" });
  }, []);

  const handleEmailSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setBusy(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        email:    email.trim().toLowerCase(),
        password: password.trim(),
        redirect: false,
      });
      if (result?.error === "CredentialsSignin") {
        setError(wt.wrongPassword);
      } else if (result?.error) {
        setError(result.error.includes("rate") ? wt.rateLimited : wt.networkError);
      } else {
        router.replace("/");
      }
    } catch {
      setError(wt.networkError);
    } finally {
      setBusy(false);
    }
  }, [email, password, router, wt]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: "#0B1220" }}>

      {/* ── Simulated blurred app dashboard in background ── */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">

        {/* Ticker tape strip */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-[#0F1A2E] border-b border-[#1E3A5F] opacity-70 flex items-center gap-6 px-4 overflow-hidden">
          {["NVDA +3.2%", "AAPL +1.1%", "TSLA -0.8%", "MSFT +2.4%", "META +1.7%", "GOOGL +0.9%", "AMZN +1.3%", "S&P +0.6%"].map((t) => (
            <span key={t} className="text-[9px] font-mono text-[#4ADE80] whitespace-nowrap opacity-80">{t}</span>
          ))}
        </div>

        {/* Left sidebar cards */}
        <div className="absolute left-4 top-16 w-44 flex flex-col gap-2 opacity-40 blur-[3px]">
          {/* Portfolio card */}
          <div className="bg-[#0F1A2E] border border-[#1E3A5F] rounded p-3">
            <p className="text-[8px] text-[#4A6A8A] uppercase tracking-widest mb-1">Portfolio</p>
            <p className="text-sm font-bold font-mono text-[#4ADE80]">฿1,347,820</p>
            <p className="text-[9px] text-[#4ADE80]">+7.8% ▲</p>
          </div>
          {/* Holdings mini list */}
          <div className="bg-[#0F1A2E] border border-[#1E3A5F] rounded p-2 flex flex-col gap-1">
            {["NVDA · $892", "AAPL · $445", "TSLA · $212"].map(h => (
              <div key={h} className="flex justify-between text-[8px] font-mono">
                <span className="text-[#8A9EB8]">{h.split(" · ")[0]}</span>
                <span className="text-[#4ADE80]">{h.split(" · ")[1]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center chart (candlestick mockup) */}
        <div className="absolute left-1/2 -translate-x-1/2 top-20 w-72 opacity-30 blur-[2px]">
          <div className="bg-[#0F1A2E] border border-[#1E3A5F] rounded p-3">
            <div className="flex items-end gap-[2px] h-20">
              {[30,45,35,60,42,70,55,80,65,90,75,100,85,72,95,110,88,120,105,130].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0" style={{ height: 120 }}>
                  <div style={{ height: `${130 - h}px` }} />
                  <div
                    className="w-full rounded-[1px]"
                    style={{ height: `${h * 0.6}px`, background: i % 3 === 1 ? "#4ADE80" : "#EF4444", opacity: 0.8 }}
                  />
                </div>
              ))}
            </div>
            <p className="text-[8px] text-[#4A6A8A] mt-1 text-center font-mono">NVDA · 3M</p>
          </div>
        </div>

        {/* Right side — news cards */}
        <div className="absolute right-4 top-16 w-52 flex flex-col gap-2 opacity-35 blur-[3px]">
          {[
            { t: "Fed holds rates steady amid inflation concerns", s: "Reuters · 2m ago" },
            { t: "NVIDIA beats Q4 earnings, raises guidance", s: "Bloomberg · 15m ago" },
            { t: "S&P 500 hits new all-time high on tech rally", s: "CNBC · 1h ago" },
          ].map(({ t: title, s: src }) => (
            <div key={title} className="bg-[#0F1A2E] border border-[#1E3A5F] rounded p-2">
              <p className="text-[8px] text-[#C0D0E0] leading-snug mb-1 line-clamp-2">{title}</p>
              <p className="text-[7px] text-[#4A6A8A]">{src}</p>
            </div>
          ))}
        </div>

        {/* Bottom radar scan strip */}
        <div className="absolute bottom-16 left-4 right-4 opacity-25 blur-[2px]">
          <div className="bg-[#0F1A2E] border border-[#1E3A5F] rounded p-2 flex gap-3 overflow-hidden">
            {["NVDA", "AAPL", "MSFT", "TSLA", "META", "AMZN", "GOOGL", "AMD"].map(t => (
              <div key={t} className="flex flex-col items-center gap-0.5 flex-shrink-0">
                <span className="text-[8px] font-mono font-bold text-[#4ADE80]">{t}</span>
                <span className="text-[7px] text-[#4A6A8A]">▲{(Math.random() * 5).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Global frosted-glass overlay */}
        <div className="absolute inset-0" style={{ backdropFilter: "blur(12px)", background: "rgba(11,18,32,0.72)" }} />

        {/* Radial green glow */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 60% 40% at 50% 35%, rgba(74,222,128,0.06) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6">

        {/* Logo */}
        <div className="w-64 h-auto">
          <Image
            src="/logo.png"
            alt="InvestMart"
            width={512}
            height={512}
            priority
            className="w-full h-auto object-contain"
          />
        </div>

        {/* Byline */}
        <p className="text-[11px] text-[#4ADE80] font-bold tracking-widest uppercase">
          {wt.byline}
        </p>

        {/* Purpose */}
        <p className="text-center text-xs text-[#8A9EB8] leading-relaxed max-w-xs">
          {wt.purpose}
        </p>

        {/* Auth options */}
        <div className="w-full flex flex-col gap-3">

          {/* Email form toggle */}
          {!showEmailForm ? (
            <button
              onClick={() => setShowEmailForm(true)}
              disabled={busy}
              className="w-full py-3 px-4 text-sm font-bold text-white border-2 border-[#4ADE80] hover:bg-[#4ADE80] hover:text-[#0A0F1A] transition-colors disabled:opacity-40"
            >
              {wt.signInEmail}
            </button>
          ) : (
            <form onSubmit={(e) => void handleEmailSignIn(e)} className="flex flex-col gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={wt.emailLabel}
                required
                autoFocus
                className="w-full py-2.5 px-3 text-sm bg-[#141C2B] border border-[#2A3A50] text-white placeholder:text-[#4A5A70] focus:outline-none focus:border-[#4ADE80]"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={wt.passwordLabel}
                required
                className="w-full py-2.5 px-3 text-sm bg-[#141C2B] border border-[#2A3A50] text-white placeholder:text-[#4A5A70] focus:outline-none focus:border-[#4ADE80]"
              />
              {error && (
                <p className="text-xs text-red-400 px-1">{error}</p>
              )}
              <button
                type="submit"
                disabled={busy || !email.trim() || !password.trim()}
                className="w-full py-2.5 text-sm font-bold text-[#0A0F1A] bg-[#4ADE80] hover:bg-[#22C55E] transition-colors disabled:opacity-40"
              >
                {busy ? wt.signingIn : wt.signInBtn}
              </button>
              <div className="flex justify-between text-xs text-[#4A5A70]">
                <button type="button" onClick={() => setShowEmailForm(false)} className="hover:text-white">
                  ← {t.common.back}
                </button>
                <span>
                  {wt.noAccount}{" "}
                  <Link href="/signup" className="text-[#4ADE80] hover:underline">
                    {wt.createAccount}
                  </Link>
                </span>
              </div>
            </form>
          )}

          {/* Divider */}
          {!showEmailForm && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#1E2A3A]" />
                <span className="text-xs text-[#4A5A70]">{wt.orDivider}</span>
                <div className="flex-1 h-px bg-[#1E2A3A]" />
              </div>

              {/* Google */}
              <button
                onClick={() => void handleGoogle()}
                disabled={busy}
                className="w-full py-3 px-4 text-sm font-bold text-white bg-[#141C2B] border border-[#2A3A50] hover:border-[#4ADE80] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <GoogleIcon />
                {wt.signInGoogle}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#1E2A3A]" />
                <span className="text-xs text-[#4A5A70]">{wt.orDivider}</span>
                <div className="flex-1 h-px bg-[#1E2A3A]" />
              </div>

              {/* Guest */}
              <button
                onClick={() => void handleGuest()}
                disabled={busy}
                className="w-full py-3 px-4 text-sm font-semibold text-[#4A5A70] hover:text-white border border-[#1E2A3A] hover:border-[#2A3A50] transition-colors disabled:opacity-40"
              >
                {wt.continueGuest}
              </button>

              <p className="text-center text-[10px] text-[#344A60] leading-relaxed px-2">
                {wt.guestNote}
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-4 text-[10px] text-[#344A60] pt-2">
          <Link href="/terms"   className="hover:text-[#4A5A70] transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-[#4A5A70] transition-colors">Privacy</Link>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
