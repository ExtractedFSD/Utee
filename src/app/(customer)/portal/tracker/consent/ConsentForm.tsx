"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { giveConsent } from "../actions";

export function ConsentForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          const r = await giveConsent(fd);
          if (r?.error) setError(r.error);
        });
      }}
      className="space-y-6"
    >
      <label className="flex items-start gap-3">
        <input type="checkbox" name="tracker" className="mt-1 h-5 w-5 rounded" />
        <span>
          <span className="block text-sm font-semibold text-midnight">{copy.consent.trackerLabel}</span>
          <span className="block text-sm text-slate-700 mt-1 leading-relaxed">{copy.consent.trackerText}</span>
        </span>
      </label>
      <div className="rounded-2xl bg-pink-25 p-4">
        <p className="font-display text-xl font-light text-midnight mb-2">{copy.consent.researchTitle}</p>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="research" className="mt-1 h-5 w-5 rounded" />
          <span>
            <span className="block text-sm font-semibold text-midnight">{copy.consent.researchLabel}</span>
            <span className="block text-sm text-slate-700 mt-1 leading-relaxed">{copy.consent.researchText}</span>
          </span>
        </label>
      </div>
      <p className="text-xs text-slate-500">{copy.consent.separateNote}</p>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : copy.consent.button}</Button>
    </form>
  );
}
