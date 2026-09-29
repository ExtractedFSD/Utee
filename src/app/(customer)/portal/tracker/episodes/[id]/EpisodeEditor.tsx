"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Button, Card, LinkButton, StatusBadge, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { COURSE_DAYS, COURSE_TYPES, SOURCES, SYMPTOMS, TEST_KINDS, TEST_RESULTS, TRIGGERS, WORKED, labelFor } from "@/lib/tracker/options";
import { redFlagFor } from "@/lib/tracker/redflags";
import { antibioticName } from "@/lib/tracker/search";
import { askDateFor, episodeLength, formatDay, formatDayShort, isoToday } from "@/lib/tracker/stats";
import type { EpisodeRow } from "@/lib/tracker/stats";
import type { KitStatus } from "@/lib/status";
import { Chip, ChipGroup, DateChips } from "../../components/Chips";
import { FeelingFaces } from "../../components/FeelingFaces";
import { AntibioticPicker } from "../../components/AntibioticPicker";
import { RedFlagBanner } from "../../components/RedFlagBanner";
import { Sheet } from "../../components/Sheet";
import {
  addTest, addTreatment, copyYesterdaySymptoms, deleteEpisode, deleteTest, deleteTreatment, rateTreatment, setFeeling,
  toggleSymptom, toggleTrigger, updateEpisode, updateTreatment,
} from "../../actions";

type Item = { key: string; other: string | null };
type Treatment = { id: string; antibiotic_id: string; other_name: string | null; started_on: string | null; days: number | null; course_type: string | null; source: string | null; worked: string | null };
type TestItem = { id: string; kind: string; tested_on: string | null; result: string | null; notes: string | null; kit_id: string | null; kitCode: string | null; kitStatus: string | null; kitReportReady: boolean };
type Kit = { id: string; code: string; status: string; reportReady: boolean };
/** Runs a server action in a transition. `optimistic` applies the expected result immediately. */
type Run = (fn: () => Promise<unknown>, optimistic?: () => void) => void;
type Row = "triggers" | "treatment" | "tests" | "notes";

const linkBtn = "min-h-[44px] px-2 text-sm font-semibold text-maroon";

/*
 * Two jobs, two areas: today's check-in first (seconds, no submit), then
 * "About this UTI" as a collapsed summary that opens row by row.
 */
