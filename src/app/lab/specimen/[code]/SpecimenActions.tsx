"use client";

import { useState, useTransition } from "react";
import { Card, CardTitle, Button, Field, inputClass } from "@/components/ui";
import { markReceived, uploadResults } from "./actions";

export function SpecimenActions({
  code,
  canReceive,
  canUpload,
}: {
  code: string;
  canReceive: boolean;
  canUpload: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (canReceive) {
    return (
      <Card className="text-center py-10">
        <p className="text-sm text-slate-600 mb-4">
          Confirm that specimen <span className="font-mono font-semibold">{code}</span> has
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

  if (!canUpload) {
    return (
      <Card className="text-center py-10">
        <p className="text-sm text-slate-500">No lab action required for this specimen.</p>
      </Card>
    );
  }

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await uploadResults(code, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={onSubmit}>
      <Card className="space-y-5">
        <CardTitle>Upload results</CardTitle>

        <Field label="Outcome">
          <select name="outcome" required className={inputClass} defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="inconclusive">Inconclusive</option>
          </select>
        </Field>

        <Field label="Organism detected" hint="Leave blank if none">
          <input name="organism" placeholder="e.g. Escherichia coli" className={inputClass} />
        </Field>

        <Field label="Colony count">
          <input name="colonyCount" placeholder="e.g. >10^5 CFU/mL" className={inputClass} />
        </Field>

        <Field label="Antibiotic sensitivities" hint="Sensitive / resistant antibiotics, free text">
          <textarea name="sensitivities" rows={3} className={inputClass} />
        </Field>

        <Field label="Comments">
          <textarea name="comments" rows={3} className={inputClass} />
        </Field>

        <Field label="Lab report PDF (optional)" hint="Max 10 MB">
          <input type="file" name="report" accept="application/pdf" className="text-sm" />
        </Field>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Field
            label="Confirm specimen code"
            hint="Re-type the code printed on the pot you are holding. This must match the specimen on this page."
          >
            <input
              name="confirmCode"
              required
              placeholder="UT-XXXXXX"
              autoComplete="off"
              className={`${inputClass} font-mono uppercase`}
            />
          </Field>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Submit results to clinic"}
        </Button>
      </Card>
    </form>
  );
}
