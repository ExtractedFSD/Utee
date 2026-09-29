"use client";

import { inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { ANTIBIOTIC_PREVENTIONS, PREVENTION_GROUPS, PREVENTION_OTHER } from "@/lib/tracker/prevention";
import { Chip } from "./Chips";
import { AntibioticPicker } from "./AntibioticPicker";

/**
 * Multi-select of everything someone takes or does to help prevent UTIs.
 * Used on "About you" and when adding from the prevention page.
 */
export function PreventionPicker({
  selected,
  onToggle,
  otherName,
  onOtherName,
  antibioticId,
  antibioticOther,
  onAntibiotic,
  exclude = [],
}: {
  selected: Set<string>;
  onToggle: (key: string, on: boolean) => void;
  otherName: string;
  onOtherName: (text: string) => void;
  antibioticId: string | null;
  antibioticOther: string;
  onAntibiotic: (id: string | null, other?: string) => void;
  exclude?: string[];
}) {
  const hidden = new Set(exclude);
  const needsAntibiotic = ANTIBIOTIC_PREVENTIONS.some((k) => selected.has(k));
  return (
    <div className="space-y-5">
      {PREVENTION_GROUPS.map((g) => {
        const options = g.options.filter((o) => !hidden.has(o.key));
        if (!options.length) return null;
        return (
          <div key={g.key}>
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500 mb-2">{g.label}</p>
            <div className="flex flex-wrap gap-2">
              {options.map((o) => (
                <Chip key={o.key} selected={selected.has(o.key)} onClick={() => onToggle(o.key, !selected.has(o.key))}>{o.label}</Chip>
              ))}
            </div>
          </div>
        );
      })}
      {!hidden.has(PREVENTION_OTHER.key) && (
        <div>
          <div className="flex flex-wrap gap-2">
            <Chip selected={selected.has(PREVENTION_OTHER.key)} onClick={() => onToggle(PREVENTION_OTHER.key, !selected.has(PREVENTION_OTHER.key))}>{PREVENTION_OTHER.label}</Chip>
          </div>
          {selected.has(PREVENTION_OTHER.key) && (
            <input value={otherName} onChange={(e) => onOtherName(e.target.value)} placeholder="Name it" aria-label={copy.prevention.otherLabel} className={`${inputClass} mt-3 max-w-md`} maxLength={120} />
          )}
        </div>
      )}
      {needsAntibiotic && (
        <div className="rounded-2xl bg-pink-25 p-4">
          <p className="text-sm font-semibold text-midnight mb-2">{copy.prevention.whichAntibiotic}</p>
          <AntibioticPicker value={antibioticId} otherName={antibioticOther} onChange={onAntibiotic} />
        </div>
      )}
      <p className="text-xs text-slate-500">{copy.prevention.groupNote}</p>
    </div>
  );
}
