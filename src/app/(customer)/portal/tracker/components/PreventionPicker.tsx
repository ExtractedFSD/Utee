"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { ANTIBIOTIC_PREVENTIONS, PREVENTION_GROUPS, PREVENTION_OTHER, searchPreventions } from "@/lib/tracker/prevention";
import { Chip } from "./Chips";
import { AntibioticPicker } from "./AntibioticPicker";

/**
 * Pick what someone takes to help prevent UTIs. Search first (brands and
 * spellings included); the grouped list sits below for browsing. Used on
 * "About you", in Una's chat and when adding from the prevention page.
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
  autoFocus = false,
}: {
  selected: Set<string>;
  onToggle: (key: string, on: boolean) => void;
  otherName: string;
  onOtherName: (text: string) => void;
  antibioticId: string | null;
  antibioticOther: string;
  onAntibiotic: (id: string | null, other?: string) => void;
  exclude?: string[];
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const hidden = new Set(exclude);
  const needsAntibiotic = ANTIBIOTIC_PREVENTIONS.some((k) => selected.has(k));
  const results = searchPreventions(query).filter((o) => !hidden.has(o.key));
  const searching = query.trim().length > 0;
  const chosen = [...selected].filter((k) => k !== PREVENTION_OTHER.key);
  const pick = (key: string) => { onToggle(key, !selected.has(key)); setQuery(""); };

  return (
    <div className="space-y-5">
      <div>
        <label className="sr-only" htmlFor="prevention-search">{copy.prevention.searchPlaceholder}</label>
        <input
          id="prevention-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy.prevention.searchPlaceholder}
          className={`${inputClass} w-full`}
          autoFocus={autoFocus}
          autoComplete="off"
          data-testid="prevention-search"
        />
        {searching && (
          <div className="mt-3 flex flex-wrap gap-2" data-testid="prevention-results">
            {results.map((o) => (
              <Chip key={o.key} selected={selected.has(o.key)} onClick={() => pick(o.key)}>{o.label}</Chip>
            ))}
            {!results.length && (
              <>
                <p className="w-full text-sm text-slate-600">{copy.prevention.searchNone(query.trim())}</p>
                {!hidden.has(PREVENTION_OTHER.key) && (
                  <Chip onClick={() => { onOtherName(query.trim()); if (!selected.has(PREVENTION_OTHER.key)) onToggle(PREVENTION_OTHER.key, true); setQuery(""); }}>
                    {copy.prevention.addAsOther(query.trim())}
                  </Chip>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {chosen.length > 0 && !searching && (
        <div className="flex flex-wrap gap-2" data-testid="prevention-chosen">
          {chosen.map((k) => {
            const o = PREVENTION_GROUPS.flatMap((g) => g.options).find((x) => x.key === k);
            return <Chip key={k} selected onClick={() => onToggle(k, false)}>{o?.label ?? k}</Chip>;
          })}
        </div>
      )}

      {!searching && (
        <details className="group" open={chosen.length === 0}>
          <summary className="cursor-pointer list-none text-sm font-semibold text-maroon min-h-[44px] inline-flex items-center">{copy.prevention.browse}</summary>
          <div className="mt-3 space-y-5">
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
              <div className="flex flex-wrap gap-2">
                <Chip selected={selected.has(PREVENTION_OTHER.key)} onClick={() => onToggle(PREVENTION_OTHER.key, !selected.has(PREVENTION_OTHER.key))}>{PREVENTION_OTHER.label}</Chip>
              </div>
            )}
          </div>
        </details>
      )}

      {selected.has(PREVENTION_OTHER.key) && (
        <input value={otherName} onChange={(e) => onOtherName(e.target.value)} placeholder="Name it" aria-label={copy.prevention.otherLabel} className={`${inputClass} max-w-md`} maxLength={120} />
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
