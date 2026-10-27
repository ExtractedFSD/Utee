/**
 * The last twelve months as a year grid: three rows of four month tiles,
 * each named, maroon when a UTI was open that month (with the count when
 * more than one), pink when clear. The year sits on the first tile and on
 * each January.
 */
export function MonthStrip({ months }: { months: { key: string; label: string; episodes: number }[] }) {
  return (
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
            <span className="text-[13px] font-semibold">{m.label}{m.episodes > 1 ? ` · ${m.episodes}` : ""}</span>
            {showYear && <span className={`text-[10px] ${on ? "text-white/80" : "text-[#8a7a9c]"}`}>{m.key.slice(0, 4)}</span>}
          </div>
        );
      })}
    </div>
  );
}
