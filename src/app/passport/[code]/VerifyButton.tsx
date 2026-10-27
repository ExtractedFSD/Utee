"use client";

import { useState, useTransition } from "react";
import { copy } from "@/lib/tracker/copy";
import type { VerificationEntity, VerificationRow } from "@/lib/tracker/verify";
import { verifiedLine } from "@/lib/tracker/verify";
import { verifyEntry } from "./actions";

/** For a signed-in clinician: an outlined Mark checked, or the mint pill with their name and date and a small Undo. */
export function VerifyButton({ code, entity, entityId, verification }: { code: string; entity: VerificationEntity; entityId: string; verification: VerificationRow | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toggle = (on: boolean) => { setError(null); startTransition(async () => { const r = await verifyEntry(code, entity, entityId, on); if (r.error) setError(r.error); }); };
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {verification ? (
        <>
          <span className="inline-flex items-center rounded-full bg-mint-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900">{verifiedLine(verification)}</span>
          <button type="button" disabled={pending} onClick={() => toggle(false)} className="text-[12px] font-semibold text-maroon disabled:opacity-60">{copy.shared.unverify}</button>
        </>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => toggle(true)}
          className="inline-flex min-h-[40px] items-center rounded-full border border-midnight/15 bg-white px-4 text-[11px] font-semibold uppercase tracking-[.12em] text-midnight hover:bg-pink-25 disabled:opacity-60"
        >
          {copy.shared.verify}
        </button>
      )}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}
