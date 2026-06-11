"use client";

import { useState, useTransition } from "react";
import { Card, Button, inputClass } from "@/components/ui";
import { submitTriage } from "./actions";

const SYMPTOMS = [
  { key: "burning", label: "Pain or burning when urinating" },
  { key: "frequency", label: "Needing to urinate more often than usual" },
  { key: "urgency", label: "Sudden urges to urinate" },
  { key: "lower_abdominal_pain", label: "Lower abdominal pain" },
  { key: "blood_in_urine", label: "Blood in urine" },
  { key: "cloudy_or_smelly", label: "Cloudy or strong-smelling urine" },
  { key: "fever", label: "Fever or chills" },
  { key: "back_pain", label: "Back or side (flank) pain" },
  { key: "nausea", label: "Nausea or vomiting" },
];

const radioRow = (name: string, options: { value: string; label: string }[]) => (
  <div className="flex flex-wrap gap-4">
    {options.map((opt) => (
      <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="radio"
          name={name}
          value={opt.value}
          className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        {opt.label}
      </label>
    ))}
  </div>
);

export function TriageForm({ code }: { code: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await submitTriage(code, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-1">Your symptoms</h2>
        <p className="text-sm text-slate-500 mb-4">Tick everything you&apos;re experiencing.</p>
        <div className="space-y-2.5">
          {SYMPTOMS.map((s) => (
            <label key={s.key} className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                name="symptom"
                value={s.key}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              {s.label}
            </label>
          ))}
        </div>
      </Card>

      <Card className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            How long have you had these symptoms?
          </label>
          <select name="duration" required className={inputClass} defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            <option>Less than 24 hours</option>
            <option>1–3 days</option>
            <option>4–7 days</option>
            <option>More than a week</option>
          </select>
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-700 mb-2">
            Have you had a UTI before?
          </span>
          {radioRow("previousUti", [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "unsure", label: "Not sure" },
          ])}
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-700 mb-2">
            Are you currently pregnant?
          </span>
          {radioRow("pregnant", [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "not_applicable", label: "Not applicable" },
          ])}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Are you currently taking antibiotics? If so, which?
          </label>
          <input
            name="currentAntibiotics"
            placeholder="e.g. none, or nitrofurantoin since Monday"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Anything else we should know? (optional)
          </label>
          <textarea name="notes" rows={3} className={inputClass} />
        </div>
      </Card>

      <Card>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            I consent to my urine sample being tested by Utee&apos;s partner laboratory,
            and to my symptoms and results being reviewed by Utee&apos;s clinical team to
            produce my report.
          </span>
        </label>
      </Card>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-slate-400">
          After submitting, take your sample straight away and post it the same day.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit & take my sample"}
        </Button>
      </div>
    </form>
  );
}
