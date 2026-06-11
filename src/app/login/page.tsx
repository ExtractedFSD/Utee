"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, inputClass } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const supabase = createClient();

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // shouldCreateUser: false — accounts are created automatically when an
    // order is placed; this stops strangers signing up directly.
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) {
      setError(
        error.message.toLowerCase().includes("signups")
          ? "We couldn't find an account for that email. Use the email address from your Utee order."
          : error.message
      );
      return;
    }
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) {
      setError("That code didn't work. Check it and try again.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <span className="text-4xl font-bold tracking-tight text-brand-600">utee</span>
        <p className="text-sm text-slate-500 mt-2">
          Your secure portal for orders, tests and subscriptions.
        </p>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        {step === "email" ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Use the email from your Utee order — we&apos;ll send you a one-time
                sign-in code. No password needed.
              </p>
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Sending…" : "Email me a code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Enter the 6-digit code
              </label>
              <input
                inputMode="numeric"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className={`${inputClass} text-center tracking-[0.5em] text-lg`}
              />
              <p className="text-xs text-slate-400 mt-1.5">
                We sent a code to <strong>{email}</strong>.
              </p>
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Checking…" : "Sign in"}
            </Button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-sm text-slate-500 hover:text-slate-900"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
