/** Twelve months, one cell each, filled when a UTI was open in that month. */
export function MonthStrip({ months }: { months: { key: string; label: string; episodes: number }[] }) {
  return (
    <div aria-label="UTIs by month, last 12 months">
      <div className="grid grid-cols-12 gap-1">
        {months.map((m) => (
          <div
            key={m.key}
            title={`${m.label}: ${m.episodes} UTI${m.episodes === 1 ? "" : "s"}`}
            className={`h-[26px] rounded-[7px] ${m.episodes ? "bg-maroon" : "bg-pink-50"}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-[#8a7a9c]">
        <span>{months[0]?.label}</span>
        <span>{months[months.length - 1]?.label}</span>
      </div>
    </div>
  );
}
