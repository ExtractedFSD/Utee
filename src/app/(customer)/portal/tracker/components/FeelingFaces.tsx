"use client";

import { FEELINGS } from "@/lib/tracker/options";

/* Five line-drawn faces in the brand icon style (no emoji), one tap each. */
const MOUTHS: Record<string, string> = {
  "1": "M8 16.5c1.2-1.6 2.5-2.4 4-2.4s2.8.8 4 2.4",
  "2": "M8.5 16c1-.9 2.2-1.4 3.5-1.4s2.5.5 3.5 1.4",
  "3": "M8.5 15.5h7",
  "4": "M8.5 14.6c1 .9 2.2 1.4 3.5 1.4s2.5-.5 3.5-1.4",
  "5": "M8 14c1.2 1.6 2.5 2.4 4 2.4s2.8-.8 4-2.4",
};

export function FeelingFaces({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (feeling: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1.5 sm:gap-2" role="radiogroup" aria-label="How are you feeling?">
      {FEELINGS.map((f) => {
        const n = Number(f.key);
        const on = value === n;
        return (
          <button
            key={f.key}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={f.label}
            disabled={disabled}
            onClick={() => onChange(n)}
            className="flex w-12 sm:w-14 flex-col items-center gap-1 disabled:opacity-60"
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${
                on ? "bg-maroon border-maroon text-white shadow-card" : "bg-white border-slate-200 text-midnight hover:border-maroon/40"
              }`}
            >
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="9.5" />
                <path d="M9 9.5h.01M15 9.5h.01" strokeWidth="2" />
                <path d={MOUTHS[f.key]} />
              </svg>
            </span>
            <span className={`text-[10px] sm:text-[11px] ${on ? "font-semibold text-maroon" : "text-slate-600"}`} aria-hidden>{f.label}</span>
          </button>
        );
      })}
    </div>
  );
}
