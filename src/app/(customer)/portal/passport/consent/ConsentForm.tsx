"use client";

import { useState, useTransition } from "react";
import { Button, Notice } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { giveConsent } from "../actions";

/** Both boxes start unticked. The first is checked here before anything is sent, so the error appears at once, under the box it is about. */
export function ConsentForm({ closed = false }: { closed?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [tracker, setTracker] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <form
      noValidate
      action={(fd) => {
        setError(null);
        if (fd.get("tracker") !== "on") { setError(copy.consent.needTick); document.getElementById("consent-tracker")?.focus(); return; }
        startTransition(async () => {
          const r = await giveConsent(fd);
          if (r?.error) setError(r.error);
        });
      }}
      className="space-y-6"
    >
      {closed && <div role="status" data-testid="consent-closed"><Notice tone="pink">{copy.consent.closedNotice}</Notice></div>}
      <div className={error ? "rounded-2xl border-l-4 border-rose-600 pl-4" : ""}>
        <label className="flex items-start gap-3">
          <input id="consent-tracker" type="checkbox" name="tracker" checked={tracker} onChange={(e) => { setTracker(e.target.checked); if (e.target.checked) setError(null); }} aria-invalid={!!error || undefined} aria-describedby={error ? "consent-error" : undefined} className="mt-0.5 h-6 w-6 shrink-0 rounded accent-maroon" />
          <span>
            <span className="block text-sm font-semibold text-midnight">{copy.consent.trackerLabel}</span>
            <span className="block text-sm text-slate-700 mt-1 leading-relaxed">{copy.consent.trackerText}</span>
          </span>
        </label>
        {error && <p id="consent-error" role="alert" className="mt-2 text-sm font-semibold text-rose-700">{error}</p>}
      </div>
      <div className="rounded-2xl bg-pink-25 p-4">
        <p className="font-display text-xl font-light text-midnight mb-2">{copy.consent.researchTitle}</p>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="research" className="mt-0.5 h-6 w-6 shrink-0 rounded accent-maroon" />
          <span>
            <span className="block text-sm font-semibold text-midnight">{copy.consent.researchLabel}</span>
            <span className="block text-sm text-slate-700 mt-1 leading-relaxed">{copy.consent.researchText}</span>
          </span>
        </label>
      </div>
      <p className="text-sm text-slate-600">{copy.consent.separateNote}</p>
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : copy.consent.button}</Button>
    </form>
  );
}
