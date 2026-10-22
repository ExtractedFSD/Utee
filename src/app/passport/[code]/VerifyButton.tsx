"use client";

import { useState, useTransition } from "react";
import { copy } from "@/lib/tracker/copy";
import type { VerificationEntity } from "@/lib/tracker/verify";
import { verifyEntry } from "./actions";

export function VerifyButton({ code, entity, entityId, verified }: { code: string; entity: VerificationEntity; entityId: string; verified: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => { setError(null); startTransition(async () => { const r = await verifyEntry(code, entity, entityId, !verified); if (r.error) setError(r.error); }); }}
        className={`min-h-[36px] rounded-full border px-3 text-xs font-semibold transition-colors disabled:opacity-60 ${verified ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50" : "border-maroon bg-maroon text-white hover:bg-brand-700"}`}
      >
        {verified ? copy.shared.unverify : copy.shared.verify}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}
