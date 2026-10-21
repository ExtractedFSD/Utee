import { copy } from "@/lib/tracker/copy";
import type { RedFlag } from "@/lib/tracker/redflags";

/** Safety signposting only. Shown when redFlagFor() says so; never elsewhere. */
export function RedFlagBanner({ flag }: { flag: RedFlag }) {
  if (!flag.show) return null;
  return (
    <div role="alert" className="rounded-card border border-maroon/30 bg-white p-5 shadow-card" data-testid="red-flag">
      <div className="flex gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-maroon text-white">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 8v5M12 17h.01" />
            <circle cx="12" cy="12" r="9.5" />
          </svg>
        </span>
        <div>
          <p className="font-display text-2xl font-light text-midnight">{copy.redFlag.title}</p>
          <p className="text-sm text-slate-700 mt-1 leading-relaxed">
            {flag.reason === "pregnancy" ? copy.redFlag.pregnancyBody : copy.redFlag.body}
          </p>
          <p className="text-xs text-slate-500 mt-2">{copy.redFlag.footnote}</p>
        </div>
      </div>
    </div>
  );
}
