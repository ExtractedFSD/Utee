"use client";

import { Suspense, useEffect, useRef, useState } from "react";
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
const CODE_LENGTH = 6;

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

/*
 * One card, three steps. Email first; the server decides whether that
 * address has an account. If it does, the code is sent straight away. If
 * not, the card asks for a name and date of birth, creates the account and
 * then sends the code. The code step is six boxes that move on by
 * themselves and accept a paste, and checks the code as soon as the sixth
 * digit lands.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const fromKit = next.startsWith("/k/");
  const linkFailed = searchParams.get("error") === "link";

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [step, setStep] = useState<"email" | "details" | "code">(searchParams.get("mode") === "signup" ? "details" : "email");
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(
    linkFailed ? "That sign-in link has expired or was already used. Enter your email and we'll send a fresh code." : null
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const checking = useRef(false);

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

  const messages: Record<string, string> = {
    "invalid-email": "Please enter a valid email address.",
    "name-required": "Please tell us your name.",
    "dob-required": "Please enter your date of birth.",
    exists: "There's already an account for that email, so we've sent a code to it.",
    "no-account": "We couldn't find an account for that email.",
  };

  async function continueWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const normalized = email.trim().toLowerCase();
    const prepared = await prepareSignIn(normalized, "signin");
    if (!prepared.ok) {
      setBusy(false);
      if (prepared.reason === "no-account") {
        // No account yet: the same card asks for the two details an account needs.
        setEmail(normalized);
        setStep("details");
        return;
      }
      setError(messages[prepared.reason]);
      return;
    }
    const sent = await requestCode(normalized);
    setBusy(false);
    if (sent) {
      setEmail(normalized);
      setDigits(Array(CODE_LENGTH).fill(""));
      setStep("code");
    }
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const normalized = email.trim().toLowerCase();
    const prepared = await prepareSignIn(normalized, "signup", fullName, dateOfBirth);
    if (!prepared.ok && prepared.reason !== "exists") {
      setBusy(false);
      setError(messages[prepared.reason]);
      return;
    }
    const sent = await requestCode(normalized);
    setBusy(false);
    if (sent) {
      setEmail(normalized);
      setDigits(Array(CODE_LENGTH).fill(""));
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
      setDigits(Array(CODE_LENGTH).fill(""));
      boxes.current[0]?.focus();
      setNotice("New code sent. Only the newest code works, so use the latest email.");
    }
  }

  async function verifyCode(token: string) {
    if (checking.current) return;
    checking.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: "email",
    });
    setBusy(false);
    checking.current = false;
    if (error) {
      setError(
        error.code === "otp_expired"
          ? "That code has expired or a newer one was sent. Check for the latest email, or send a new code."
          : "That code didn't work. Check it matches the newest email we sent you."
      );
      setDigits(Array(CODE_LENGTH).fill(""));
      boxes.current[0]?.focus();
      return;
    }
    writePending(null);
    router.push(next);
    router.refresh();
  }

  function submitCode(e: React.FormEvent) {
    e.preventDefault();
    const token = digits.join("");
    if (token.length === CODE_LENGTH) void verifyCode(token);
    else setError("Enter all six digits of the code.");
  }

  /** Typing, pasting or autofilling into any box: digits spread forwards from that box, and a full code checks itself. */
  function enterDigits(index: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    const nextDigits = [...digits];
    if (!clean) {
      nextDigits[index] = "";
      setDigits(nextDigits);
      return;
    }
    const start = clean.length > 1 ? (clean.length >= CODE_LENGTH ? 0 : index) : index;
    for (let i = 0; i < clean.length && start + i < CODE_LENGTH; i++) nextDigits[start + i] = clean[i];
    setDigits(nextDigits);
    const last = Math.min(start + clean.length, CODE_LENGTH) - 1;
    boxes.current[Math.min(last + 1, CODE_LENGTH - 1)]?.focus();
    const token = nextDigits.join("");
    if (token.length === CODE_LENGTH) void verifyCode(token);
  }

  function onKey(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      const nextDigits = [...digits];
      nextDigits[index - 1] = "";
      setDigits(nextDigits);
      boxes.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) boxes.current[index - 1]?.focus();
    else if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) boxes.current[index + 1]?.focus();
  }

  function changeEmail() {
    writePending(null);
    setSentAt(null);
    setDigits(Array(CODE_LENGTH).fill(""));
    setError(null);
    setNotice(null);
    setStep("email");
  }

  const label = "block text-base font-semibold text-midnight mb-2";
  const field = `${inputClass} min-h-[44px] rounded-full px-5 text-base`;

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8 text-white">
        <Logo className="h-16 w-auto mx-auto" />
        <p className="text-base text-white/90 mt-3">Your UTI Passport, tests and orders.</p>
      </div>
      <div className="bg-white rounded-card shadow-card p-6">
        {step === "email" && (
          <form onSubmit={continueWithEmail} className="space-y-4">
            <div>
              <label htmlFor="login-email" className={label}>Email address</label>
              <input
                id="login-email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={field}
              />
              <p className="text-sm text-[#5a4a6e] mt-2.5 leading-relaxed">
                {fromKit
                  ? "We'll email you a one-time code. No password. Use the email from your Utee order if you have one."
                  : "We'll email you a one-time code. No password, no account to create."}
              </p>
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "One moment…" : "Continue with email"}
            </Button>
          </form>
        )}

        {step === "details" && (
          <form onSubmit={createAccount} className="space-y-4" data-testid="details-step">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-maroon">New to Utee</p>
              <p className="text-sm text-[#5a4a6e] mt-1 leading-relaxed">
                {fromKit
                  ? "No account for that email yet. Tell us your name and date of birth and we'll link your kit to a new account."
                  : "No account for that email yet. Tell us your name and date of birth and we'll set one up."}
              </p>
            </div>
            <div>
              <label htmlFor="login-email-2" className={label}>Email address</label>
              <input id="login-email-2" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="login-name" className={label}>Your name</label>
              <input id="login-name" type="text" required autoFocus autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="First and last name" className={field} />
            </div>
            <div>
              <label htmlFor="login-dob" className={label}>Date of birth</label>
              <input id="login-dob" type="date" required autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={field} />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "One moment…" : "Create account"}
            </Button>
            <button type="button" onClick={changeEmail} className="block w-full min-h-[44px] text-sm font-semibold text-maroon">Use a different email</button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={submitCode} className="space-y-4" data-testid="code-step">
            <div>
              <p id="login-code-label" className={label}>Enter the 6-digit code</p>
              <div className="flex justify-between gap-2" role="group" aria-labelledby="login-code-label">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { boxes.current[i] = el; }}
                    id={i === 0 ? "login-code" : `login-code-${i + 1}`}
                    aria-label={i === 0 ? "Enter the 6-digit code" : `Digit ${i + 1}`}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    autoFocus={i === 0}
                    value={d}
                    onChange={(e) => enterDigits(i, e.target.value)}
                    onKeyDown={(e) => onKey(i, e)}
                    onFocus={(e) => e.target.select()}
                    disabled={busy}
                    className="h-[52px] w-full min-w-0 rounded-xl border border-maroon-25 bg-white text-center font-display text-2xl text-midnight focus:border-maroon focus:outline-none focus:ring-2 focus:ring-pink-50 disabled:opacity-60"
                  />
                ))}
              </div>
              <p className="text-sm text-[#5a4a6e] mt-3 leading-relaxed">
                Sent to <strong className="font-semibold text-midnight">{email}</strong> ·{" "}
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={busy || cooldownLeft > 0}
                  className="font-semibold text-maroon disabled:cursor-default disabled:text-[#8a7a9c]"
                >
                  {cooldownLeft > 0 ? `Resend in ${cooldownLeft}s` : "Resend"}
                </button>
              </p>
            </div>
            {notice && <p className="text-sm text-emerald-700">{notice}</p>}
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Checking…" : "Sign in"}
            </Button>
            <p className="text-xs text-[#8a7a9c] leading-relaxed">Check your spam folder if it hasn&apos;t arrived. Only the newest code works.</p>
            <button type="button" onClick={changeEmail} className="block w-full min-h-[44px] text-sm font-semibold text-maroon">Use a different email</button>
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
