"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, Card, CardTitle, StatusBadge, inputClass } from "@/components/ui";
import type { KitStatus } from "@/lib/status";
import { copy } from "@/lib/tracker/copy";
import { COURSE_DAYS, COURSE_TYPES, SOURCES, SYMPTOMS, TEST_KINDS, TEST_RESULTS, TRIGGERS, WORKED, labelFor } from "@/lib/tracker/options";
import { antibioticName } from "@/lib/tracker/search";
import { formatDay, isoToday } from "@/lib/tracker/stats";
import type { EpisodeRow } from "@/lib/tracker/stats";
import { Chip, ChipGroup, DateChips } from "../../components/Chips";
import { FeelingFaces } from "../../components/FeelingFaces";
import { AntibioticPicker } from "../../components/AntibioticPicker";
import {
  addTest, addTreatment, deleteEpisode, deleteTest, deleteTreatment, rateTreatment, setFeeling, toggleSymptom, toggleTrigger, updateEpisode,
} from "../../actions";

type Item = { id: string; key: string; other: string | null };
type Treatment = { id: string; antibiotic_id: string; other_name: string | null; started_on: string | null; days: number | null; course_type: string | null; source: string | null; worked: string | null };
type TestItem = { id: string; kind: string; tested_on: string | null; result: string | null; notes: string | null; kit_id: string | null; kitCode: string | null; kitStatus: string | null; kitReportReady: boolean };
type Kit = { id: string; code: string; status: string; reportReady: boolean };

