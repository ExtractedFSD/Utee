"use client";

import { useState, useTransition } from "react";
import { Button, Card, Toggle, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { Sheet } from "../components/Sheet";
import { deleteAllTrackerData, setConsent, setReminders, setUnaAi } from "../actions";

/*
 * Settings, in the order they are touched: reminders, Una, download,
 * consents, delete. Switching a consent off explains the consequence
 * first; delete sits behind a disclosure and a typed confirmation.
 */
export function SettingsPanel({ consents, reminderDaily, reminderMonthly, unaAi }: { consents: { tracker: boolean; research: boolean }; reminderDaily: boolean; reminderMonthly: boolean; unaAi: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [formatOpen, setFormatOpen] = useState(false);
  const [consentOff, setConsentOff] = useState<"tracker" | "research" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => { const r = await fn(); const err = (r as { error?: string } | null | undefined)?.error; if (err) setError(err); });
  };
  const eyebrow = "text-eyebrow uppercase text-maroon mb-1";

  return (
    <>
      <Card>
        <p className={eyebrow}>{copy.settings.reminders}</p>
        <Toggle label={copy.settings.reminderDailyShort} checked={reminderDaily} disabled={pending} onChange={(v) => run(() => setReminders(v, reminderMonthly))} />
        <Toggle label={copy.settings.reminderMonthlyShort} checked={reminderMonthly} disabled={pending} onChange={(v) => run(() => setReminders(reminderDaily, v))} />
        <p className="text-[13px] text-[#5a4a6e]">{copy.settings.remindersNote}</p>
      </Card>

      <Card>
        <p className={eyebrow}>{copy.settings.una}</p>
        <Toggle label={copy.settings.unaAi} description={copy.settings.unaOff} checked={unaAi} disabled={pending} onChange={(v) => run(() => setUnaAi(v))} />
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-base font-semibold text-midnight">{copy.settings.downloadTitle}</p>
            <p className="text-[13px] text-[#5a4a6e]">{copy.settings.downloadBody}</p>
          </div>
          <Button variant="secondary" onClick={() => setFormatOpen(true)} className="shrink-0">{copy.settings.download}</Button>
        </div>
      </Card>

      <Card>
        <p className={eyebrow}>{copy.settings.consents}</p>
        <Toggle label={copy.settings.consentTracker} checked={consents.tracker} disabled={pending} onChange={(v) => (v ? run(() => setConsent("tracker", true)) : setConsentOff("tracker"))} />
        <Toggle label={copy.settings.consentResearch} checked={consents.research} disabled={pending} onChange={(v) => (v ? run(() => setConsent("research", true)) : setConsentOff("research"))} />
      </Card>

      <Card className="!p-0">
        <button type="button" onClick={() => setDeleteOpen((o) => !o)} aria-expanded={deleteOpen} className="flex w-full items-center justify-between gap-4 p-6 text-left">
          <span className="min-w-0">
            <span className="block text-base font-semibold text-midnight">{copy.settings.delete}</span>
            <span className="block text-[13px] text-[#5a4a6e]">{copy.settings.deleteRowBody}</span>
          </span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`shrink-0 text-[#8a7a9c] transition-transform ${deleteOpen ? "rotate-90" : ""}`}><path d="m9 6 6 6-6 6" /></svg>
        </button>
        {deleteOpen && (
          <div className="border-t border-[rgba(29,0,58,.08)] p-6 pt-5">
            <p className="text-sm text-[#5a4a6e] mb-4">{copy.settings.deleteBody}</p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="block text-xs text-[#5a4a6e] mb-1">{copy.settings.deleteConfirm}</span>
                <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`${inputClass} w-40`} autoComplete="off" aria-label={copy.settings.deleteConfirm} />
              </label>
              <Button variant="danger" disabled={pending || confirm !== "DELETE"} onClick={() => run(() => deleteAllTrackerData(confirm))}>{copy.settings.deleteButton}</Button>
            </div>
          </div>
        )}
      </Card>
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <Sheet open={formatOpen} title={copy.settings.formatTitle} onClose={() => setFormatOpen(false)} doneLabel={copy.episode.cancel} modal testId="sheet-format">
        <ul className="divide-y divide-[rgba(29,0,58,.08)]">
          {[
            { key: "json", label: copy.settings.formatJson, note: copy.settings.formatJsonNote },
            { key: "csv", label: copy.settings.formatCsv, note: copy.settings.formatCsvNote },
            { key: "fhir", label: copy.settings.formatFhir, note: copy.settings.formatFhirNote },
          ].map((f) => (
            <li key={f.key}>
              <a href={`/portal/passport/export?format=${f.key}`} onClick={() => setFormatOpen(false)} className="flex min-h-[56px] items-center justify-between gap-4 py-3">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-midnight">{f.label}</span>
                  <span className="block text-[13px] text-[#5a4a6e]">{f.note}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-maroon">{copy.settings.download}</span>
              </a>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={!!consentOff} title={copy.settings.consentOffTitle} onClose={() => setConsentOff(null)} doneLabel={copy.episode.cancel} modal testId="sheet-consent-off">
        <p className="text-sm text-midnight mb-5">{consentOff === "tracker" ? copy.settings.consentTrackerOff : copy.settings.consentResearchOff}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" disabled={pending} onClick={() => { const kind = consentOff!; setConsentOff(null); run(() => setConsent(kind, false)); }}>{copy.settings.switchOff}</Button>
          <Button variant="secondary" onClick={() => setConsentOff(null)}>{copy.episode.cancel}</Button>
        </div>
      </Sheet>
    </>
  );
}
