"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, inputClass, Logo } from "@/components/ui";
import { formatKitCode, normalizeKitCode } from "@/lib/kit-code";

/**
 * For anyone who can't scan the QR: type the code printed under it. The
 * code is checked here (right characters, right check character) and then
 * follows exactly the same route as a scan, including signing in first.
 */
export default function StartPage() {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  function go(e: React.FormEvent) {
    e.preventDefault();
    const code = normalizeKitCode(raw);
    if (!code) {
      setError(
        "That doesn't look like a Utee kit code. It has 8 letters and numbers, printed under the QR code like UT-7K4M-92QX. Check each character and try again."
      );
      return;
    }
    setError(null);
    router.push(`/k/${code}`);
  }

  return (
    <div className="min-h-screen bg-gradient-brand flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 text-white">
          <Logo className="h-14 w-auto mx-auto" />
          <p className="text-sm text-white/85 mt-3">Start your Utee test without scanning.</p>
        </div>
        <form onSubmit={go} className="bg-white rounded-card shadow-card p-6 space-y-4">
          <div>
            <h1 className="font-display text-2xl font-light text-midnight">Enter your kit code</h1>
            <p className="text-sm text-slate-500 mt-1.5">
              It is printed under the QR code on the leaflet in your kit, and on the sample bag.
            </p>
          </div>
          <div>
            <label htmlFor="kit-code" className="block text-sm font-medium text-slate-700 mb-1">
              Kit code
            </label>
            <input
              id="kit-code"
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setError(null);
              }}
              placeholder="UT-XXXX-XXXX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus
              className={`${inputClass} text-center font-mono text-lg uppercase tracking-widest placeholder:text-base placeholder:tracking-normal`}
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Dashes and capitals don&apos;t matter. {normalizeKitCode(raw) ? `We read that as ${formatKitCode(normalizeKitCode(raw)!)}.` : ""}
            </p>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" className="w-full">
            Continue
          </Button>
          <p className="text-xs text-slate-500 text-center">
            You&apos;ll be asked to sign in or create an account first, then taken to your questionnaire.
          </p>
        </form>
      </div>
    </div>
  );
}
