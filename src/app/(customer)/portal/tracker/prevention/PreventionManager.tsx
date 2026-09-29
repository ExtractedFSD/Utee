"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Button, Card, CardTitle, Pill, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import type { PreventionRow } from "@/lib/tracker/data";
import { HELPING, preventionGroup, preventionName } from "@/lib/tracker/prevention";
import { formatDay, isoToday } from "@/lib/tracker/stats";
import { Chip } from "../components/Chips";
import { PreventionPicker } from "../components/PreventionPicker";
import { Sheet } from "../components/Sheet";
import { addPreventions, deletePrevention, restartPrevention, updatePrevention } from "../actions";

const linkBtn = "min-h-[44px] px-2 text-sm font-semibold text-maroon";

/**
 * Current list first, each row opening to its details (start date, "is it
 * helping?", notes, stop). Stopped things stay below as history.
 */
export function PreventionManager({ rows }: { rows: PreventionRow[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [helpingNow, setHelpingNow] = useOptimistic(
    Object.fromEntries(rows.map((r) => [r.id, r.helping])) as Record<string, string | null>,
    (state, next: { id: string; helping: string }) => ({ ...state, [next.id]: next.helping })
  );

  const run = (fn: () => Promise<unknown>, optimistic?: () => void, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      optimistic?.();
      const r = await fn();
      const err = (r as { error?: string } | null | undefined)?.error;
      if (err) setError(err);
      else after?.();
    });
  };

  const current = rows.filter((r) => !r.stopped_on);
  const past = rows.filter((r) => r.stopped_on).sort((a, b) => (a.stopped_on! < b.stopped_on! ? 1 : -1));
  const open = rows.find((r) => r.id === openId) ?? null;

  return (
    <div className="space-y-6">
      <Card data-testid="prevention-current">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle>{copy.prevention.current}</CardTitle>
          <Button variant="secondary" onClick={() => setAdding(true)}>{copy.prevention.add}</Button>
        </div>
        {current.length === 0 ? (
          <p className="text-sm text-slate-600">{copy.prevention.nothingYet}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {current.map((r) => {
              const g = preventionGroup(r.option_key);
              const helping = helpingNow[r.id];
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpenId(r.id)} aria-expanded={openId === r.id} className="flex w-full min-h-[56px] items-center justify-between gap-4 py-3 text-left">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-midnight">{preventionName(r)}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {g && <Pill tone={g.tone}>{g.label}</Pill>}
                        {r.started_on && <span>{copy.prevention.since(formatDay(r.started_on))}</span>}
                        {helping && <span>{copy.prevention.helping} {HELPING.find((h) => h.key === helping)?.label}</span>}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-maroon">{copy.prevention.edit}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </Card>

      {past.length > 0 && (
        <Card data-testid="prevention-past">
          <CardTitle>{copy.prevention.past}</CardTitle>
          <ul className="divide-y divide-slate-100">
            {past.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-midnight">{preventionName(r)}</span>
                  <span className="block text-xs text-slate-500">
                    {copy.prevention.between(r.started_on && formatDay(r.started_on), formatDay(r.stopped_on!))}
                    {r.helping ? ` · ${copy.prevention.helping} ${HELPING.find((h) => h.key === r.helping)?.label}` : ""}
                  </span>
                </span>
                <button type="button" className={linkBtn} disabled={pending} onClick={() => run(() => restartPrevention(r.id))}>{copy.prevention.restart}</button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Sheet open={!!open} title={open ? preventionName(open) : ""} onClose={() => setOpenId(null)} testId="sheet-prevention">
        {open && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="prevention-start">{copy.prevention.startDate}</label>
              <input
                id="prevention-start"
                type="date"
                defaultValue={open.started_on ?? ""}
                max={isoToday()}
                className={`${inputClass} max-w-xs`}
                onBlur={(e) => { if ((e.target.value || null) !== open.started_on) run(() => updatePrevention(open.id, { startedOn: e.target.value || null })); }}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">{copy.prevention.helping}</p>
              <p className="text-xs text-slate-500 mb-2">{copy.prevention.helpingHint}</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={copy.prevention.helping}>
                {HELPING.map((h) => (
                  <Chip key={h.key} selected={helpingNow[open.id] === h.key} onClick={() => run(() => updatePrevention(open.id, { helping: h.key }), () => setHelpingNow({ id: open.id, helping: h.key }))}>{h.label}</Chip>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="prevention-notes">{copy.prevention.notes}</label>
              <textarea
                id="prevention-notes"
                defaultValue={open.notes ?? ""}
                rows={3}
                className={`${inputClass} w-full`}
                onBlur={(e) => { if (e.target.value !== (open.notes ?? "")) run(() => updatePrevention(open.id, { notes: e.target.value })); }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button variant="secondary" disabled={pending} onClick={() => run(() => updatePrevention(open.id, { stoppedOn: isoToday() }), undefined, () => setOpenId(null))}>{copy.prevention.stop}</Button>
              <button type="button" className={`${linkBtn} ml-auto`} disabled={pending} onClick={() => run(() => deletePrevention(open.id), undefined, () => setOpenId(null))}>{copy.prevention.remove}</button>
            </div>
          </div>
        )}
      </Sheet>

      <AddSheet open={adding} onClose={() => setAdding(false)} exclude={current.map((r) => r.option_key).filter((k) => k !== "other")} pending={pending} run={run} />
    </div>
  );
}

function AddSheet({ open, onClose, exclude, pending, run }: { open: boolean; onClose: () => void; exclude: string[]; pending: boolean; run: (fn: () => Promise<unknown>, optimistic?: () => void, after?: () => void) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [otherName, setOtherName] = useState("");
  const [antibioticId, setAntibioticId] = useState<string | null>(null);
  const [antibioticOther, setAntibioticOther] = useState("");
  const [startedOn, setStartedOn] = useState("");
  const reset = () => { setSelected(new Set()); setOtherName(""); setAntibioticId(null); setAntibioticOther(""); setStartedOn(""); };
  return (
    <Sheet open={open} title={copy.prevention.add} onClose={() => { reset(); onClose(); }} doneLabel={copy.episode.cancel} testId="sheet-add-prevention">
      <div className="space-y-5">
        <PreventionPicker
          selected={selected}
          onToggle={(key, on) => setSelected((prev) => { const n = new Set(prev); if (on) n.add(key); else n.delete(key); return n; })}
          otherName={otherName}
          onOtherName={setOtherName}
          antibioticId={antibioticId}
          antibioticOther={antibioticOther}
          onAntibiotic={(id, other) => { setAntibioticId(id); if (other !== undefined) setAntibioticOther(other); }}
          exclude={exclude}
        />
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="prevention-add-start">{copy.prevention.startDate}</label>
          <input id="prevention-add-start" type="date" value={startedOn} max={isoToday()} onChange={(e) => setStartedOn(e.target.value)} className={`${inputClass} max-w-xs`} />
        </div>
        <Button
          disabled={pending || selected.size === 0}
          onClick={() => run(
            () => addPreventions({ keys: [...selected], otherName, antibioticId: antibioticId ?? undefined, antibioticOther, startedOn: startedOn || null }),
            undefined,
            () => { reset(); onClose(); }
          )}
        >
          {copy.prevention.addButton}
        </Button>
      </div>
    </Sheet>
  );
}
