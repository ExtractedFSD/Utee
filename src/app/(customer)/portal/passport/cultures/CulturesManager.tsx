"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Card, CardTitle, Pill, inputClass } from "@/components/ui";
import { verificationFor, verifiedLine, type VerificationRow } from "@/lib/tracker/verify";
import { copy } from "@/lib/tracker/copy";
import {
  CULTURE_METHODS,
  CULTURE_OUTCOMES,
  GRID_ANTIBIOTICS,
  ORGANISMS,
  SIR_LABELS,
  cultureLine,
  methodLabel,
  organismShort,
  type CultureRow,
  type Sir,
} from "@/lib/tracker/cultures";
import type { CultureExtract } from "@/lib/tracker/guided/culture";
import { antibioticName } from "@/lib/tracker/search";
import { formatDay, isoToday } from "@/lib/tracker/stats";
import { AntibioticPicker } from "../components/AntibioticPicker";
import { Chip } from "../components/Chips";
import { Sheet } from "../components/Sheet";
import { addCulture, deleteCulture, describeCulture, readCulturePhoto, updateCulture, type CultureInput } from "./actions";

const linkBtn = "min-h-[44px] px-2 text-sm font-semibold text-maroon";

type Draft = {
  sample_on: string;
  method: string;
  method_other: string;
  outcome: string;
  organisms: { key: string; name: string; count: string }[];
  sensitivities: Record<string, Record<string, Sir>>;
  antibiotics: string[];
  white_cells: string;
  red_cells: string;
  notes: string;
};

const emptyDraft = (): Draft => ({
  sample_on: "",
  method: "standard_culture",
  method_other: "",
  outcome: "unknown",
  organisms: [],
  sensitivities: {},
  antibiotics: [...GRID_ANTIBIOTICS],
  white_cells: "",
  red_cells: "",
  notes: "",
});

function draftFrom(row: CultureRow): Draft {
  const used = new Set<string>(GRID_ANTIBIOTICS);
  for (const s of Object.values(row.sensitivities)) for (const id of Object.keys(s)) used.add(id);
  return {
    sample_on: row.sample_on ?? "",
    method: row.method,
    method_other: row.method_other ?? "",
    outcome: row.outcome,
    organisms: row.organisms.map((o) => ({ key: o.key, name: o.name ?? "", count: o.count ?? "" })),
    sensitivities: row.sensitivities,
    antibiotics: [...used],
    white_cells: row.microscopy.white_cells?.toString() ?? "",
    red_cells: row.microscopy.red_cells?.toString() ?? "",
    notes: row.notes ?? "",
  };
}

function draftFromExtract(x: CultureExtract, base: Draft): Draft {
  const organisms = x.organisms.length ? x.organisms.map((o) => ({ key: o.key, name: o.name ?? "", count: o.count ?? "" })) : base.organisms;
  const sensitivities: Draft["sensitivities"] = { ...base.sensitivities };
  const antibiotics = new Set(base.antibiotics);
  for (const o of x.organisms) {
    if (!o.sensitivities.length) continue;
    sensitivities[o.key] = { ...(sensitivities[o.key] ?? {}) };
    for (const s of o.sensitivities) {
      sensitivities[o.key][s.antibiotic_id] = s.result;
      antibiotics.add(s.antibiotic_id);
    }
  }
  return {
    ...base,
    sample_on: x.sample_on ?? base.sample_on,
    method: x.method ?? base.method,
    outcome: x.outcome ?? (organisms.length ? "pathogens" : base.outcome),
    organisms,
    sensitivities,
    antibiotics: [...antibiotics],
    white_cells: x.white_cells !== null ? String(x.white_cells) : base.white_cells,
    red_cells: x.red_cells !== null ? String(x.red_cells) : base.red_cells,
    notes: x.notes ?? base.notes,
  };
}

function toInput(d: Draft): CultureInput {
  return {
    sample_on: d.sample_on,
    method: d.method as CultureInput["method"],
    method_other: d.method_other,
    outcome: d.outcome as CultureInput["outcome"],
    organisms: d.organisms.map((o) => ({ key: o.key, name: o.name || null, count: o.count || null })),
    sensitivities: d.sensitivities,
    microscopy: { white_cells: d.white_cells, red_cells: d.red_cells },
    notes: d.notes,
  };
}

/** Shrinks a photo in the browser so the upload is quick and the reader gets a clear image. */
async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 1600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

const SIR_ORDER: Sir[] = ["S", "I", "R"];
const SIR_STYLE: Record<Sir, string> = {
  S: "bg-mint text-emerald-800 border-mint",
  I: "bg-sun text-amber-800 border-sun",
  R: "bg-rose-100 text-rose-800 border-rose-200",
};

