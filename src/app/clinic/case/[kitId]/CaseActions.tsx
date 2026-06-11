"use client";

import { useState, useTransition } from "react";
import { Card, CardTitle, Button, Field, inputClass } from "@/components/ui";
import { formatDateTime, type KitStatus } from "@/lib/status";
import { acknowledgeCase, uploadFinalReport } from "./actions";

export function CaseActions({
  kitId,
  status,
  reportComplete,
  completedAt,
}: {
  kitId: string;
  status: KitStatus;
  reportComplete: boolean;
  completedAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (reportComplete) {
    return (
      <Card className="bg-emerald-50 border-emerald-200">
        <p className="text-sm text-emerald-800">
          Final report uploaded {formatDateTime(completedAt)} — the patient has been notified
          and can download it from their portal.
        </p>
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
    <form action={onSubmit}>
      <Card className="space-y-5">
        <CardTitle>Upload final patient report</CardTitle>
        <Field
          label="Clinical summary (optional)"
          hint="Internal note — not shown to the patient"
        >
          <textarea name="summary" rows={3} className={inputClass} />
        </Field>
        <Field label="Final report PDF" hint="This is what the patient downloads and can take to their GP. Max 10 MB.">
          <input type="file" name="report" accept="application/pdf" required className="text-sm" />
        </Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Publishing…" : "Publish report to patient"}
        </Button>
      </Card>
    </form>
  );
}