/* Every tap saves. Sections are cards; optional ones open on demand. */
export function EpisodeEditor({
  episode, isNew, symptoms, triggers, treatments, tests, feelingToday, symptomOrder, triggerOrder, previousAntibiotics, lastSource, kits,
}: {
  episode: EpisodeRow; isNew: boolean; symptoms: Item[]; triggers: Item[]; treatments: Treatment[]; tests: TestItem[];
  feelingToday: number | null; symptomOrder: string[]; triggerOrder: string[]; previousAntibiotics: string[]; lastSource: string | null;
  kits: Kit[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set([...(triggers.length ? ["triggers"] : []), ...(treatments.length ? ["treatment"] : []), ...(tests.length ? ["tests"] : []), ...(episode.notes ? ["notes"] : [])]));
  const [notes, setNotes] = useState(episode.notes ?? "");
  const [symptomOther, setSymptomOther] = useState(symptoms.find((s) => s.key === "other")?.other ?? "");
  const [triggerOther, setTriggerOther] = useState(triggers.find((t) => t.key === "other")?.other ?? "");
  const [closing, setClosing] = useState(false);
  const [endedOn, setEndedOn] = useState(episode.ended_on ?? isoToday());

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      const err = (r as { error?: string } | null | undefined)?.error; if (err) setError(err);
    });
  };
  const show = (k: string) => setOpen((p) => new Set(p).add(k));
  const symptomSet = new Set(symptoms.map((s) => s.key));
  const triggerSet = new Set(triggers.map((t) => t.key));
  const orderOptions = (list: { key: string; label: string }[], order: string[]) => order.map((k) => list.find((o) => o.key === k)!).filter(Boolean);
  const unratedFinished = treatments.filter((t) => !t.worked);

  return (
    <div className="space-y-6">
      {isNew && <p className="text-sm text-slate-700">Saved. Add anything else below, now or later.</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <Card>
        <CardTitle>{copy.log.symptoms}</CardTitle>
        <ChipGroup
          options={orderOptions(SYMPTOMS, symptomOrder)}
          selected={symptomSet}
          onToggle={(key, on) => run(() => toggleSymptom(episode.id, key, on, symptomOther))}
          otherText={symptomOther}
          onOtherText={(t) => { setSymptomOther(t); }}
        />
        {symptomSet.has("other") && (
          <Button type="button" variant="secondary" className="mt-3" disabled={pending} onClick={() => run(() => toggleSymptom(episode.id, "other", true, symptomOther))}>Save note</Button>
        )}
      </Card>

      <Card>
        <CardTitle>{copy.log.feeling}</CardTitle>
        <FeelingFaces value={feelingToday} disabled={pending} onChange={(f) => run(() => setFeeling(episode.id, f))} />
      </Card>

      {!episode.ended_on ? (
        <Card className="bg-gradient-brand text-white">
          {!closing ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="font-display text-2xl font-light">{copy.dashboard.openEpisodeDay(Math.max(1, Math.round((Date.parse(isoToday()) - Date.parse(episode.started_on)) / 86400000) + 1))}</p>
              <Button variant="white" onClick={() => setClosing(true)}>{copy.log.closeEpisode}</Button>
            </div>
          ) : (
            <div className="space-y-4" data-testid="close-panel">
              <p className="font-display text-2xl font-light">When did you start feeling better?</p>
              <div className="rounded-2xl bg-white/95 p-4 text-midnight">
                <DateChips value={endedOn} onChange={setEndedOn} />
              </div>
              {unratedFinished.length > 0 && (
                <div className="rounded-2xl bg-white/95 p-4 text-midnight space-y-3">
                  <p className="text-sm font-semibold">{copy.log.didItWork}</p>
                  {unratedFinished.map((t) => (
                    <div key={t.id} className="flex flex-wrap items-center gap-2">
                      <span className="text-sm mr-2">{antibioticName(t.antibiotic_id, t.other_name)}</span>
                      {WORKED.map((w) => (
                        <Chip key={w.key} selected={t.worked === w.key} disabled={pending} onClick={() => run(() => rateTreatment(t.id, w.key))}>{w.label}</Chip>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="white" disabled={pending} onClick={() => run(async () => { const r = await updateEpisode(episode.id, { endedOn }); if (!r.error) setClosing(false); return r; })}>Save</Button>
                <Button variant="white" onClick={() => setClosing(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-700">{copy.log.closed(formatDay(episode.ended_on))}</p>
            <Button variant="secondary" disabled={pending} onClick={() => run(() => updateEpisode(episode.id, { endedOn: null }))}>{copy.log.reopen}</Button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {(["triggers", "treatment", "tests", "notes"] as const).filter((k) => !open.has(k)).map((k) => (
          <Chip key={k} onClick={() => show(k)}>{copy.log.addMore}: {copy.log[k]}</Chip>
        ))}
      </div>

      {open.has("triggers") && (
        <Card>
          <CardTitle>{copy.log.triggers}</CardTitle>
          <ChipGroup
            options={orderOptions(TRIGGERS, triggerOrder)}
            selected={triggerSet}
            onToggle={(key, on) => run(() => toggleTrigger(episode.id, key, on, triggerOther))}
            otherText={triggerOther}
            onOtherText={setTriggerOther}
          />
          {triggerSet.has("other") && (
            <Button type="button" variant="secondary" className="mt-3" disabled={pending} onClick={() => run(() => toggleTrigger(episode.id, "other", true, triggerOther))}>Save note</Button>
          )}
        </Card>
      )}

      {open.has("treatment") && (
        <Card>
          <CardTitle>{copy.log.treatment}</CardTitle>
          {treatments.length > 0 && (
            <ul className="divide-y divide-slate-100 mb-4">
              {treatments.map((t) => (
                <li key={t.id} className="py-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-midnight">{antibioticName(t.antibiotic_id, t.other_name)}</p>
                    <p className="text-xs text-slate-600">
                      {[t.started_on && `from ${formatDay(t.started_on)}`, t.days && `${t.days} day${t.days === 1 ? "" : "s"}`, labelFor(COURSE_TYPES, t.course_type), labelFor(SOURCES, t.source)].filter(Boolean).join(" · ")}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-xs text-slate-600 mr-1">{copy.log.didItWork}</span>
                      {WORKED.map((w) => (
                        <Chip key={w.key} selected={t.worked === w.key} disabled={pending} onClick={() => run(() => rateTreatment(t.id, w.key))}>{w.label}</Chip>
                      ))}
                    </div>
                  </div>
                  <button type="button" className="text-xs text-slate-500 underline" disabled={pending} onClick={() => run(() => deleteTreatment(t.id))}>Remove</button>
                </li>
              ))}
            </ul>
          )}
          <TreatmentForm episodeId={episode.id} previous={previousAntibiotics} lastSource={lastSource} pending={pending} run={run} />
        </Card>
      )}

      {open.has("tests") && (
        <Card>
          <CardTitle>{copy.log.tests}</CardTitle>
          {tests.length > 0 && (
            <ul className="divide-y divide-slate-100 mb-4">
              {tests.map((t) => (
                <li key={t.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-midnight">{labelFor(TEST_KINDS, t.kind)}{t.kitCode ? ` ${t.kitCode}` : ""}</p>
                    <p className="text-xs text-slate-600">
                      {t.kit_id ? (
                        <span className="inline-flex items-center gap-2">{copy.log.uteeTestLinked} {t.kitStatus && <StatusBadge status={t.kitStatus as KitStatus} />}{t.kitReportReady && <Link href={`/portal/tests/${t.kit_id}`} className="text-maroon font-semibold">View report</Link>}</span>
                      ) : (
                        [t.tested_on && formatDay(t.tested_on), labelFor(TEST_RESULTS, t.result), t.notes].filter(Boolean).join(" · ")
                      )}
                    </p>
                  </div>
                  <button type="button" className="text-xs text-slate-500 underline" disabled={pending} onClick={() => run(() => deleteTest(t.id))}>Remove</button>
                </li>
              ))}
            </ul>
          )}
          <TestForm episodeId={episode.id} kits={kits} pending={pending} run={run} />
        </Card>
      )}

      {open.has("notes") && (
        <Card>
          <CardTitle>{copy.log.notes}</CardTitle>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => { if (notes !== (episode.notes ?? "")) run(() => updateEpisode(episode.id, { notes })); }}
            rows={4}
            className={inputClass}
            aria-label={copy.log.notes}
            placeholder="Anything else worth remembering"
          />
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[240px]">
            <DateChips label="Start date" value={episode.started_on} onChange={(iso) => run(() => updateEpisode(episode.id, { startedOn: iso }))} />
          </div>
          <button type="button" className="text-xs text-slate-500 underline" disabled={pending} onClick={() => { if (confirm("Delete this UTI and everything logged for it?")) run(() => deleteEpisode(episode.id)); }}>Delete this UTI</button>
        </div>
      </Card>
    </div>
  );
}

function TreatmentForm({ episodeId, previous, lastSource, pending, run }: { episodeId: string; previous: string[]; lastSource: string | null; pending: boolean; run: (fn: () => Promise<unknown>) => void }) {
  const [antibiotic, setAntibiotic] = useState<string | null>(null);
  const [otherName, setOtherName] = useState("");
  const [startedOn, setStartedOn] = useState(isoToday());
  const [days, setDays] = useState<number | null>(null);
  const [customDays, setCustomDays] = useState("");
  const [courseType, setCourseType] = useState("");
  const [source, setSource] = useState(lastSource ?? "");
  const reset = () => { setAntibiotic(null); setOtherName(""); setDays(null); setCustomDays(""); setCourseType(""); };
  return (
    <div className="space-y-4">
      <AntibioticPicker value={antibiotic} otherName={otherName} previous={previous} onChange={(id, other) => { setAntibiotic(id); if (other !== undefined) setOtherName(other); }} />
      {antibiotic && (
        <>
          <DateChips label="Started" value={startedOn} onChange={setStartedOn} />
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Course length</p>
            <p className="text-xs text-slate-500 mb-2">{copy.log.courseHint}</p>
            <div className="flex flex-wrap gap-2">
              {COURSE_DAYS.map((d) => (
                <Chip key={d} selected={days === d && !customDays} onClick={() => { setDays(d); setCustomDays(""); }}>{d} day{d === 1 ? "" : "s"}</Chip>
              ))}
              <Chip selected={!!customDays} onClick={() => { setCustomDays("10"); setDays(10); }}>Other</Chip>
              {customDays && (
                <input type="number" min={1} max={365} value={customDays} onChange={(e) => { setCustomDays(e.target.value); setDays(Number(e.target.value) || null); }} className={`${inputClass} w-24`} aria-label="Number of days" />
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Type of course</p>
            <div className="flex flex-wrap gap-2">
              {COURSE_TYPES.map((c) => <Chip key={c.key} selected={courseType === c.key} onClick={() => setCourseType(c.key)}>{c.label}</Chip>)}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Where it came from</p>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((s) => <Chip key={s.key} selected={source === s.key} onClick={() => setSource(s.key)}>{s.label}</Chip>)}
            </div>
          </div>
          <p className="text-xs text-slate-500">{copy.log.didItWorkHint}</p>
          <Button disabled={pending} onClick={() => run(async () => { const r = await addTreatment(episodeId, { antibiotic_id: antibiotic, other_name: otherName, started_on: startedOn, days, course_type: courseType, source }); if (!r.error) reset(); return r; })}>
            Add treatment
          </Button>
        </>
      )}
    </div>
  );
}

function TestForm({ episodeId, kits, pending, run }: { episodeId: string; kits: Kit[]; pending: boolean; run: (fn: () => Promise<unknown>) => void }) {
  const [kind, setKind] = useState("");
  const [testedOn, setTestedOn] = useState(isoToday());
  const [result, setResult] = useState("");
  const [kitId, setKitId] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TEST_KINDS.map((k) => <Chip key={k.key} selected={kind === k.key} onClick={() => setKind(k.key)}>{k.label}</Chip>)}
      </div>
      {kind && kind !== "utee" && (
        <>
          <DateChips label="Date" value={testedOn} onChange={setTestedOn} />
          <div className="flex flex-wrap gap-2">
            {TEST_RESULTS.map((r) => <Chip key={r.key} selected={result === r.key} onClick={() => setResult(r.key)}>{r.label}</Chip>)}
          </div>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else (optional)" className={inputClass} aria-label="Test notes" />
        </>
      )}
      {kind === "utee" && (
        kits.length ? (
          <div className="flex flex-wrap gap-2">
            {kits.map((k) => <Chip key={k.id} selected={kitId === k.id} onClick={() => setKitId(k.id)}>Kit {k.code}</Chip>)}
          </div>
        ) : (
          <p className="text-sm text-slate-600">{copy.log.uteeTestNone}</p>
        )
      )}
      {kind && (kind !== "utee" || kitId) && (
        <Button disabled={pending} onClick={() => run(async () => { const r = await addTest(episodeId, { kind, tested_on: kind === "utee" ? "" : testedOn, result, notes, kit_id: kind === "utee" ? kitId : "" }); if (!r.error) { setKind(""); setResult(""); setKitId(""); setNotes(""); } return r; })}>
          Add test
        </Button>
      )}
    </div>
  );
}
