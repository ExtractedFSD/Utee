"use client";

import { useState, useTransition } from "react";
import { Card, CardTitle, Button, Field, inputClass } from "@/components/ui";
import { formatKitCode } from "@/lib/kit-code";
import { UROPATHOGENS } from "@/lib/lab-sheet";
import { escalateToUtee, markReceived, recordSheet, rerunTest } from "./actions";

const checkClass = "h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500";

export function SpecimenActions({
  code,
  canReceive,
  canRecord,
  attempt,
}: {
  code: string;
  canReceive: boolean;
  canRecord: boolean;
  /** 1 for the first run, 2 for the first re-run, and so on. */
  attempt: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (canReceive) {
    return (
      <Card className="text-center py-10">
        <p className="text-sm text-slate-600 mb-4">
          Confirm that specimen <span className="font-mono font-semibold">{formatKitCode(code)}</span> has
          physically arrived at the laboratory.
        </p>
        <Button
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await markReceived(code);
              if (result?.error) setError(result.error);
            });
          }}
        >
          {pending ? "Confirming…" : "Confirm specimen received"}
        </Button>
        {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
      </Card>
    );
  }

  if (!canRecord) {
    return (
      <Card className="text-center py-10">
        <p className="text-sm text-slate-500">No lab action required for this specimen.</p>
      </Card>
    );
  }

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await recordSheet(code, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={onSubmit} data-testid="lab-sheet">
      <Card className="space-y-5">
        <div>
          <CardTitle>Lodestar Rapid Culture Test{attempt > 1 ? ` (run ${attempt})` : ""}</CardTitle>
          <p className="text-sm text-slate-500">Tick each uropathogen that is positive, then record the controls exactly as the device shows them.</p>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-700 mb-2">Uropathogen, tick if positive</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {UROPATHOGENS.map((u) => (
              <label key={u.key} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700">
                <input type="checkbox" name="organism" value={u.key} className={checkClass} />
                <span>
                  <span className="font-semibold text-midnight">{u.label}</span>
                  {u.label !== u.formal && <span className="block text-xs text-slate-500">{u.formal}</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-slate-200 p-4 space-y-2.5">
          <legend className="px-1 text-sm font-semibold text-slate-700">Controls</legend>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" name="control_positive" className={`${checkClass} mt-0.5`} />
            <span>
              <span className="font-semibold text-midnight">Positive control</span>
              <span className="block text-xs text-slate-500">Confirms the test performed correctly. Must be ticked for a valid result.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" name="control_negative" className={`${checkClass} mt-0.5`} />
            <span>
              <span className="font-semibold text-midnight">Negative control</span>
              <span className="block text-xs text-slate-500">Tick only if it reacted. Test invalid, commence troubleshooting.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" name="control_error" className={`${checkClass} mt-0.5`} />
            <span>
              <span className="font-semibold text-midnight">Error</span>
              <span className="block text-xs text-slate-500">Tick if the device reported an error. Test invalid, commence troubleshooting.</span>
            </span>
          </label>
        </fieldset>

        <Field label="Comments" hint="Anything the clinic should know about this run.">
          <textarea name="comments" rows={3} className={inputClass} />
        </Field>

        <Field label="Device printout or lab PDF (optional)" hint="Max 10 MB">
          <input type="file" name="report" accept="application/pdf" className="text-sm" />
        </Field>

        <div className="rounded-2xl border border-sun bg-sun-50 p-4">
          <Field
            label="Confirm specimen code"
            hint="Re-type the code printed on the tube you are holding. This must match the specimen on this page."
          >
            <input
              name="confirmCode"
              required
              placeholder="UT-XXXX-XXXX"
              autoComplete="off"
              className={`${inputClass} font-mono uppercase`}
            />
          </Field>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <p className="text-xs text-slate-500">
          A run with the positive control unticked, the negative control ticked, or an error is recorded as invalid: the kit is held for
          troubleshooting instead of going to the clinic.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Record results"}
        </Button>
      </Card>
    </form>
  );
}

export function LabQueryActions({ code, reasons }: { code: string; reasons: string[] }) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(false);

  return (
    <Card className="space-y-4 border-2 border-maroon/30" data-testid="lab-query">
      <div>
        <CardTitle>Test invalid, commence troubleshooting</CardTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="text-sm text-slate-500 mt-3">
          Utee has been notified. Re-run the test on the same sample if you can, or escalate if the sample can&apos;t be tested again.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await rerunTest(code);
              if (result?.error) setError(result.error);
            });
          }}
        >
          {pending ? "Working…" : "Re-run the test"}
        </Button>
      </div>
      <div className="space-y-2 border-t border-slate-100 pt-4">
        <Field label="Escalate to Utee" hint="Say what went wrong and what you need.">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputClass} />
        </Field>
        <Button
          variant="secondary"
          disabled={pending || escalated}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await escalateToUtee(code, note);
              if (result?.error) setError(result.error);
              else setEscalated(true);
            });
          }}
        >
          {escalated ? "Escalated" : "Escalate to Utee"}
        </Button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </Card>
  );
}
