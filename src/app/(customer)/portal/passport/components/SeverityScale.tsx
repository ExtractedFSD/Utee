"use client";

import { SEVERITY_POINTS } from "@/lib/tracker/diary";
import { copy } from "@/lib/tracker/copy";

/**
 * Ten numbered buttons under a ticked symptom, in two rows of five so each
 * is a full-size tap target, with "1 mild" and "10 worst" under them. The
 * same tap again clears it.
 */
export function SeverityScale({ label, value, onChange, disabled, testId }: { label: string; value: number | null; onChange: (v: number | null) => void; disabled?: boolean; testId?: string }) {
  return (
    <div data-testid={testId}>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="text-sm font-semibold text-midnight">{label}</p>
        <p className={`text-sm ${value ? "font-semibold text-midnight" : "text-[#6b5b80]"}`} aria-hidden>{value ? `${value} of 10` : copy.log.tapToRate}</p>
      </div>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={copy.episode.severityLabel(label)}>
        {SEVERITY_POINTS.map((v) => {
          const on = value === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${v}${v === 1 ? ", mild" : v === 10 ? ", worst" : ""}`}
              disabled={disabled}
              onClick={() => onChange(on ? null : v)}
              className={`flex h-11 min-w-0 items-center justify-center rounded-xl border text-sm font-semibold transition-colors disabled:opacity-60 ${
                on ? "border-maroon bg-maroon text-white" : value !== null && v < value ? "border-pink-50 bg-pink-50 text-midnight" : "border-slate-200 bg-white text-slate-700 hover:border-maroon/40"
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-[#6b5b80]" aria-hidden>
        <span>{copy.log.mild}</span>
        <span>{copy.log.worst}</span>
      </div>
    </div>
  );
}
