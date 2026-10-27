"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Button, Card, StatusBadge, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { COURSE_DAYS, COURSE_TYPES, SOURCES, SYMPTOMS, TEST_KINDS, TEST_RESULTS, TRIGGERS, WORKED, labelFor } from "@/lib/tracker/options";
import { FREQUENCIES, ROUTES } from "@/lib/tracker/passport";
import { redFlagFor } from "@/lib/tracker/redflags";
import { antibioticDisplayName, antibioticName } from "@/lib/tracker/search";
import { askDateFor, episodeLength, formatDay, formatDayShort, isoToday } from "@/lib/tracker/stats";
import type { EpisodeRow } from "@/lib/tracker/stats";
import type { KitStatus } from "@/lib/status";
import { Chip, ChipGroup, DateChips } from "../../components/Chips";
import type { ScorePoint } from "@/lib/tracker/diary";
import { FEELING_SHADE, dayMeans, meanSummary } from "@/lib/tracker/diary";
import { AntibioticPicker } from "../../components/AntibioticPicker";
import { RedFlagBanner } from "../../components/RedFlagBanner";
import { Sheet } from "../../components/Sheet";
import {
  addTest, addTreatment, deleteEpisode, deleteTest, deleteTreatment, rateTreatment,
  toggleSymptom, toggleTrigger, updateEpisode, updateTreatment,
} from "../../actions";

type Item = { key: string; other: string | null; severity?: number | null };
type Treatment = { id: string; antibiotic_id: string; other_name: string | null; started_on: string | null; days: number | null; course_type: string | null; source: string | null; worked: string | null; dose?: string | null; frequency?: string | null; route?: string | null; reaction?: string | null };
type TestItem = { id: string; kind: string; tested_on: string | null; result: string | null; notes: string | null; kit_id: string | null; kitCode: string | null; kitStatus: string | null; kitReportReady: boolean };
type Kit = { id: string; code: string; status: string; reportReady: boolean };
/** Runs a server action in a transition. `optimistic` applies the expected result immediately. */
type Run = (fn: () => Promise<unknown>, optimistic?: () => void) => void;
type Row = "symptoms" | "triggers" | "treatment" | "tests" | "notes";

const linkBtn = "min-h-[44px] px-2 text-sm font-semibold text-maroon";

/*
 * Two jobs, two areas: today's check-in first (seconds, no submit), then
 * "About this UTI" as a collapsed summary that opens row by row.
 */
