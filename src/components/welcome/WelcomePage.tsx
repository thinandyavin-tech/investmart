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
    <div className="min-h-screen bg-[#0A0F1A] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(74,222,128,0.07) 0%, transparent 70%)",
        }}
      />

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
