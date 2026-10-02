"use client";

import { useState, useTransition } from "react";
import { Card, CardTitle, Button, Field, inputClass } from "@/components/ui";
import { formatKitCode } from "@/lib/kit-code";
import { SAMPLE_FAULTS, UROPATHOGENS } from "@/lib/lab-sheet";
import { escalateToUtee, markReceived, recordSheet, reportSampleProblem, rerunTest } from "./actions";

const checkClass = "h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500";

/** Receive the bag, or report that what is inside can't be tested. */
export function ReceiveActions({ code, canReceive }: { code: string; canReceive: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [fault, setFault] = useState("");
  const [note, setNote] = useState("");

  return (
    <Card className="space-y-4">
      {canReceive && (
        <div className="text-center py-4">
          <p className="text-sm text-slate-600 mb-4">
            Confirm that specimen <span className="font-mono font-semibold">{formatKitCode(code)}</span> has physically
            arrived at the laboratory.
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
            {pending && !reporting ? "Confirming…" : "Confirm specimen received"}
          </Button>
        </div>
      )}
      <div className={canReceive ? "border-t border-slate-100 pt-4" : ""} data-testid="sample-problem">
        {!reporting ? (
          <button type="button" onClick={() => setReporting(true)} className="text-sm font-semibold text-maroon hover:underline">
            Report a problem with this sample
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">What is wrong with the sample?</p>
            <div className="space-y-2">
              {SAMPLE_FAULTS.map((f) => (
                <label key={f.key} className="flex items-center gap-3 text-sm text-slate-700">
                  <input type="radio" name="fault" value={f.key} checked={fault === f.key} onChange={() => setFault(f.key)} className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500" />
                  {f.label}
                </label>
              ))}
            </div>
            <Field label="Details" hint="Anything Utee should know. Required for 'something else'.">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputClass} />
            </Field>
            <p className="text-xs text-slate-500">
              This parks the specimen as a problem, emails Utee, and tells the customer we are looking into a problem with their test.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="danger"
                disabled={pending || !fault}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const result = await reportSampleProblem(code, { fault, note });
                    if (result?.error) setError(result.error);
                  });
                }}
              >
                {pending ? "Reporting…" : "Report problem"}
              </Button>
              <Button variant="secondary" type="button" onClick={() => setReporting(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </Card>
  );
}

/** The sheet, offered again after a first invalid run. */
export type SheetInitial = { organisms: string[]; controls: { positive: boolean; negative: boolean; error: boolean }; comments: string | null };

