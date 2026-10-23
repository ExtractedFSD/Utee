import { copy } from "@/lib/tracker/copy";
import type { PreventionRow } from "@/lib/tracker/data";
import { preventionGroup, preventionShortName } from "@/lib/tracker/prevention";

/*
 * The current list at a glance: one pill per thing, coloured by kind
 * (supplements sun, creams and sprays peach, prescribed medicines lavender,
 * hormonal sky, vaccines mint). A rated item carries a tick.
 */
const TONE: Record<string, string> = {
  supplement: "bg-sun text-amber-900",
  topical: "bg-peach-50 text-maroon",
  medicine: "bg-lavender-50 text-violet-900",
  hormonal: "bg-sky-50 text-sky-900",
  vaccine: "bg-mint-50 text-emerald-900",
  other: "bg-slate-100 text-slate-700",
};

export function PreventionPills({ rows }: { rows: PreventionRow[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((r) => {
        const group = preventionGroup(r.option_key)?.key ?? "other";
        return (
          <span key={r.id} className={`inline-flex max-w-full items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.08em] ${TONE[group] ?? TONE.other}`}>
            {preventionShortName(r)}
            {r.helping === "yes" ? ` ✓ ${copy.dashboard.preventionHelps}` : ""}
          </span>
        );
      })}
    </div>
  );
}