export function EpisodeEditor({
  episode, today, pregnantOrTrying, todaySymptoms, yesterdaySymptoms, triggers, treatments, tests, feelingToday,
  symptomOrder, triggerOrder, previousAntibiotics, lastSource, kits,
}: {
  episode: EpisodeRow; today: string; pregnantOrTrying: string; todaySymptoms: Item[]; yesterdaySymptoms: string[];
  triggers: Item[]; treatments: Treatment[]; tests: TestItem[]; feelingToday: number | null;
  symptomOrder: string[]; triggerOrder: string[]; previousAntibiotics: string[]; lastSource: string | null; kits: Kit[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openRow, setOpenRow] = useState<Row | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dateSheet, setDateSheet] = useState(false);
  const [closing, setClosing] = useState(false);
  const [endedOn, setEndedOn] = useState(isoToday());
  const [symptomOther, setSymptomOther] = useState(todaySymptoms.find((s) => s.key === "other")?.other ?? "");
  const [triggerOther, setTriggerOther] = useState(triggers.find((t) => t.key === "other")?.other ?? "");

  // Optimistic copies of the things people tap many times a day. They update on
  // the tap and settle to the server's values once the action has finished.
  type Toggle = { key: string; on: boolean };
  const applyToggle = (state: string[], { key, on }: Toggle) => (on ? [...new Set([...state, key])] : state.filter((k) => k !== key));
  const [symptomKeys, toggleSymptomNow] = useOptimistic(todaySymptoms.map((s) => s.key), applyToggle);
  const [triggerKeys, toggleTriggerNow] = useOptimistic(triggers.map((t) => t.key), applyToggle);
  const [feeling, setFeelingNow] = useOptimistic(feelingToday, (_: number | null, next: number) => next);

  const run: Run = (fn, optimistic) => {
    setError(null);
    startTransition(async () => {
      optimistic?.();
      const r = await fn();
      const err = (r as { error?: string } | null | undefined)?.error;
      if (err) setError(err);
      else {
        setSaved(true);
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSaved(false), 1500);
      }
    });
  };
  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

  const open = !episode.ended_on;
  const day = episodeLength(episode, today);
  const symptomSet = new Set(symptomKeys);
  const triggerSet = new Set(triggerKeys);
  const yesterdayHasSymptoms = yesterdaySymptoms.length > 0;
  const flag = redFlagFor(symptomSet, pregnantOrTrying);
  const orderOptions = (list: { key: string; label: string }[], order: string[]) => order.map((k) => list.find((o) => o.key === k)!).filter(Boolean);
  const dueToAsk = treatments.filter((t) => !t.worked && (askDateFor(t.started_on, t.days) ?? "9999") <= today);
  const unrated = treatments.filter((t) => !t.worked);
  const onThisUti = treatments.map((t) => t.antibiotic_id);

  const treatmentSummary = (t: Treatment) =>
    [antibioticName(t.antibiotic_id, t.other_name), t.days && `${t.days} day${t.days === 1 ? "" : "s"}${t.started_on ? ` from ${formatDay(t.started_on)}` : ""}`, labelFor(SOURCES, t.source)].filter(Boolean).join(" · ");
  const testSummary = (t: TestItem) =>
    t.kit_id ? `${labelFor(TEST_KINDS, "utee")} ${t.kitCode ?? ""}` : [labelFor(TEST_KINDS, t.kind), labelFor(TEST_RESULTS, t.result)].filter(Boolean).join(" · ");

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* ------------------------------------------------------------ header */}
      <div>
        <Link href="/portal/tracker" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-maroon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
          {copy.episode.back}
        </Link>
        <button type="button" onClick={() => setDateSheet(true)} className="block text-eyebrow uppercase text-maroon min-h-[44px] -mt-2" aria-label={copy.episode.changeStart}>
          {open ? copy.episode.started(formatDayShort(episode.started_on), day) : copy.episode.ended(formatDayShort(episode.ended_on), day)}
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3 -mt-1">
          <h1 className="font-display text-4xl font-light text-midnight">{copy.episode.title}</h1>
          <div className="relative flex items-center gap-2">
            {open ? (
              <Button onClick={() => { setEndedOn(isoToday()); setClosing(true); }}>{copy.episode.feelBetter}</Button>
            ) : (
              <Button variant="secondary" disabled={pending} onClick={() => run(() => updateEpisode(episode.id, { endedOn: null }))}>{copy.episode.reopen}</Button>
            )}
            <button
              type="button"
              aria-label={copy.episode.menu}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((m) => !m)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-midnight/15 bg-white text-midnight hover:bg-pink-25"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-12 z-30 min-w-[200px] rounded-2xl bg-white p-2 shadow-card">
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setConfirmDelete(true); }} className="w-full min-h-[44px] rounded-xl px-3 text-left text-sm font-semibold text-maroon hover:bg-pink-25">
                  {copy.episode.delete}
                </button>
              </div>
            )}
          </div>
        </div>
        {error && <p className="text-sm text-rose-600 mt-2">{error}</p>}
      </div>

      {confirmDelete && (
        <Card className="border border-maroon/30" data-testid="confirm-delete">
          <p className="font-display text-2xl font-light text-midnight">{copy.episode.deleteConfirmTitle}</p>
          <p className="text-sm text-slate-700 mt-1 mb-4">{copy.episode.deleteConfirmBody}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" disabled={pending} onClick={() => run(() => deleteEpisode(episode.id))}>{copy.episode.deleteConfirmButton}</Button>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>{copy.episode.cancel}</Button>
          </div>
        </Card>
      )}

      <Sheet open={dateSheet} title={copy.episode.changeStart} onClose={() => setDateSheet(false)} testId="date-sheet">
        <DateChips value={episode.started_on} onChange={(iso) => run(async () => { const r = await updateEpisode(episode.id, { startedOn: iso }); return r; })} />
      </Sheet>

      <Sheet open={closing} title={copy.episode.whenBetter} onClose={() => setClosing(false)} doneLabel={copy.episode.cancel} testId="close-panel">
        <div className="space-y-4">
          <DateChips value={endedOn} onChange={setEndedOn} />
          {unrated.map((t) => (
            <div key={t.id}>
              <p className="text-sm font-semibold text-midnight mb-2">{copy.episode.howDidItGo(antibioticName(t.antibiotic_id, t.other_name))}</p>
              <div className="flex flex-wrap gap-2">
                {WORKED.map((w) => <Chip key={w.key} selected={t.worked === w.key} disabled={pending} onClick={() => run(() => rateTreatment(t.id, w.key))}>{w.label}</Chip>)}
              </div>
            </div>
          ))}
          <Button disabled={pending} onClick={() => run(async () => { const r = await updateEpisode(episode.id, { endedOn }); if (!(r as { error?: string }).error) setClosing(false); return r; })}>{copy.log.save}</Button>
        </div>
      </Sheet>

      {/* -------------------------------------------------------------- today */}
      {open ? (
        <Card data-testid="today-card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-2xl font-light text-midnight">{copy.episode.today(formatDayShort(today))}</h2>
            <span aria-live="polite" className={`inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
              {copy.episode.saved}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-700 mb-2">{copy.episode.feelingQuestion}</p>
          <FeelingFaces value={feeling} onChange={(f) => run(() => setFeeling(episode.id, f), () => setFeelingNow(f))} />
          <p className="text-sm font-semibold text-slate-700 mt-5 mb-2">{copy.episode.noticingQuestion}</p>
          <div className="flex flex-wrap gap-2">
            {yesterdayHasSymptoms && (
              <Chip size="lg" onClick={() => run(() => copyYesterdaySymptoms(episode.id), () => yesterdaySymptoms.forEach((key) => toggleSymptomNow({ key, on: true })))}>{copy.episode.sameAsYesterday}</Chip>
            )}
          </div>
          <div className={yesterdayHasSymptoms ? "mt-2" : ""}>
            <ChipGroup
              options={orderOptions(SYMPTOMS, symptomOrder)}
              selected={symptomSet}
              onToggle={(key, on) => run(() => toggleSymptom(episode.id, key, on, symptomOther, today), () => toggleSymptomNow({ key, on }))}
              otherText={symptomOther}
              onOtherText={setSymptomOther}
            />
            {symptomSet.has("other") && (
              <button type="button" className={linkBtn} disabled={pending} onClick={() => run(() => toggleSymptom(episode.id, "other", true, symptomOther, today))}>{copy.log.save}</button>
            )}
          </div>
          {flag.show && <div className="mt-4"><RedFlagBanner flag={flag} /></div>}
          {dueToAsk.map((t) => (
            <div key={t.id} className="mt-5 rounded-2xl bg-pink-25 p-4">
              <p className="text-sm font-semibold text-midnight mb-2">{copy.episode.howDidItGo(antibioticName(t.antibiotic_id, t.other_name))}</p>
              <div className="flex flex-wrap gap-2">
                {WORKED.map((w) => <Chip key={w.key} disabled={pending} onClick={() => run(() => rateTreatment(t.id, w.key))}>{w.label}</Chip>)}
              </div>
            </div>
          ))}
        </Card>
      ) : (
        <Card><p className="text-sm text-slate-700">{copy.episode.closedNote}</p></Card>
      )}

      {/* --------------------------------------------------------- about this */}
      <Card data-testid="about-card">
        <h2 className="font-display text-2xl font-light text-midnight mb-2">{copy.episode.aboutTitle}</h2>
        <ul className="divide-y divide-slate-100">
          <SummaryRow
            label={copy.episode.rows.triggers}
            lines={[...triggerSet].map((k) => (k === "other" ? triggerOther || "Other" : labelFor(TRIGGERS, k)))}
            isOpen={openRow === "triggers"}
            onOpen={() => setOpenRow("triggers")}
          />
          <SummaryRow
            label={copy.episode.rows.treatment}
            lines={treatments.map(treatmentSummary)}
            isOpen={openRow === "treatment"}
            onOpen={() => setOpenRow("treatment")}
          />
          <SummaryRow
            label={copy.episode.rows.tests}
            lines={tests.map(testSummary)}
            isOpen={openRow === "tests"}
            onOpen={() => setOpenRow("tests")}
          />
          <SummaryRow
            label={copy.episode.rows.notes}
            lines={episode.notes ? [episode.notes.split("\n")[0]] : []}
            emptyLabel={copy.episode.addNote}
            isOpen={openRow === "notes"}
            onOpen={() => setOpenRow("notes")}
          />
        </ul>

        <Sheet open={openRow === "triggers"} title={copy.log.triggers} onClose={() => setOpenRow(null)} testId="sheet-triggers">
          <ChipGroup
            options={orderOptions(TRIGGERS, triggerOrder)}
            selected={triggerSet}
            onToggle={(key, on) => run(() => toggleTrigger(episode.id, key, on, triggerOther), () => toggleTriggerNow({ key, on }))}
            otherText={triggerOther}
            onOtherText={setTriggerOther}
          />
          {triggerSet.has("other") && (
            <button type="button" className={linkBtn} disabled={pending} onClick={() => run(() => toggleTrigger(episode.id, "other", true, triggerOther))}>{copy.log.save}</button>
          )}
        </Sheet>

        <Sheet open={openRow === "treatment"} title={copy.episode.rows.treatment} onClose={() => setOpenRow(null)} testId="sheet-treatment">
          <TreatmentSection episodeId={episode.id} today={today} treatments={treatments} previous={previousAntibiotics} onThisUti={onThisUti} lastSource={lastSource} pending={pending} run={run} />
        </Sheet>

        <Sheet open={openRow === "tests"} title={copy.episode.rows.tests} onClose={() => setOpenRow(null)} testId="sheet-tests">
          <TestSection episodeId={episode.id} tests={tests} kits={kits} pending={pending} run={run} />
        </Sheet>

        <Sheet open={openRow === "notes"} title={copy.episode.rows.notes} onClose={() => setOpenRow(null)} testId="sheet-notes">
          <NotesField episodeId={episode.id} initial={episode.notes ?? ""} run={run} />
        </Sheet>
      </Card>

      <div className="flex justify-center pt-2">
        <LinkButton href="/portal/tracker/summary" variant="secondary">{copy.episode.downloadSummary}</LinkButton>
      </div>
    </div>
  );
}

function SummaryRow({ label, lines, emptyLabel, isOpen, onOpen }: { label: string; lines: string[]; emptyLabel?: string; isOpen: boolean; onOpen: () => void }) {
  const has = lines.length > 0;
  return (
    <li>
      <button type="button" onClick={onOpen} aria-expanded={isOpen} className="flex w-full min-h-[56px] items-center justify-between gap-4 py-3 text-left">
        <span className="min-w-0">
          <span className="block text-xs text-slate-500">{label}</span>
          {isOpen ? (
            <span className="block text-sm text-slate-500">{copy.episode.editing}</span>
          ) : has ? (
            lines.map((l, i) => <span key={i} className="block truncate text-sm font-semibold text-midnight">{l}</span>)
          ) : (
            <span className="block text-sm text-slate-500">{emptyLabel ?? copy.episode.add}</span>
          )}
        </span>
        <span className="shrink-0 text-sm font-semibold text-maroon">{isOpen ? "" : has ? copy.episode.edit : copy.episode.add}</span>
      </button>
    </li>
  );
}

function TreatmentSection({ episodeId, today, treatments, previous, onThisUti, lastSource, pending, run }: { episodeId: string; today: string; treatments: Treatment[]; previous: string[]; onThisUti: string[]; lastSource: string | null; pending: boolean; run: Run }) {
  const [mode, setMode] = useState<"list" | "add" | string>("list");
  const editing = treatments.find((t) => t.id === mode) ?? null;
  if (mode === "add" || editing) {
    return (
      <TreatmentForm
        key={mode}
        initial={editing}
        previous={previous}
        exclude={onThisUti.filter((id) => id !== editing?.antibiotic_id)}
        lastSource={lastSource}
        pending={pending}
        onCancel={() => setMode("list")}
        onSubmit={(input) => run(async () => {
          const r = editing ? await updateTreatment(editing.id, input) : await addTreatment(episodeId, input);
          if (!(r as { error?: string }).error) setMode("list");
          return r;
        })}
        onRemove={editing ? () => run(async () => { const r = await deleteTreatment(editing.id); setMode("list"); return r; }) : undefined}
      />
    );
  }
  return (
    <div className="space-y-3">
      {treatments.length > 0 && (
        <ul className="divide-y divide-slate-200">
          {treatments.map((t) => {
            const ask = askDateFor(t.started_on, t.days);
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-midnight">{antibioticName(t.antibiotic_id, t.other_name)}</p>
                  <p className="text-xs text-slate-600">
                    {[t.days && `${t.days} day${t.days === 1 ? "" : "s"}`, t.started_on && `from ${formatDay(t.started_on)}`, labelFor(COURSE_TYPES, t.course_type), labelFor(SOURCES, t.source)].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.worked ? `${copy.log.didItWork} ${labelFor(WORKED, t.worked)}` : ask && ask > today ? copy.episode.willAskOn(formatDayShort(ask)) : ask ? copy.episode.askToday : copy.episode.willAskOnClose}
                  </p>
                </div>
                <button type="button" className={linkBtn} onClick={() => setMode(t.id)}>{copy.episode.edit}</button>
              </li>
            );
          })}
        </ul>
      )}
      <Button variant="secondary" onClick={() => setMode("add")}>{treatments.length ? copy.episode.addAnotherAntibiotic : copy.episode.addAntibiotic}</Button>
    </div>
  );
}

function TreatmentForm({ initial, previous, exclude, lastSource, pending, onCancel, onSubmit, onRemove }: {
  initial: Treatment | null; previous: string[]; exclude: string[]; lastSource: string | null; pending: boolean;
  onCancel: () => void; onSubmit: (input: { antibiotic_id: string; other_name: string; started_on: string; days: number | null; course_type: string; source: string }) => void; onRemove?: () => void;
}) {
  const [antibiotic, setAntibiotic] = useState<string | null>(initial?.antibiotic_id ?? null);
  const [otherName, setOtherName] = useState(initial?.other_name ?? "");
  const [startedOn, setStartedOn] = useState(initial?.started_on ?? isoToday());
  const [days, setDays] = useState<number | null>(initial?.days ?? null);
  const [customDays, setCustomDays] = useState(initial?.days && !COURSE_DAYS.includes(initial.days) ? String(initial.days) : "");
  const [courseType, setCourseType] = useState(initial?.course_type ?? "");
  const [source, setSource] = useState(initial?.source ?? lastSource ?? "");
  return (
    <div className="space-y-4">
      <AntibioticPicker value={antibiotic} otherName={otherName} previous={previous} exclude={exclude} autoFocus={!initial} onChange={(id, other) => { setAntibiotic(id); if (other !== undefined) setOtherName(other); }} />
      {antibiotic && (
        <>
          <DateChips label="Started" value={startedOn} onChange={setStartedOn} />
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Course length</p>
            <p className="text-xs text-slate-500 mb-2">{copy.log.courseHint}</p>
            <div className="flex flex-wrap gap-2">
              {COURSE_DAYS.map((d) => <Chip key={d} selected={days === d && !customDays} onClick={() => { setDays(d); setCustomDays(""); }}>{d} day{d === 1 ? "" : "s"}</Chip>)}
              <Chip selected={!!customDays} onClick={() => { setCustomDays("10"); setDays(10); }}>Other</Chip>
              {customDays && <input type="number" min={1} max={365} value={customDays} onChange={(e) => { setCustomDays(e.target.value); setDays(Number(e.target.value) || null); }} className={`${inputClass} w-24`} aria-label="Number of days" />}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Type of course</p>
            <div className="flex flex-wrap gap-2">{COURSE_TYPES.map((c) => <Chip key={c.key} selected={courseType === c.key} onClick={() => setCourseType(c.key)}>{c.label}</Chip>)}</div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Where it came from</p>
            <div className="flex flex-wrap gap-2">{SOURCES.map((s) => <Chip key={s.key} selected={source === s.key} onClick={() => setSource(s.key)}>{s.label}</Chip>)}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={pending} onClick={() => onSubmit({ antibiotic_id: antibiotic, other_name: otherName, started_on: startedOn, days, course_type: courseType, source })}>{initial ? copy.log.save : copy.episode.add}</Button>
            <button type="button" className={linkBtn} onClick={onCancel}>{copy.episode.cancel}</button>
            {onRemove && <button type="button" className={`${linkBtn} ml-auto`} disabled={pending} onClick={onRemove}>{copy.episode.remove}</button>}
          </div>
        </>
      )}
      {!antibiotic && <button type="button" className={linkBtn} onClick={onCancel}>{copy.episode.cancel}</button>}
    </div>
  );
}

function TestSection({ episodeId, tests, kits, pending, run }: { episodeId: string; tests: TestItem[]; kits: Kit[]; pending: boolean; run: Run }) {
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState("");
  const [testedOn, setTestedOn] = useState(isoToday());
  const [result, setResult] = useState("");
  const [kitId, setKitId] = useState("");
  const [notes, setNotes] = useState("");
  const reset = () => { setAdding(false); setKind(""); setResult(""); setKitId(""); setNotes(""); };
  if (adding) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">{TEST_KINDS.map((k) => <Chip key={k.key} selected={kind === k.key} onClick={() => setKind(k.key)}>{k.label}</Chip>)}</div>
        {kind && kind !== "utee" && (
          <>
            <DateChips label="Date" value={testedOn} onChange={setTestedOn} />
            <div className="flex flex-wrap gap-2">{TEST_RESULTS.map((r) => <Chip key={r.key} selected={result === r.key} onClick={() => setResult(r.key)}>{r.label}</Chip>)}</div>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else (optional)" className={inputClass} aria-label="Test notes" />
          </>
        )}
        {kind === "utee" && (kits.length ? (
          <div className="flex flex-wrap gap-2">{kits.map((k) => <Chip key={k.id} selected={kitId === k.id} onClick={() => setKitId(k.id)}>Kit {k.code}</Chip>)}</div>
        ) : <p className="text-sm text-slate-600">{copy.log.uteeTestNone}</p>)}
        <div className="flex flex-wrap items-center gap-3">
          {kind && (kind !== "utee" || kitId) && (
            <Button disabled={pending} onClick={() => run(async () => { const r = await addTest(episodeId, { kind, tested_on: kind === "utee" ? "" : testedOn, result, notes, kit_id: kind === "utee" ? kitId : "" }); if (!(r as { error?: string }).error) reset(); return r; })}>{copy.episode.add}</Button>
          )}
          <button type="button" className={linkBtn} onClick={reset}>{copy.episode.cancel}</button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {tests.length > 0 && (
        <ul className="divide-y divide-slate-200">
          {tests.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-midnight">{labelFor(TEST_KINDS, t.kind)}{t.kitCode ? ` ${t.kitCode}` : ""}</p>
                <p className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                  {t.kit_id ? (
                    <>
                      <span>{copy.log.uteeTestLinked}</span>
                      {t.kitStatus && <StatusBadge status={t.kitStatus as KitStatus} />}
                      {t.kitReportReady && <Link href={`/portal/tests/${t.kit_id}`} className="font-semibold text-maroon">View report</Link>}
                    </>
                  ) : (
                    [t.tested_on && formatDay(t.tested_on), labelFor(TEST_RESULTS, t.result), t.notes].filter(Boolean).join(" · ")
                  )}
                </p>
              </div>
              <button type="button" className={linkBtn} disabled={pending} onClick={() => run(() => deleteTest(t.id))}>{copy.episode.remove}</button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="secondary" onClick={() => setAdding(true)}>{copy.episode.addTest}</Button>
    </div>
  );
}

function NotesField({ episodeId, initial, run }: { episodeId: string; initial: string; run: Run }) {
  const [notes, setNotes] = useState(initial);
  return (
    <textarea
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      onBlur={() => { if (notes !== initial) run(() => updateEpisode(episodeId, { notes })); }}
      rows={4}
      autoFocus
      className={inputClass}
      aria-label={copy.log.notes}
      placeholder="Anything else worth remembering"
    />
  );
}