export function EpisodeEditor({
  episode, today, pregnantOrTrying, todaySymptoms, allSymptoms, triggers, treatments, tests,
  symptomOrder, triggerOrder, previousAntibiotics, lastSource, kits, scores = [],
}: {
  episode: EpisodeRow; today: string; pregnantOrTrying: string; todaySymptoms: Item[]; allSymptoms: string[];
  triggers: Item[]; treatments: Treatment[]; tests: TestItem[];
  symptomOrder: string[]; triggerOrder: string[]; previousAntibiotics: string[]; lastSource: string | null; kits: Kit[];
  scores?: ScorePoint[];
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
  const symptomKeys = todaySymptoms.map((s) => s.key);
  const [triggerKeys, toggleTriggerNow] = useOptimistic(triggers.map((t) => t.key), applyToggle);
  // For a closed UTI the symptoms are one summary across the whole episode.
  const [allSymptomKeys, toggleAllSymptomNow] = useOptimistic(allSymptoms, applyToggle);

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
  const flag = redFlagFor(symptomSet, pregnantOrTrying);
  const orderOptions = (list: { key: string; label: string }[], order: string[]) => order.map((k) => list.find((o) => o.key === k)!).filter(Boolean);
  const means = dayMeans(scores);
  const title = open ? copy.episode.titleOpen(formatDay(episode.started_on)) : rangeText(episode.started_on, episode.ended_on!);
  const unrated = treatments.filter((t) => !t.worked);
  const onThisUti = treatments.map((t) => t.antibiotic_id);

  const treatmentSummary = (t: Treatment) =>
    [antibioticDisplayName(t.antibiotic_id, t.other_name), t.days && `${t.days} day${t.days === 1 ? "" : "s"}${t.started_on ? ` from ${formatDay(t.started_on)}` : ""}`, labelFor(SOURCES, t.source)].filter(Boolean).join(" · ");
  const testSummary = (t: TestItem) =>
    t.kit_id ? `${labelFor(TEST_KINDS, "utee")} ${t.kitCode ?? ""}` : [labelFor(TEST_KINDS, t.kind), labelFor(TEST_RESULTS, t.result)].filter(Boolean).join(" · ");

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* ------------------------------------------------------------ header */}
      <div>
        <Link href="/portal/passport/history" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-maroon -ml-1">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
          {copy.episode.back}
        </Link>
        <p className="text-eyebrow uppercase text-maroon mt-1">
          {open ? copy.episode.eyebrowOpen(day, formatDayShort(episode.started_on)) : copy.episode.eyebrowEnded(formatDayShort(episode.ended_on), day)}
        </p>
        <div className="flex items-start justify-between gap-3 mt-1">
          <h1 className="font-display text-[30px] font-light leading-tight text-midnight">{title}</h1>
          <div className="relative shrink-0">
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
              <div role="menu" className="absolute right-0 top-12 z-30 min-w-[220px] rounded-2xl bg-white p-2 shadow-card">
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setDateSheet(true); }} className="w-full min-h-[44px] rounded-xl px-3 text-left text-sm font-semibold text-midnight hover:bg-pink-25">{copy.episode.changeStart}</button>
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setConfirmDelete(true); }} className="w-full min-h-[44px] rounded-xl px-3 text-left text-sm font-semibold text-maroon hover:bg-pink-25">{copy.episode.delete}</button>
              </div>
            )}
          </div>
        </div>
        {error && <p className="text-sm text-rose-600 mt-2">{error}</p>}
      </div>

      {open && flag.show && <RedFlagBanner flag={flag} />}

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
              <p className="text-sm font-semibold text-midnight mb-2">{copy.episode.howDidItGo(antibioticDisplayName(t.antibiotic_id, t.other_name))}</p>
              <div className="flex flex-wrap gap-2">
                {WORKED.map((w) => <Chip key={w.key} selected={t.worked === w.key} disabled={pending} onClick={() => run(() => rateTreatment(t.id, w.key))}>{w.label}</Chip>)}
              </div>
            </div>
          ))}
          <Button disabled={pending} onClick={() => run(async () => { const r = await updateEpisode(episode.id, { endedOn }); if (!(r as { error?: string }).error) setClosing(false); return r; })}>{copy.log.save}</Button>
        </div>
      </Sheet>

      {/* ---------------------------------------------------------- how it went */}
      {means.length > 1 && (
        <Card data-testid="score-card">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h2 className="font-display text-2xl font-light text-midnight">{copy.episode.howItWent}</h2>
            <p className="text-sm text-[#5a4a6e]">{copy.episode.scoreScale}</p>
          </div>
          <div className="flex items-end gap-1.5" style={{ height: 120 }} role="img" aria-label={means.map((m) => `day ${m.day}: ${m.mean} out of 10`).join(", ")}>
            {means.map((m) => (
              <div key={m.on} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1 h-full">
                <span className="text-xs font-semibold text-midnight">{m.mean}</span>
                <span className="w-full rounded-[6px]" style={{ height: `${Math.max(6, m.mean * 9)}%`, background: FEELING_SHADE[Math.max(1, Math.min(5, 6 - Math.ceil(m.mean / 2)))] }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1.5 text-[11px] text-[#8a7a9c]">
            {means.map((m) => <span key={m.on} className="min-w-0 flex-1 truncate text-center">{means.length <= 8 ? formatDayShort(m.on).split(",")[0] : `D${m.day}`}</span>)}
          </div>
          {meanSummary(scores) && <p className="mt-3 text-sm text-[#5a4a6e]">{meanSummary(scores)}</p>}
        </Card>
      )}

      {/* --------------------------------------------------------- about this */}
      <Card data-testid="about-card">
        <ul className="divide-y divide-[rgba(29,0,58,.08)]">
          <SummaryRow
            label={copy.episode.rows.symptoms}
            lines={allSymptomKeys.map((k) => (k === "other" ? symptomOther || "Other" : SYMPTOMS.find((o) => o.key === k)?.short ?? labelFor(SYMPTOMS, k)))}
            isOpen={openRow === "symptoms"}
            onOpen={() => setOpenRow("symptoms")}
          />
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
            emptyLabel={copy.episode.none}
            isOpen={openRow === "notes"}
            onOpen={() => setOpenRow("notes")}
          />
        </ul>

        <Sheet open={openRow === "symptoms"} title={copy.log.symptomsPast} onClose={() => setOpenRow(null)} testId="sheet-symptoms">
          <ChipGroup
            options={orderOptions(SYMPTOMS, symptomOrder)}
            selected={new Set(allSymptomKeys)}
            onToggle={(key, on) => run(() => toggleSymptom(episode.id, key, on, symptomOther, episode.started_on, "all"), () => toggleAllSymptomNow({ key, on }))}
            otherText={symptomOther}
            onOtherText={setSymptomOther}
          />
        </Sheet>

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
        {open ? (
          <Button onClick={() => { setEndedOn(isoToday()); setClosing(true); }}>{copy.episode.feelBetter}</Button>
        ) : (
          <Button variant="secondary" disabled={pending} onClick={() => run(() => updateEpisode(episode.id, { endedOn: null }))}>{copy.episode.reopenThis}</Button>
        )}
      </div>
    </div>
  );
}

/** "21 to 24 Sept 2026", or "28 Sept to 2 Oct 2026" across a month, or the full dates across a year. */
function rangeText(startIso: string, endIso: string): string {
  const a = formatDay(startIso);
  const b = formatDay(endIso);
  if (startIso === endIso) return a;
  if (startIso.slice(0, 4) !== endIso.slice(0, 4)) return `${a} to ${b}`;
  if (startIso.slice(0, 7) === endIso.slice(0, 7)) return `${startIso.slice(8, 10).replace(/^0/, "")} to ${b}`;
  return `${a.replace(/ \d{4}$/, "")} to ${b}`;
}

function SummaryRow({ label, lines, emptyLabel, isOpen, onOpen }: { label: string; lines: string[]; emptyLabel?: string; isOpen: boolean; onOpen: () => void }) {
  const has = lines.length > 0;
  return (
    <li>
      <button type="button" onClick={onOpen} aria-expanded={isOpen} className="flex w-full min-h-[56px] items-center justify-between gap-4 py-3 text-left">
        <span className="min-w-0">
          <span className="block text-xs text-[#5a4a6e]">{label}</span>
          {isOpen ? (
            <span className="block text-sm text-[#8a7a9c]">{copy.episode.editing}</span>
          ) : has ? (
            lines.map((l, i) => <span key={i} className="block text-sm font-semibold text-midnight">{l}</span>)
          ) : (
            <span className="block text-sm text-[#8a7a9c]">{emptyLabel ?? copy.episode.noneRecorded}</span>
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
                  <p className="text-sm font-semibold text-midnight">{antibioticDisplayName(t.antibiotic_id, t.other_name)}</p>
                  <p className="text-xs text-slate-600">
                    {[t.days && `${t.days} day${t.days === 1 ? "" : "s"}`, t.started_on && `from ${formatDay(t.started_on)}`, t.course_type && t.course_type !== "treatment" ? labelFor(COURSE_TYPES, t.course_type) : "", labelFor(SOURCES, t.source)].filter(Boolean).join(" · ")}
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
  onCancel: () => void; onSubmit: (input: { antibiotic_id: string; other_name: string; started_on: string; days: number | null; course_type: string; source: string; dose: string; frequency: string; route: string; reaction: string }) => void; onRemove?: () => void;
}) {
  const [antibiotic, setAntibiotic] = useState<string | null>(initial?.antibiotic_id ?? null);
  const [otherName, setOtherName] = useState(initial?.other_name ?? "");
  const [startedOn, setStartedOn] = useState(initial?.started_on ?? isoToday());
  const [days, setDays] = useState<number | null>(initial?.days ?? null);
  const [customDays, setCustomDays] = useState(initial?.days && !COURSE_DAYS.includes(initial.days) ? String(initial.days) : "");
  // Course type is no longer asked; an existing value is kept, new courses are treatment courses.
  const courseType = initial?.course_type ?? "treatment";
  const [source, setSource] = useState(initial?.source ?? lastSource ?? "");
  // Passport detail, all optional: folded away until wanted.
  const [dose, setDose] = useState(initial?.dose ?? "");
  const [frequency, setFrequency] = useState(initial?.frequency ?? "");
  const [route, setRoute] = useState(initial?.route ?? "oral");
  const [reaction, setReaction] = useState(initial?.reaction ?? "");
  const [moreOpen, setMoreOpen] = useState(!!(initial?.dose || initial?.frequency || initial?.reaction || (initial?.route && initial.route !== "oral")));
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
            <p className="text-sm font-semibold text-slate-700 mb-2">Where it came from</p>
            <div className="flex flex-wrap gap-2">{SOURCES.map((s) => <Chip key={s.key} selected={source === s.key} onClick={() => setSource(s.key)}>{s.label}</Chip>)}</div>
          </div>
          <details open={moreOpen} onToggle={(e) => setMoreOpen((e.target as HTMLDetailsElement).open)} className="rounded-2xl border border-slate-200 px-4 py-3" data-testid="treatment-detail">
            <summary className="cursor-pointer select-none text-sm font-semibold text-maroon min-h-[32px] inline-flex items-center">Dose, how often and how it went (optional)</summary>
            <div className="mt-3 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="treatment-dose" className="block text-sm font-semibold text-slate-700 mb-1">{copy.treatmentDetail.dose}</label>
                  <p className="text-xs text-slate-500 mb-2">{copy.treatmentDetail.doseHint}</p>
                  <input id="treatment-dose" value={dose} onChange={(e) => setDose(e.target.value)} className={inputClass} maxLength={60} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">{copy.treatmentDetail.route}</p>
                  <div className="flex flex-wrap gap-2">{ROUTES.map((r) => <Chip key={r.key} selected={route === r.key} onClick={() => setRoute(r.key)}>{r.label}</Chip>)}</div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">{copy.treatmentDetail.frequency}</p>
                <div className="flex flex-wrap gap-2">{FREQUENCIES.filter((f) => !["twice_weekly", "weekly", "monthly"].includes(f.key)).map((f) => <Chip key={f.key} selected={frequency === f.key} onClick={() => setFrequency(frequency === f.key ? "" : f.key)}>{f.label}</Chip>)}</div>
              </div>
              <div>
                <label htmlFor="treatment-reaction" className="block text-sm font-semibold text-slate-700 mb-1">{copy.treatmentDetail.reaction}</label>
                <p className="text-xs text-slate-500 mb-2">{copy.treatmentDetail.reactionHint}</p>
                <input id="treatment-reaction" value={reaction} onChange={(e) => setReaction(e.target.value)} className={inputClass} maxLength={300} placeholder="For example rash, nausea, none" />
              </div>
            </div>
          </details>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={pending} onClick={() => onSubmit({ antibiotic_id: antibiotic, other_name: otherName, started_on: startedOn, days, course_type: courseType, source, dose, frequency, route, reaction })}>{initial ? copy.log.save : copy.episode.add}</Button>
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
