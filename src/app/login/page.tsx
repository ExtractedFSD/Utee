"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, inputClass } from "@/components/ui";
import { prepareSignIn } from "./actions";

/**
 * `next` is attacker-controllable (anyone can hand out a /login?next=… link),
 * so only same-origin paths are honoured — never an absolute or
 * protocol-relative URL that would bounce a signed-in patient off-site.
 */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const fromKit = next.startsWith("/k/");

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
    const normalized = email.trim().toLowerCase();

    // Accounts are created automatically when an order is placed. The only
    // way to get one here is to arrive from the QR of a kit that was bought
    // outside the Utee store and hasn't been registered yet.
    const prepared = await prepareSignIn(normalized, next);
    if (!prepared.ok) {
      setBusy(false);
      setError(
        prepared.reason === "invalid-email"
          ? "Please enter a valid email address."
          : fromKit
            ? "We couldn't find an account for that email. If you ordered from the Utee store, use the email address on your order. If this kit is already registered, use the email it was registered with."
            : "We couldn't find an account for that email. Use the email address from your Utee order, or scan the QR code inside your kit to get started."
      );
      return;
    }

    // shouldCreateUser: false — the account now exists in every valid case;
    // this stops strangers signing up directly.
    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
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
                {fromKit
                  ? "Ordered from the Utee store? Use the email on your order. Bought your kit elsewhere? Enter your email and we'll set up your account. Either way we'll send you a one-time sign-in code — no password needed."
                  : "Use the email from your Utee order — we'll send you a one-time sign-in code. No password needed."}
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
                Enter your sign-in code
              </label>
              <input
                inputMode="numeric"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Code from your email"
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
