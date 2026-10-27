"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, inputClass, Logo } from "@/components/ui";
import { kitOrigin, prepareSignIn, type KitOrigin } from "./actions";

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
// Supabase allows one email per address per minute; the countdown matches it.
const RESEND_COOLDOWN_S = 60;
// Supabase emails an 8-digit code for this project (Auth settings, OTP length).
const CODE_LENGTH = 8;

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
 * then sends the code. The code step looks like six boxes but is one
 * invisible input laid over them, so typing, deleting, pasting and the
 * phone's autofill all behave like any text field, and the code checks
 * itself as soon as the last digit lands.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const fromKit = next.startsWith("/k/");
  const kitCode = fromKit ? next.slice(3).split(/[/?#]/)[0] : null;
  const linkFailed = searchParams.get("error") === "link";

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [code, setCode] = useState("");
  const [codeFocused, setCodeFocused] = useState(false);
  const [kit, setKit] = useState<KitOrigin | null>(null);
  // The email an online kit refused once; submitting it a second time goes on to create the account.
  const [onlineMismatch, setOnlineMismatch] = useState<string | null>(null);
  const [step, setStep] = useState<"email" | "details" | "code">(searchParams.get("mode") === "signup" ? "details" : "email");
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [waitUntil, setWaitUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(
    linkFailed ? "That sign-in link has expired or was already used. Enter your email and we'll send a fresh code." : null
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const codeInput = useRef<HTMLInputElement | null>(null);
  const checking = useRef(false);

  const supabase = createClient();

  useEffect(() => {
    if (!kitCode) return;
    let cancelled = false;
    kitOrigin(kitCode).then((k) => { if (!cancelled) setKit(k); }).catch(() => {});
    return () => { cancelled = true; };
  }, [kitCode]);

  useEffect(() => {
    const pending = readPending();
    if (!pending) return;
    setEmail(pending.email);
    setSentAt(pending.sentAt);
    setStep("code");
  }, []);

  const ownWait = sentAt ? RESEND_COOLDOWN_S - Math.floor((now - sentAt) / 1000) : 0;
  const serverWait = waitUntil ? Math.ceil((waitUntil - now) / 1000) : 0;
  const cooldownLeft = Math.max(0, ownWait, serverWait);
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
      const secs = /after (\d+) seconds?/i.exec(error.message)?.[1];
      if (secs) {
        // Supabase sends one email a minute per address: show its clock, not a guess.
        const at = Date.now();
        setNow(at);
        setWaitUntil(at + Number(secs) * 1000);
        setError(`We sent a code a moment ago. You can ask for another in ${secs} seconds. Check your inbox and spam folder meanwhile.`);
      } else if (/rate|too many/i.test(error.message)) {
        setError("We've sent you several codes in a short time. Give it a few minutes, then check your inbox and spam folder.");
      } else setError(error.message);
      return false;
    }
    setWaitUntil(null);
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
        setEmail(normalized);
        if (kit === "online" && onlineMismatch !== normalized) {
          // The kit was ordered online, so an account exists under the order's
          // email. Say so before making a second account that can't open it.
          setOnlineMismatch(normalized);
          return;
        }
        // No account yet: the same card asks for the two details an account needs.
        setStep("details");
        return;
      }
      setError(messages[prepared.reason]);
      return;
    }
    setOnlineMismatch(null);
    const sent = await requestCode(normalized);
    setBusy(false);
    if (sent) {
      setEmail(normalized);
      setCode("");
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
      codeInput.current?.focus();
      setNotice("New code sent. Only the newest email works, so use that one.");
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
          ? "That code has expired or a newer one was sent. If you have more than one email from us, use the newest one, or ask for a new code."
          : "That code didn't work. If you have more than one email from us, use the newest one; older codes stop working."
      );
      setCode("");
      codeInput.current?.focus();
      return;
    }
    writePending(null);
    router.push(next);
    router.refresh();
  }

  function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.length === CODE_LENGTH) void verifyCode(code);
    else setError(`Enter all ${CODE_LENGTH} digits of the code.`);
  }

  /** Typed, pasted or autofilled: keep the digits, and a full code checks itself. */
  function enterCode(raw: string) {
    const clean = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(clean);
    if (clean.length === CODE_LENGTH) void verifyCode(clean);
  }

  function changeEmail() {
    writePending(null);
    setSentAt(null);
    setCode("");
    setWaitUntil(null);
    setOnlineMismatch(null);
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
            {fromKit && kit && kit !== "unknown" && (
              <div data-testid="kit-hint">
                <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-maroon">Your Utee kit</p>
                <p className="text-sm text-[#5a4a6e] mt-1 leading-relaxed">
                  {kit === "online"
                    ? "This kit was ordered online, so you already have an account. Sign in with the email on that order and we'll take you to the questionnaire."
                    : "Enter your email. If you don't have a Utee account yet we'll set one up in a moment, and link this kit to it."}
                </p>
              </div>
            )}
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
                {fromKit && kit !== "retail"
                  ? "We'll email you a one-time code. No password. Use the email from your Utee order if you have one."
                  : "We'll email you a one-time code. No password, no account to create."}
              </p>
            </div>
            {onlineMismatch && (
              <div className="rounded-2xl bg-sun p-4 text-sm text-midnight leading-relaxed" data-testid="online-mismatch">
                <p>There&apos;s no account for that email. This kit was ordered online, so the account is under the email on the order. Check your order confirmation and sign in with that one.</p>
                <p className="mt-2">Did someone order it for you? Ask them to open the kit in their Utee portal and pass it on to you. Then it will register to your own account.</p>
                <button type="button" onClick={() => setStep("details")} className="mt-2 min-h-[44px] text-sm font-semibold text-maroon">Create a new account with this email anyway</button>
              </div>
            )}
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
              <p id="login-code-label" className={label}>Enter the {CODE_LENGTH}-digit code</p>
              <div className="relative">
                <div className="flex justify-between gap-1.5" aria-hidden>
                  {Array.from({ length: CODE_LENGTH }, (_, i) => {
                    const active = codeFocused && i === Math.min(code.length, CODE_LENGTH - 1);
                    return (
                      <div key={i} className={`flex h-[52px] w-full min-w-0 items-center justify-center rounded-xl border bg-white font-display text-xl text-midnight ${active ? "border-maroon ring-2 ring-pink-50" : "border-maroon-25"} ${busy ? "opacity-60" : ""}`}>
                        {code[i] ?? ""}
                      </div>
                    );
                  })}
                </div>
                <input
                  ref={codeInput}
                  id="login-code"
                  aria-labelledby="login-code-label"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  autoFocus
                  value={code}
                  onChange={(e) => enterCode(e.target.value)}
                  onFocus={() => setCodeFocused(true)}
                  onBlur={() => setCodeFocused(false)}
                  disabled={busy}
                  className="absolute inset-0 h-full w-full cursor-text opacity-0 text-base"
                  style={{ caretColor: "transparent" }}
                />
              </div>
              <p className="text-sm text-[#5a4a6e] mt-3 leading-relaxed">
                Sent to <strong className="font-semibold text-midnight">{email}</strong>{sentAt ? ` at ${new Date(sentAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""} ·{" "}
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
