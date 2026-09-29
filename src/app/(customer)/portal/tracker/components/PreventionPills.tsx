import { Pill } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import type { PreventionRow } from "@/lib/tracker/data";
import { PREVENTION_GROUPS, preventionGroup, preventionShortName } from "@/lib/tracker/prevention";

/** The current list at a glance: one coloured pill per thing, grouped by kind. */
export function PreventionPills({ rows }: { rows: PreventionRow[] }) {
  const groups = [...PREVENTION_GROUPS, { key: "other", label: "Other", tone: "slate", options: [] }];
  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const mine = rows.filter((r) => (preventionGroup(r.option_key)?.key ?? "other") === g.key);
        if (!mine.length) return null;
        return (
          <div key={g.key}>
            <p className="text-xs text-slate-500 mb-1.5">{g.label}</p>
            <div className="flex flex-wrap gap-2">
              {mine.map((r) => (
                <span key={r.id} className="max-w-full [&>span]:max-w-full [&>span]:whitespace-normal [&>span]:text-left">
                  <Pill tone={g.tone}>
                    {preventionShortName(r)}
                    {r.helping === "yes" ? ` · ${copy.dashboard.preventionHelps}` : ""}
                  </Pill>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
