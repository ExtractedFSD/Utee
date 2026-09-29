"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, inputClass, Logo } from "@/components/ui";
import { prepareSignIn } from "./actions";

/**
 * `next` is attacker-controllable (anyone can hand out a /login?next=… link),
 * so only same-origin paths are honoured, never an absolute or
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

  const [mode, setMode] = useState<"signin" | "signup">(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
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

    const prepared = await prepareSignIn(normalized, mode, fullName, dateOfBirth);
    if (!prepared.ok) {
      setBusy(false);
      const messages: Record<string, string> = {
        "invalid-email": "Please enter a valid email address.",
        "name-required": "Please tell us your name.",
        "dob-required": "Please enter your date of birth.",
        exists: "There's already an account for that email. Sign in instead.",
        "no-account": fromKit
          ? "We couldn't find an account for that email. If you bought your kit in a shop, create an account first."
          : "We couldn't find an account for that email. Use the email from your Utee order, or create an account.",
      };
      setError(messages[prepared.reason]);
      return;
    }

    // shouldCreateUser: false, the account now exists in every valid case;
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
      <div className="text-center mb-8 text-white">
        <Logo className="h-14 w-auto mx-auto" />
        <p className="text-sm text-white/85 mt-3">
          Track your UTIs, tests, orders and subscriptions.
        </p>
      </div>
      <div className="bg-white rounded-card shadow-card p-6">
        {step === "email" ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div className="flex rounded-full bg-pink-25 p-1 text-eyebrow uppercase">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={`flex-1 rounded-full py-2 transition-colors ${
                    mode === m ? "bg-white text-midnight shadow-card" : "text-slate-600"
                  }`}
                  aria-pressed={mode === m}
                >
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>
            {mode === "signup" && (
              <div>
                <label htmlFor="login-name" className="block text-sm font-medium text-slate-700 mb-1">
                  Your name
                </label>
                <input
                  id="login-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="First and last name"
                  className={inputClass}
                />
              </div>
            )}
            {mode === "signup" && (
              <div>
                <label htmlFor="login-dob" className="block text-sm font-medium text-slate-700 mb-1">
                  Date of birth
                </label>
                <input
                  id="login-dob"
                  type="date"
                  required
                  autoComplete="bday"
                  max={new Date().toISOString().slice(0, 10)}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
              <p className="text-xs text-slate-500 mt-1.5">
                {mode === "signup"
                  ? fromKit
                    ? "Bought your kit in a shop? Create an account and we'll link the kit to it. We'll email you a one-time code. No password needed."
                    : "We'll email you a one-time code to confirm your address. No password needed."
                  : fromKit
                    ? "Ordered from the Utee store? Use the email on your order. Bought your kit elsewhere? Create an account first. We'll email you a one-time code. No password needed."
                    : "Use the email from your Utee order and we'll send you a one-time sign-in code. No password needed."}
              </p>
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Sending..." : mode === "signup" ? "Create account" : "Email me a code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <div>
              <label htmlFor="login-code" className="block text-sm font-medium text-slate-700 mb-1">
                Enter your sign-in code
              </label>
              <input
                id="login-code"
                inputMode="numeric"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Code from your email"
                className={`${inputClass} text-center tracking-[0.5em] text-lg`}
              />
              <p className="text-xs text-slate-500 mt-1.5">
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
              className="w-full text-sm text-slate-500 hover:text-midnight"
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
    <div className="min-h-screen bg-gradient-brand flex items-center justify-center px-4 py-12">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
