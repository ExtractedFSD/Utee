"use client";

import { useState, useTransition } from "react";
import { Button, Card, CardTitle, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { deleteAllTrackerData, setConsent, setReminders, setUnaAi } from "../actions";

export function SettingsPanel({ consents, reminderDaily, reminderMonthly, unaAi }: { consents: { tracker: boolean; research: boolean }; reminderDaily: boolean; reminderMonthly: boolean; unaAi: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => { const r = await fn(); const err = (r as { error?: string } | null | undefined)?.error; if (err) setError(err); });
  };
  const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-midnight">{label}</span>
      <input type="checkbox" checked={checked} disabled={pending} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 rounded" />
    </label>
  );
  return (
    <>
      <Card>
        <CardTitle>{copy.settings.reminders}</CardTitle>
        <p className="text-sm text-slate-600 mb-2">{copy.settings.remindersBody}</p>
        <Toggle label={copy.settings.reminderDaily} checked={reminderDaily} onChange={(v) => run(() => setReminders(v, reminderMonthly))} />
        <Toggle label={copy.settings.reminderMonthly} checked={reminderMonthly} onChange={(v) => run(() => setReminders(reminderDaily, v))} />
      </Card>
      <Card>
        <CardTitle>{copy.settings.una}</CardTitle>
        <p className="text-sm text-slate-600 mb-2">{copy.settings.unaBody}</p>
        <Toggle label={copy.settings.unaAi} checked={unaAi} onChange={(v) => run(() => setUnaAi(v))} />
      </Card>
      <Card>
        <CardTitle>{copy.settings.consents}</CardTitle>
        <Toggle label={copy.settings.consentTracker} checked={consents.tracker} onChange={(v) => run(() => setConsent("tracker", v))} />
        <Toggle label={copy.settings.consentResearch} checked={consents.research} onChange={(v) => run(() => setConsent("research", v))} />
        <p className="text-xs text-slate-500 mt-2">{copy.settings.consentWithdrawNote}</p>
      </Card>
      <Card className="border border-maroon/20">
        <CardTitle>{copy.settings.delete}</CardTitle>
        <p className="text-sm text-slate-600 mb-4">{copy.settings.deleteBody}</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block text-xs text-slate-500 mb-1">{copy.settings.deleteConfirm}</span>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`${inputClass} w-40`} autoComplete="off" />
          </label>
          <Button variant="danger" disabled={pending || confirm !== "DELETE"} onClick={() => run(() => deleteAllTrackerData(confirm))}>{copy.settings.deleteButton}</Button>
        </div>
        {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
      </Card>
    </>
  );
}
