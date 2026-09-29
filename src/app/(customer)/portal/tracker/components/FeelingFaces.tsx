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
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How are you feeling today?">
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
            title={f.label}
            disabled={disabled}
            onClick={() => onChange(n)}
            className={`flex h-14 w-14 items-center justify-center rounded-full border transition-colors disabled:opacity-60 ${
              on ? "bg-maroon border-maroon text-white shadow-card" : "bg-white border-slate-200 text-midnight hover:border-maroon/40"
            }`}
          >
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="9.5" />
              <path d="M9 9.5h.01M15 9.5h.01" strokeWidth="2" />
              <path d={MOUTHS[f.key]} />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
