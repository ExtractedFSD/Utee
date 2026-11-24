/**
 * The last twelve months as a year grid: three rows of four month tiles,
 * each named, maroon when a UTI was open that month (with the count when
 * more than one), pink when clear. The year sits on the first tile and on
 * each January.
 */
import { copy } from "@/lib/tracker/copy";

export function MonthStrip({ months }: { months: { key: string; label: string; episodes: number }[] }) {
  return (
    <div>
    <div className="grid grid-cols-4 gap-1.5" role="img" aria-label={`UTIs by month, last 12 months: ${months.map((m) => `${m.label} ${m.key.slice(0, 4)} ${m.episodes}`).join(", ")}`}>
      {months.map((m, i) => {
        const on = m.episodes > 0;
        const showYear = i === 0 || m.key.endsWith("-01");
        return (
          <div
            key={m.key}
            title={`${m.label} ${m.key.slice(0, 4)}: ${m.episodes} UTI${m.episodes === 1 ? "" : "s"}`}
            className={`flex h-12 flex-col items-center justify-center rounded-[10px] leading-tight ${on ? "bg-maroon text-white" : "bg-pink-50 text-midnight"}`}
          >
            <span className="text-sm font-semibold">{m.label}{m.episodes > 1 ? ` · ${m.episodes}` : ""}</span>
            {showYear && <span className={`text-[12px] ${on ? "text-white/90" : "text-[#6b5b80]"}`}>{m.key.slice(0, 4)}</span>}
          </div>
        );
      })}
    </div>
    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#6b5b80]" aria-hidden>
      <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-maroon" />A UTI that month</span>
      <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-pink-50" />No UTI</span>
      <span>{copy.history.monthCount}</span>
    </p>
    </div>
  );
}
