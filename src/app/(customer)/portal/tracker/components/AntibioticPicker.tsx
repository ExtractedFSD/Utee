"use client";

import { useMemo, useState } from "react";
import { inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import {
  ANTIBIOTIC_GROUPS, antibioticById, antibioticName, antibioticsInGroup, PINNED_ANTIBIOTICS, searchAntibiotics,
} from "@/lib/tracker/search";
import { Chip } from "./Chips";

/**
 * Searchable picker over antibiotics.json. Stores the item id (plus free text
 * for "other"), never the search term. Group headings order the list only.
 */
export function AntibioticPicker({
  value,
  otherName,
  previous = [],
  onChange,
  compact = false,
}: {
  value: string | null;
  otherName?: string;
  previous?: string[];
  onChange: (id: string | null, otherName?: string) => void;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const hits = useMemo(() => searchAntibiotics(query), [query]);
  const listId = "antibiotic-results";

  const pick = (id: string) => {
    onChange(id, id === "other" ? otherName : undefined);
    setQuery("");
  };

  if (value) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Chip selected onClick={() => onChange(null)}>
          {antibioticName(value, otherName)}
        </Chip>
        {value === "other" && (
          <input
            value={otherName ?? ""}
            onChange={(e) => onChange("other", e.target.value)}
            placeholder={copy.antibiotics.otherLabel}
            aria-label={copy.antibiotics.otherLabel}
            className={`${inputClass} max-w-xs`}
          />
        )}
        <button type="button" onClick={() => onChange(null)} className="text-sm text-slate-600 underline">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        role="combobox"
        aria-expanded={hits.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={copy.antibiotics.search}
        aria-label={copy.antibiotics.search}
        className={inputClass}
        autoComplete="off"
      />
      {query.trim() ? (
        <ul id={listId} role="listbox" className="space-y-1">
          {hits.map((h) => (
            <li key={h.item.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => pick(h.item.id)}
                className="w-full text-left rounded-2xl px-4 py-3 text-sm font-semibold text-midnight hover:bg-pink-25"
              >
                {h.label}
              </button>
            </li>
          ))}
          {!hits.length && <li className="text-sm text-slate-600 px-1">{copy.antibiotics.noMatch}</li>}
          <li className="flex flex-wrap gap-2 pt-2">
            {PINNED_ANTIBIOTICS.map((p) => (
              <Chip key={p.id} onClick={() => pick(p.id)}>{p.name}</Chip>
            ))}
          </li>
        </ul>
      ) : (
        <div className="space-y-4">
          {previous.length > 0 && (
            <div>
              <p className="text-eyebrow uppercase text-maroon mb-2">{copy.antibiotics.previous}</p>
              <div className="flex flex-wrap gap-2">
                {previous.map((id) => (
                  <Chip key={id} onClick={() => pick(id)}>{antibioticName(id)}</Chip>
                ))}
              </div>
            </div>
          )}
          {ANTIBIOTIC_GROUPS.filter((g) => !compact || g.id === "common").map((g) => (
            <div key={g.id}>
              <p className="text-eyebrow uppercase text-slate-500 mb-2">{g.label}</p>
              <div className="flex flex-wrap gap-2">
                {antibioticsInGroup(g.id).map((a) => (
                  <Chip key={a.id} onClick={() => pick(a.id)}>{a.name}</Chip>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {PINNED_ANTIBIOTICS.map((p) => (
              <Chip key={p.id} onClick={() => pick(p.id)}>{p.name}</Chip>
            ))}
          </div>
          <p className="text-xs text-slate-500">{copy.antibiotics.groupNote}</p>
        </div>
      )}
    </div>
  );
}

export function antibioticLabel(id: string, other?: string | null) {
  return antibioticById(id) ? antibioticName(id) : antibioticName(id, other);
}
