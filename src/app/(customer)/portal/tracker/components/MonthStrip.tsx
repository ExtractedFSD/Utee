/** Twelve months, one cell each, filled when a UTI was open in that month. */
export function MonthStrip({ months }: { months: { key: string; label: string; episodes: number }[] }) {
  return (
    <div className="grid grid-cols-12 gap-1" aria-label="UTIs by month, last 12 months">
      {months.map((m) => (
        <div key={m.key} className="text-center">
          <div
            title={`${m.label}: ${m.episodes} UTI${m.episodes === 1 ? "" : "s"}`}
            className={`h-8 rounded-lg ${m.episodes ? "bg-maroon" : "bg-pink-50"}`}
          />
          <p className="text-[10px] text-slate-500 mt-1">{m.label}</p>
        </div>
      ))}
    </div>
  );
}
