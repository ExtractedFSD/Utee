"use client";

import { SEVERITY_POINTS } from "@/lib/tracker/diary";

/**
 * One row of ten boxes under a ticked symptom: how bad it was today. The
 * same tap again clears it. Appears only once the symptom is ticked, so the
 * list stays short.
 */
export function SeverityScale({ label, value, onChange, disabled, testId }: { label: string; value: number | null; onChange: (v: number | null) => void; disabled?: boolean; testId?: string }) {
  return (
    <div data-testid={testId}>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <p className="text-sm text-midnight">{label}</p>
        <p className="text-xs text-slate-500" aria-hidden>{value ? `${value} of 10` : ""}</p>
      </div>
      <div className="grid grid-cols-10 gap-1" role="radiogroup" aria-label={`${label}, how bad`}>
        {SEVERITY_POINTS.map((v) => {
          const on = value === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={String(v)}
              disabled={disabled}
              onClick={() => onChange(on ? null : v)}
              className={`flex h-10 min-w-0 items-center justify-center rounded-lg border text-xs font-semibold transition-colors sm:text-sm disabled:opacity-60 ${
                on ? "border-maroon bg-maroon text-white" : "border-slate-200 bg-white text-slate-600 hover:border-maroon/40"
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}
