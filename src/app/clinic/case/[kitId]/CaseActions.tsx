"use client";

import { useState, useTransition } from "react";
import { Card, CardTitle, Button, Field, LinkButton, inputClass } from "@/components/ui";
import { formatDateTime, type KitStatus } from "@/lib/status";
import { acknowledgeCase, uploadFinalReport } from "./actions";

export function CaseActions({
  kitId,
  status,
  reportComplete,
  completedAt,
  signedBy,
}: {
  kitId: string;
  status: KitStatus;
  reportComplete: boolean;
  completedAt: string | null;
  signedBy: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (reportComplete) {
    return (
      <Card className="bg-emerald-50 border-emerald-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-emerald-800">
            Report published {formatDateTime(completedAt)}
            {signedBy.length > 0 && <>, signed by {signedBy.join(", ")}</>}. The patient has been notified and can download it from their portal.
          </p>
          <LinkButton href={`/clinic/case/${kitId}/report/preview`} variant="secondary" external>
            View the report
          </LinkButton>
        </div>
      </Card>
    );
  }

  if (status === "lab_complete") {
    return (
      <Card className="text-center py-8">
        <p className="text-sm text-slate-600 mb-4">
          Acknowledge receipt of this case to begin clinical review.
        </p>
        <Button
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await acknowledgeCase(kitId);
              if (result?.error) setError(result.error);
            });
          }}
        >
          {pending ? "Confirming…" : "Mark case as received"}
        </Button>
        {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
      </Card>
    );
  }

  if (status !== "clinic_received") {
    return null;
  }

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await uploadFinalReport(kitId, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-4 border-pink-50 bg-pink-25">
        <div>
          <CardTitle>Patient report</CardTitle>
          <p className="text-sm text-slate-700">
            The report is generated from the lab sheet: review the wording, sign it electronically and publish it to the patient.
          </p>
        </div>
        <LinkButton href={`/clinic/case/${kitId}/report`}>Prepare the report</LinkButton>
      </Card>

      <details className="rounded-card border border-slate-200 bg-white">
        <summary className="cursor-pointer select-none px-6 py-4 text-sm font-semibold text-slate-600">Upload a PDF prepared elsewhere instead</summary>
        <form action={onSubmit} className="space-y-5 border-t border-slate-100 px-6 py-5">
          <Field label="Clinical summary (optional)" hint="Internal note, not shown to the patient">
            <textarea name="summary" rows={3} className={inputClass} />
          </Field>
          <Field label="Final report PDF" hint="This is what the patient downloads and can take to their GP. Max 10 MB.">
            <input type="file" name="report" accept="application/pdf" required className="text-sm" />
          </Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Publishing…" : "Publish uploaded PDF to patient"}
          </Button>
        </form>
      </details>
    </div>
  );
}