export function CulturesManager({ rows, utee, unaAi, verifications = [] }: { rows: CultureRow[]; utee: CultureRow[]; unaAi: boolean; verifications?: VerificationRow[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<"add" | string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [describe, setDescribe] = useState("");
  const [readFrom, setReadFrom] = useState<"photo" | "text" | null>(null);
  const [searchingOrganism, setSearchingOrganism] = useState(false);
  const [organismQuery, setOrganismQuery] = useState("");
  const [addingAntibiotic, setAddingAntibiotic] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (fn: () => Promise<unknown>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      const err = (r as { error?: string } | null | undefined)?.error;
      if (err) setError(err);
      else after?.();
    });
  };

  const close = () => { setOpen(null); setDraft(emptyDraft()); setDescribe(""); setReadFrom(null); setError(null); setSearchingOrganism(false); setOrganismQuery(""); setAddingAntibiotic(false); };
  const startAdd = () => { setDraft(emptyDraft()); setDescribe(""); setReadFrom(null); setOpen("add"); };
  const startEdit = (row: CultureRow) => { setDraft(draftFrom(row)); setDescribe(""); setReadFrom(null); setOpen(row.id); };

  const applyExtract = (x: CultureExtract, from: "photo" | "text") => { setDraft((d) => draftFromExtract(x, d)); setReadFrom(from); };

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    let dataUrl: string;
    try {
      dataUrl = await compressImage(file);
    } catch {
      setError("That photo could not be opened. Try again.");
      return;
    }
    run(async () => {
      const r = await readCulturePhoto(dataUrl);
      if ("error" in r) return r;
      applyExtract(r.result, "photo");
      return r;
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  const toggleOrganism = (key: string) =>
    setDraft((d) => {
      const has = d.organisms.some((o) => o.key === key);
      const organisms = has ? d.organisms.filter((o) => o.key !== key) : [...d.organisms, { key, name: "", count: "" }];
      return { ...d, organisms, outcome: organisms.length ? "pathogens" : d.outcome === "pathogens" ? "unknown" : d.outcome };
    });

  const setSir = (organism: string, antibiotic: string, value: Sir | null) =>
    setDraft((d) => {
      const forOrg = { ...(d.sensitivities[organism] ?? {}) };
      if (value === null) delete forOrg[antibiotic];
      else forOrg[antibiotic] = value;
      return { ...d, sensitivities: { ...d.sensitivities, [organism]: forOrg } };
    });

  const matches = organismQuery.trim()
    ? ORGANISMS.filter((o) => !draft.organisms.some((x) => x.key === o.key) && (o.name + " " + o.short + " " + o.aliases.join(" ")).toLowerCase().includes(organismQuery.trim().toLowerCase()))
    : [];
  const commonOrganisms = ORGANISMS.slice(0, 6);
  const extraChosen = draft.organisms.filter((o) => !commonOrganisms.some((c) => c.key === o.key));
  const all = [...rows, ...utee].sort((a, b) => ((a.sample_on ?? "") < (b.sample_on ?? "") ? 1 : -1));

  return (
    <div className="space-y-6">
      <Card data-testid="cultures-list">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle>{copy.cultures.title}</CardTitle>
          <Button variant="secondary" onClick={startAdd}>{copy.cultures.add}</Button>
        </div>
        {all.length === 0 ? (
          <p className="text-sm text-slate-600">{copy.cultures.empty}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {all.map((r) => {
              const line = cultureLine(r);
              const fromUtee = r.source === "utee";
              const inner = (
                <>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-midnight">
                      {line.title}
                      {r.sample_on && <span className="font-normal text-slate-500"> · {formatDay(r.sample_on)}</span>}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <Pill tone={fromUtee ? "brand" : "slate"}>{fromUtee ? copy.cultures.utee : methodLabel(r)}</Pill>
                      {!fromUtee && verificationFor(verifications, "culture", r.id) && <span title={copy.share.verifiedHint}><Pill tone="green">{verifiedLine(verificationFor(verifications, "culture", r.id))}</Pill></span>}
                      <span>{line.detail.replace(/^[^·]*·\s*/, "")}</span>
                    </span>
                  </span>
                  {!fromUtee && <span className="shrink-0 text-sm font-semibold text-maroon">{copy.cultures.edit}</span>}
                </>
              );
              return (
                <li key={r.id}>
                  {fromUtee ? (
                    <div className="flex w-full min-h-[56px] items-center justify-between gap-4 py-3">{inner}</div>
                  ) : (
                    <button type="button" onClick={() => startEdit(r)} className="flex w-full min-h-[56px] items-center justify-between gap-4 py-3 text-left">{inner}</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {utee.length === 0 && <p className="mt-3 text-xs text-slate-500">{copy.cultures.uteeHint}</p>}
        {error && !open && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </Card>

      <Sheet open={!!open} title={open === "add" ? copy.cultures.add : copy.cultures.edit} onClose={close} doneLabel={copy.episode.cancel} testId="sheet-culture" modal>
        <div className="space-y-5">
          {open === "add" && (
            <div className="space-y-3 rounded-2xl bg-pink-25 p-4">
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" id="culture-photo" onChange={(e) => onPhoto(e.target.files?.[0])} />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" disabled={pending || !unaAi} onClick={() => fileRef.current?.click()}>
                  {pending && readFrom === null && describe === "" ? copy.cultures.photoReading : copy.cultures.photo}
                </Button>
                <span className="text-xs text-slate-600">{unaAi ? copy.cultures.photoHint : "Turn on Una's AI reader in Settings to read photos."}</span>
              </div>
              <div>
                <label htmlFor="culture-describe" className="block text-sm font-semibold text-midnight mb-1">{copy.cultures.describe}</label>
                <p className="text-xs text-slate-600 mb-2">{copy.cultures.describeHint}</p>
                <textarea id="culture-describe" value={describe} onChange={(e) => setDescribe(e.target.value)} rows={2} className={`${inputClass} w-full`} maxLength={2000} />
                <div className="mt-2">
                  <Button variant="secondary" disabled={pending || !describe.trim()} onClick={() => run(async () => { const r = await describeCulture(describe); if ("error" in r) return r; applyExtract(r.result, "text"); return r; })}>
                    {copy.cultures.describeButton}
                  </Button>
                </div>
              </div>
              {readFrom && <p className="text-xs font-semibold text-maroon" data-testid="culture-read-hint">{copy.cultures.reviewHint}</p>}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="culture-date" className="block text-sm font-semibold text-slate-700 mb-2">{copy.cultures.date}</label>
              <input id="culture-date" type="date" value={draft.sample_on} max={isoToday()} onChange={(e) => setDraft((d) => ({ ...d, sample_on: e.target.value }))} className={`${inputClass} max-w-xs`} />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">{copy.cultures.method}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={copy.cultures.method} data-testid="culture-method">
              {CULTURE_METHODS.map((m) => (
                <Chip key={m.key} selected={draft.method === m.key} onClick={() => setDraft((d) => ({ ...d, method: m.key }))}>{m.label}</Chip>
              ))}
            </div>
            {draft.method === "other" && <input value={draft.method_other} onChange={(e) => setDraft((d) => ({ ...d, method_other: e.target.value }))} placeholder="Name of the test" aria-label="Name of the test" className={`${inputClass} mt-2 max-w-xs`} maxLength={80} />}
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-1">{copy.cultures.organisms}</p>
            <p className="text-xs text-slate-500 mb-2">{copy.cultures.organismsHint}</p>
            <div className="flex flex-wrap gap-2" data-testid="culture-organisms">
              {commonOrganisms.map((o) => (
                <Chip key={o.key} selected={draft.organisms.some((x) => x.key === o.key)} onClick={() => toggleOrganism(o.key)}>{o.short}</Chip>
              ))}
              {extraChosen.map((o) => (
                <Chip key={o.key} selected onClick={() => toggleOrganism(o.key)}>{organismShort(o)}</Chip>
              ))}
              {!searchingOrganism && <Chip onClick={() => setSearchingOrganism(true)}>+ Other</Chip>}
            </div>
            {searchingOrganism && (
              <div className="mt-2 space-y-2">
                <input value={organismQuery} onChange={(e) => setOrganismQuery(e.target.value)} placeholder={copy.cultures.organismSearch} aria-label={copy.cultures.organismSearch} className={`${inputClass} max-w-md`} autoFocus />
                <div className="flex flex-wrap gap-2">
                  {matches.map((o) => <Chip key={o.key} onClick={() => { toggleOrganism(o.key); setOrganismQuery(""); setSearchingOrganism(false); }}>{o.name}</Chip>)}
                  {organismQuery.trim() && !matches.length && (
                    <Chip onClick={() => { setDraft((d) => ({ ...d, organisms: [...d.organisms.filter((o) => o.key !== "other"), { key: "other", name: organismQuery.trim(), count: "" }], outcome: "pathogens" })); setOrganismQuery(""); setSearchingOrganism(false); }}>
                      Add &quot;{organismQuery.trim()}&quot;
                    </Chip>
                  )}
                </div>
              </div>
            )}
            {draft.organisms.length === 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-500 mb-2">{copy.cultures.outcome}</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={copy.cultures.outcome} data-testid="culture-outcome">
                  {CULTURE_OUTCOMES.filter((o) => o.key !== "pathogens").map((o) => (
                    <Chip key={o.key} selected={draft.outcome === o.key} onClick={() => setDraft((d) => ({ ...d, outcome: o.key }))}>{o.label}</Chip>
                  ))}
                </div>
              </div>
            )}
          </div>

          {draft.organisms.length > 0 && (
            <div data-testid="culture-sensitivities">
              <p className="text-sm font-semibold text-slate-700 mb-1">{copy.cultures.sensitivities}</p>
              <p className="text-xs text-slate-500 mb-2">{copy.cultures.sensitivitiesHint}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[.1em] text-slate-500">
                      <th className="py-1 pr-2 font-semibold">Antibiotic</th>
                      {draft.organisms.map((o) => <th key={o.key} className="py-1 px-1 font-semibold">{organismShort(o)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.antibiotics.map((id) => (
                      <tr key={id} className="border-t border-slate-100">
                        <td className="py-1.5 pr-2 text-slate-700">{antibioticName(id)}</td>
                        {draft.organisms.map((o) => {
                          const value = draft.sensitivities[o.key]?.[id] ?? null;
                          return (
                            <td key={o.key} className="py-1.5 px-1">
                              <div className="flex gap-1" role="radiogroup" aria-label={`${antibioticName(id)} for ${organismShort(o)}`}>
                                {SIR_ORDER.map((sir) => (
                                  <button
                                    key={sir}
                                    type="button"
                                    aria-pressed={value === sir}
                                    title={SIR_LABELS[sir]}
                                    onClick={() => setSir(o.key, id, value === sir ? null : sir)}
                                    className={`h-9 w-9 rounded-full border text-xs font-bold transition-colors ${value === sir ? SIR_STYLE[sir] : "border-slate-200 bg-white text-slate-400 hover:border-maroon/40"}`}
                                  >
                                    {sir}
                                  </button>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {addingAntibiotic ? (
                <div className="mt-3 rounded-2xl bg-pink-25 p-3">
                  <AntibioticPicker value={null} exclude={[...draft.antibiotics, "dont_know", "other"]} autoFocus onChange={(id) => { if (id) setDraft((d) => ({ ...d, antibiotics: d.antibiotics.includes(id) ? d.antibiotics : [...d.antibiotics, id] })); setAddingAntibiotic(false); }} />
                  <button type="button" className={linkBtn} onClick={() => setAddingAntibiotic(false)}>{copy.episode.cancel}</button>
                </div>
              ) : (
                <button type="button" className={`${linkBtn} mt-1`} onClick={() => setAddingAntibiotic(true)}>+ {copy.cultures.addAntibiotic}</button>
              )}
              {draft.organisms.map((o) => (
                <div key={o.key} className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="font-semibold text-midnight">{organismShort(o)}</span>
                  <input value={o.count} onChange={(e) => setDraft((d) => ({ ...d, organisms: d.organisms.map((x) => (x.key === o.key ? { ...x, count: e.target.value } : x)) }))} placeholder={copy.cultures.count} aria-label={`${copy.cultures.count} for ${organismShort(o)}`} className={`${inputClass} max-w-[12rem] !py-1.5 text-xs`} maxLength={40} />
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">{copy.cultures.microscopy}</p>
            <div className="flex flex-wrap gap-3">
              <label className="text-xs text-slate-600">
                <span className="block mb-1">{copy.cultures.whiteCells}</span>
                <input inputMode="decimal" value={draft.white_cells} onChange={(e) => setDraft((d) => ({ ...d, white_cells: e.target.value }))} className={`${inputClass} max-w-[8rem]`} />
              </label>
              <label className="text-xs text-slate-600">
                <span className="block mb-1">{copy.cultures.redCells}</span>
                <input inputMode="decimal" value={draft.red_cells} onChange={(e) => setDraft((d) => ({ ...d, red_cells: e.target.value }))} className={`${inputClass} max-w-[8rem]`} />
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="culture-notes" className="block text-sm font-semibold text-slate-700 mb-2">{copy.cultures.notes}</label>
            <textarea id="culture-notes" value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} rows={2} className={`${inputClass} w-full`} maxLength={2000} />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button disabled={pending} onClick={() => run(() => (open === "add" ? addCulture(toInput(draft)) : updateCulture(open!, toInput(draft))), close)}>
              {copy.cultures.addButton}
            </Button>
            <button type="button" className={linkBtn} onClick={close}>{copy.episode.cancel}</button>
            {open && open !== "add" && (
              <button type="button" className={`${linkBtn} ml-auto`} disabled={pending} onClick={() => run(() => deleteCulture(open), close)}>{copy.cultures.remove}</button>
            )}
          </div>
        </div>
      </Sheet>
    </div>
  );
}
