"use client";

import { Suspense, useEffect, useState } from "react";
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

/**
 * The code step used to live only in React state, so switching to the email
 * app on a phone (which often reloads the tab on return) dropped the patient
 * back at the email box. Asking again minted a new code that made the one in
 * their inbox invalid, and round it went. The pending sign-in now survives a
 * reload for as long as a code is worth trying.
 */
const PENDING_KEY = "utee.login.pending";
const PENDING_TTL_MS = 30 * 60 * 1000;
const RESEND_COOLDOWN_S = 30;

type Pending = { email: string; sentAt: number };

function readPending(): Pending | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Pending>;
    if (typeof parsed.email !== "string" || typeof parsed.sentAt !== "number") return null;
    if (Date.now() - parsed.sentAt > PENDING_TTL_MS) return null;
    return { email: parsed.email, sentAt: parsed.sentAt };
  } catch {
    return null;
  }
}

function writePending(pending: Pending | null) {
  try {
    if (pending) window.localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    else window.localStorage.removeItem(PENDING_KEY);
  } catch {
    // Private mode or storage blocked: the in-memory step still works.
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const fromKit = next.startsWith("/k/");
  const linkFailed = searchParams.get("error") === "link";

  const [mode, setMode] = useState<"signin" | "signup">(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(
    linkFailed ? "That sign-in link has expired or was already used. Enter your email and we'll send a fresh code." : null
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const pending = readPending();
    if (!pending) return;
    setEmail(pending.email);
    setSentAt(pending.sentAt);
    setStep("code");
  }, []);

  const cooldownLeft = sentAt ? Math.max(0, RESEND_COOLDOWN_S - Math.floor((now - sentAt) / 1000)) : 0;
  useEffect(() => {
    if (step !== "code" || cooldownLeft === 0) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [step, cooldownLeft]);

  /**
   * Emails the code. If the email template also carries a link, that link
   * comes back to /auth/confirm and on to `next`, so tapping it works too.
   */
  async function requestCode(normalized: string): Promise<boolean> {
    // shouldCreateUser: false, the account now exists in every valid case;
    // this stops strangers signing up directly.
    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}${next}`,
      },
    });
    if (error) {
      setError(
        /rate|seconds|too many/i.test(error.message)
          ? "We've just sent you a code. Give it a minute, then check your inbox and spam folder."
          : error.message
      );
      return false;
    }
    const at = Date.now();
    setSentAt(at);
    setNow(at);
    writePending({ email: normalized, sentAt: at });
    return true;
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
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

    const sent = await requestCode(normalized);
    setBusy(false);
    if (sent) {
      setEmail(normalized);
      setCode("");
      setStep("code");
    }
  }

  async function resendCode() {
    if (busy || cooldownLeft > 0) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const sent = await requestCode(email);
    setBusy(false);
    if (sent) {
      setCode("");
      setNotice("New code sent. Only the newest code works, so use the latest email.");
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim().replace(/\s+/g, ""),
      type: "email",
    });
    setBusy(false);
    if (error) {
      setError(
        error.code === "otp_expired"
          ? "That code has expired or a newer one was sent. Check for the latest email, or send a new code."
          : "That code didn't work. Check it matches the newest email we sent you."
      );
      return;
    }
    writePending(null);
    router.push(next);
    router.refresh();
  }

  function changeEmail() {
    writePending(null);
    setSentAt(null);
    setCode("");
    setError(null);
    setNotice(null);
    setStep("email");
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
            <div className="flex rounded-full bg-pink-25 p-1 text-sm font-semibold">
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
                autoComplete="email"
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
          <form onSubmit={verifyCode} className="space-y-4" data-testid="code-step">
            <div>
              <label htmlFor="login-code" className="block text-sm font-medium text-slate-700 mb-1">
                Enter your sign-in code
              </label>
              <input
                id="login-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Code from your email"
                className={`${inputClass} text-center text-lg tracking-widest placeholder:text-base placeholder:tracking-normal`}
              />
              <p className="text-xs text-slate-500 mt-1.5">
                We sent a code to <strong>{email}</strong>. Check your spam folder if it hasn't arrived. Only the newest code works.
              </p>
            </div>
            {notice && <p className="text-sm text-emerald-700">{notice}</p>}
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Checking…" : "Sign in"}
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-slate-500">
              <button
                type="button"
                onClick={resendCode}
                disabled={busy || cooldownLeft > 0}
                className="hover:text-midnight disabled:cursor-default disabled:hover:text-slate-500"
              >
                {cooldownLeft > 0 ? `Send a new code (${cooldownLeft}s)` : "Send a new code"}
              </button>
              <button type="button" onClick={changeEmail} className="hover:text-midnight">
                Use a different email
              </button>
            </div>
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
