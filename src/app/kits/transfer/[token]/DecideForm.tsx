"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { decideByToken } from "./actions";

type Outcome = Awaited<ReturnType<typeof decideByToken>>;

/** Two buttons, then the result in place. Nothing happens on page load, so a mail scanner opening the link changes nothing. */
export function DecideForm({ token, kitCode, requesterName, initialDecline }: { token: string; kitCode: string; requesterName: string; initialDecline: boolean }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<Outcome | null>(null);
  const run = (approve: boolean) => startTransition(async () => setDone(await decideByToken(token, approve)));

  if (done) {
    const text: Record<Outcome["outcome"], string> = {
      approved: `Done. Kit ${done.kitCode} is now on ${requesterName}'s account, and we've emailed them. It has left yours.`,
      declined: `Understood. Kit ${done.kitCode} stays on your account and ${requesterName} has been told.`,
      expired: "This link has expired. If you still want to pass the kit on, ask them to scan it again and a fresh link will come to you.",
      already: `Kit ${done.kitCode} has already been passed on.`,
      unavailable: "This kit can't be passed on any more: it has been used, moved, or the request was withdrawn.",
    };
    return <p className="text-base text-midnight leading-relaxed" data-testid="transfer-result">{text[done.outcome]}</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      {!initialDecline && <Button disabled={pending} onClick={() => run(true)}>{pending ? "One moment…" : "Yes, pass it on"}</Button>}
      <Button variant={initialDecline ? "primary" : "secondary"} disabled={pending} onClick={() => run(false)}>{pending ? "One moment…" : "No, keep it on my account"}</Button>
      {initialDecline && <button type="button" disabled={pending} onClick={() => run(true)} className="min-h-[44px] px-2 text-sm font-semibold text-maroon">Actually, pass it on</button>}
    </div>
  );
}