export function SheetForm({
  code,
  attempt,
  lastInvalid,
  amend,
  initial,
  onCancel,
  onSaved,
}: {
  code: string;
  /** 1 for the first run, 2 for the re-run, and so on. */
  attempt: number;
  lastInvalid: string[] | null;
  /** Correcting a result already sent to the clinic. */
  amend?: boolean;
  initial?: SheetInitial;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await recordSheet(code, formData);
      if (result?.error) setError(result.error);
      else onSaved?.();
    });
  }

  return (
    <form action={onSubmit} data-testid="lab-sheet">
      {amend && <input type="hidden" name="amend" value="1" />}
      <Card className={`space-y-5 ${amend ? "border-2 border-sun" : ""}`}>
        <div>
          <CardTitle>{amend ? "Amend results" : `Lodestar UTI Test${attempt > 1 ? ` (run ${attempt})` : ""}`}</CardTitle>
          <p className="text-sm text-slate-500">
            {amend
              ? "Correct the sheet and save. The clinic is emailed that the results changed; the original is kept on file."
              : "Tick every uropathogen that is positive, then record the controls exactly as the analyser shows them."}
          </p>
        </div>

        {lastInvalid && (
          <div className="rounded-2xl border border-sun bg-sun-50 p-4 text-sm text-amber-900" data-testid="last-invalid">
            <p className="font-semibold">Run {attempt - 1} was invalid: {lastInvalid.join("; ")}.</p>
            <p className="mt-1 text-amber-800">
              Re-run the test and record the sheet again. The customer has not been told. If this run is also invalid, the specimen is
              parked as a problem for Utee.
            </p>
          </div>
        )}

        <fieldset>
          <legend className="text-sm font-semibold text-slate-700 mb-1">Uropathogen, tick if positive</legend>
          <p className="text-xs text-slate-500 mb-2">Tick more than one if more than one is positive. Polymicrobial infections are common.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {UROPATHOGENS.map((u) => (
              <label key={u.key} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700">
                <input type="checkbox" name="organism" value={u.key} defaultChecked={initial?.organisms.includes(u.key)} className={checkClass} />
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
            <input type="checkbox" name="control_positive" defaultChecked={initial?.controls.positive} className={`${checkClass} mt-0.5`} />
            <span>
              <span className="font-semibold text-midnight">Positive control</span>
              <span className="block text-xs text-slate-500">Positive control passed. Box must be ticked for a valid result.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" name="control_negative" defaultChecked={initial?.controls.negative} className={`${checkClass} mt-0.5`} />
            <span>
              <span className="font-semibold text-midnight">Negative control</span>
              <span className="block text-xs text-slate-500">Negative control passed. Box must be ticked for a valid result.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" name="control_error" defaultChecked={initial?.controls.error} className={`${checkClass} mt-0.5`} />
            <span>
              <span className="font-semibold text-midnight">Error</span>
              <span className="block text-xs text-slate-500">Tick if the analyser reported an error. The run is invalid.</span>
            </span>
          </label>
        </fieldset>

        <Field label="Comments" hint="Anything the clinic should know about this run.">
          <textarea name="comments" rows={3} defaultValue={initial?.comments ?? ""} className={inputClass} />
        </Field>

        <Field label="Analyser printout or lab PDF (optional)" hint="Max 10 MB">
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

        {!amend && (
          <p className="text-xs text-slate-500">
            A run is invalid if either control did not pass or an error was reported. The first invalid run is re-run quietly; a second
            one parks the specimen as a problem for Utee.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : amend ? "Save amended results" : "Record results"}
          </Button>
          {amend && onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </Card>
    </form>
  );
}

/** Results already sent to the clinic, with a way back in while the clinic has not picked the case up. */
export function CompletedResults({
  code,
  outcome,
  organism,
  comments,
  recordedAt,
  runs,
  canAmend,
  initial,
}: {
  code: string;
  outcome: string;
  organism: string | null;
  comments: string | null;
  recordedAt: string;
  runs: number;
  canAmend: boolean;
  initial: SheetInitial;
}) {
  const [amending, setAmending] = useState(false);
  if (amending) {
    return <SheetForm code={code} attempt={runs} lastInvalid={null} amend initial={initial} onCancel={() => setAmending(false)} onSaved={() => setAmending(false)} />;
  }
  return (
    <Card data-testid="results-on-file">
      <CardTitle>Results on file</CardTitle>
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          Outcome:{" "}
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[.12em] ${outcome === "positive" ? "bg-peach-50 text-maroon" : outcome === "negative" ? "bg-mint text-emerald-800" : "bg-sun text-amber-800"}`}>
            {outcome}
          </span>
        </p>
        {organism && <p>Positive for: {organism}</p>}
        {comments && <p>Comments: {comments}</p>}
        {runs > 1 && <p className="text-xs text-slate-500">Run {runs}; earlier runs are kept on file.</p>}
        <p className="text-xs text-slate-400">Recorded {recordedAt}</p>
      </div>
      <div className="mt-4">
        {canAmend ? (
          <Button variant="secondary" onClick={() => setAmending(true)}>
            Amend results
          </Button>
        ) : (
          <p className="text-xs text-slate-500">The clinic has picked this case up, so results can no longer be amended here. Ask Utee to roll the case back if something is wrong.</p>
        )}
      </div>
    </Card>
  );
}

/** A parked specimen: what went wrong, and what the lab can still do. */
export function ParkedActions({ code, summary, details }: { code: string; summary: string; details: string[] }) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  return (
    <Card className="space-y-4 border-2 border-maroon/30" data-testid="lab-query">
      <div>
        <CardTitle>{summary}</CardTitle>
        {details.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
        <p className="text-sm text-slate-500 mt-3">
          Utee and the customer have been told. Utee will decide what happens next. If Utee asks you to test the sample again, use the
          button below.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await rerunTest(code);
              if (result?.error) setError(result.error);
            });
          }}
        >
          {pending ? "Working…" : "Test this sample again"}
        </Button>
      </div>
      <div className="space-y-2 border-t border-slate-100 pt-4">
        <Field label="Note for Utee" hint="Anything that helps decide what to do next.">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputClass} />
        </Field>
        <Button
          variant="secondary"
          disabled={pending || sent}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await escalateToUtee(code, note);
              if (result?.error) setError(result.error);
              else setSent(true);
            });
          }}
        >
          {sent ? "Note sent" : "Send note to Utee"}
        </Button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </Card>
  );
}
