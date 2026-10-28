"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, inputClass } from "@/components/ui";
import { passOnKit } from "./actions";

/*
 * "Is this test for someone else?" A disclosure on the kit page, only while
 * the kit is unused. Confirming releases the kit from this account and
 * sends the buyer home with the code to pass on.
 */
export function PassOnKit({ kitId, kitCode }: { kitId: string; kitCode: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sure, setSure] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await passOnKit(kitId, email);
      if ("error" in r) setError(r.error);
      else router.push(`/portal?kit=released&code=${encodeURIComponent(r.code)}`);
    });
  };

  return (
    <div className="rounded-card bg-white p-6 shadow-card" data-testid="pass-on">
      <h2 className="font-display text-2xl font-light text-midnight">Is this test for someone else?</h2>
      <p className="mt-2 text-sm text-[#5a4a6e] leading-relaxed">
        If you ordered kit {kitCode} for another person, pass it on so it registers to their own account. Their symptom form and result will be theirs, not on your account.
      </p>
      {!open ? (
        <div className="mt-4">
          <Button variant="secondary" type="button" onClick={() => setOpen(true)}>Pass this kit on</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="pass-on-email" className="block text-sm font-semibold text-midnight mb-1">Their email (optional)</label>
            <input id="pass-on-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={inputClass} />
            <p className="mt-1.5 text-xs text-[#8a7a9c]">We&apos;ll email them the kit code and how to register it. Leave blank to tell them yourself.</p>
          </div>
          <label className="flex items-start gap-3 rounded-2xl bg-pink-25 p-4">
            <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-1 h-5 w-5 rounded" />
            <span className="text-sm text-midnight">I understand this kit will leave my account. Whoever scans it next registers it to theirs, and I won&apos;t see their symptoms or result.</span>
          </label>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!sure || pending}>{pending ? "One moment…" : "Pass it on"}</Button>
            <button type="button" onClick={() => { setOpen(false); setError(null); }} className="min-h-[44px] px-2 text-sm font-semibold text-maroon">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
