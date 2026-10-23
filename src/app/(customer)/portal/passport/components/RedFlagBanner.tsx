import { copy } from "@/lib/tracker/copy";
import type { RedFlag } from "@/lib/tracker/redflags";

/** Safety signposting only. Shown when redFlagFor() says so; never elsewhere, never dismissible. */
export function RedFlagBanner({ flag }: { flag: RedFlag }) {
  if (!flag.show) return null;
  return (
    <div role="alert" className="rounded-card bg-midnight p-5 text-white shadow-card" data-testid="red-flag">
      <p className="text-base font-semibold">{copy.redFlag.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-white/90">
        {flag.reason === "pregnancy" ? copy.redFlag.pregnancyBody : copy.redFlag.body}
      </p>
      <p className="mt-2 text-xs text-white/70">{copy.redFlag.footnote}</p>
    </div>
  );
}
