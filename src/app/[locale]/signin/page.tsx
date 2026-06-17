"use client";

import { useState, useEffect, Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter }     from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { OffsetButton } from "@/components/OffsetButton";
import { useUser } from "@/lib/userContext";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

const OAUTH_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: "This email is linked to another account. Please use your original sign-in method.",
  AccessDenied:          "Access not yet granted — the app is in testing. Please contact the admin.",
  Verification:          "Verification link expired. Please try again.",
  Default:               "Sign-in error. Please try again.",
};

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refreshUser, initDemo } = useUser();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState(() => {
    const code = params.get("error") ?? "";
    return OAUTH_ERRORS[code] ?? (code ? OAUTH_ERRORS.Default : "");
  });
  const [loading,  setLoading]  = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  async function handleGuest() {
    setGuestLoading(true);
    try {
      await initDemo();
      router.replace("/");
    } finally {
      setGuestLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email:    email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Incorrect email or password.");
      setLoading(false);
      return;
    }

    await refreshUser();
    router.push("/profile");
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8 flex flex-col gap-4">
      <div>
        <h1 className="text-xs font-bold uppercase tracking-widest">Sign in</h1>
        <p className="text-xs text-[#8A8378] mt-0.5">InvestMart — US stock social network</p>
      </div>

      <Card className="p-4">
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-[#8A8378] uppercase tracking-wide mb-1" htmlFor="signin-email">
              Email
            </label>
            <input
              id="signin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full border border-[#1F1A14] bg-[#fefae0] px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#1F1A14]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs text-[#8A8378] uppercase tracking-wide mb-1" htmlFor="signin-password">
              Password
            </label>
            <input
              id="signin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full border border-[#1F1A14] bg-[#fefae0] px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#1F1A14]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs font-bold text-center" style={{ color: "#DC2626" }} role="alert" aria-live="polite">
              {error}
            </p>
          )}

          <OffsetButton
            variant="lime"
            className="w-full"
            disabled={loading || !email.trim() || !password}
          >
            {loading ? "Signing in…" : "Sign in"}
          </OffsetButton>
        </form>
      </Card>

      <Card className="p-4 flex flex-col gap-3">
        <p className="text-xs text-[#8A8378] text-center uppercase tracking-wide">or continue with</p>
        <button
          onClick={() => void signIn("google", { callbackUrl: "/profile" })}
          className="w-full flex items-center justify-center gap-2 border-2 border-[#1F1A14] bg-white px-3 py-2.5 text-xs font-bold hover:bg-[#faedcd] transition-colors"
          style={{ boxShadow: "2px 2px 0 #1F1A14" }}
          type="button"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </Card>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#e9edc9]" />
        <span className="text-xs text-[#8A8378]">or</span>
        <div className="flex-1 h-px bg-[#e9edc9]" />
      </div>

      <button
        onClick={() => void handleGuest()}
        disabled={guestLoading || loading}
        className="w-full py-2.5 text-xs font-semibold text-[#8A8378] border border-[#e9edc9] hover:border-[#1F1A14] hover:text-[#1F1A14] transition-colors disabled:opacity-40"
      >
        {guestLoading ? "Loading…" : "Continue as Guest"}
      </button>

      <p className="text-xs text-center text-[#8A8378]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-bold text-[#5B8A2A] underline">
          Sign up
        </Link>
      </p>

      <p className="text-xs text-[#8A8378] text-center">
        InvestMart
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="max-w-sm mx-auto px-4 py-8"><div className="h-4 w-32 bg-[#e9edc9] animate-pulse rounded" /></div>}>
        <SignInForm />
      </Suspense>
    </AppShell>
  );
}
