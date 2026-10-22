"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, Card, EmptyState, PageHeader, Pill, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { episodeOn, feelingLabel, type DiaryEntry } from "@/lib/tracker/diary";
import { FEELINGS, SYMPTOMS, labelFor } from "@/lib/tracker/options";
import { formatDay, formatDayShort } from "@/lib/tracker/stats";
import { ChipGroup, DateChips } from "../components/Chips";
import { FeelingFaces } from "../components/FeelingFaces";
import { SeverityScale } from "../components/SeverityScale";
import { Sheet } from "../components/Sheet";
import { saveDiaryEntry, setSymptomSeverity, toggleSymptom } from "../actions";

type Episode = { id: string; started_on: string; ended_on: string | null };
type Cell = { on: string; feeling: number | null };

/*
 * The diary reads newest first, one row a day. Any day can be opened to
 * change the feeling and the note; the symptoms for a day inside a UTI are
 * edited in the same place so nothing has to be found elsewhere.
 */
export function DiaryManager({ today, entries, strip, episodes, symptomOrder }: { today: string; entries: DiaryEntry[]; strip: Cell[]; episodes: Episode[]; symptomOrder: string[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const months: { key: string; label: string; entries: DiaryEntry[] }[] = [];
  for (const e of entries) {
    const key = e.on.slice(0, 7);
    let m = months[months.length - 1];
    if (!m || m.key !== key) {
      m = { key, label: new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }), entries: [] };
      months.push(m);
    }
    m.entries.push(e);
  }

  const open = adding || editing !== null;
  const date = editing ?? today;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        eyebrow="UTI Passport"
        title={copy.diary.title}
        subtitle={copy.diary.intro}
        action={<Link href="/portal/passport" className="text-sm font-semibold text-maroon">Back to my passport</Link>}
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { setEditing(null); setAdding(true); }}>{copy.diary.add}</Button>
      </div>

      <Card data-testid="feeling-strip">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <p className="text-sm font-semibold text-midnight">{copy.diary.strip}</p>
          <p className="text-xs text-slate-500">{copy.diary.stripHint}</p>
        </div>
        <FeelingStrip cells={strip} onPick={(on) => { setAdding(false); setEditing(on); }} />
      </Card>

      {entries.length === 0 ? (
        <Card><EmptyState title={copy.diary.empty} /></Card>
      ) : (
        months.map((m) => (
          <section key={m.key} data-testid="diary-month">
            <h2 className="font-display text-2xl font-light text-midnight mb-3">{m.label}</h2>
            <Card>
              <ol className="divide-y divide-slate-100">
                {m.entries.map((e) => (
                  <li key={e.on}>
                    <button type="button" onClick={() => { setAdding(false); setEditing(e.on); }} className="flex w-full gap-3 py-3 text-left hover:bg-slate-50 -mx-2 px-2 rounded-xl" aria-label={`${formatDayShort(e.on)}, ${copy.diary.editDay}`}>
                      <span className="w-24 shrink-0 pt-0.5">
                        <span className="block text-sm font-semibold text-midnight">{formatDayShort(e.on).replace(/,.*$/, "")}</span>
                        <span className="block text-xs text-slate-500">{formatDay(e.on).replace(/ \d{4}$/, "")}</span>
                      </span>
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="flex flex-wrap items-center gap-2">
                          {e.feeling && <Pill tone="brand">{feelingLabel(e.feeling)}</Pill>}
                          {e.utiDay && <Pill tone="red">{copy.diary.utiDay(e.utiDay)}</Pill>}
                          {e.score !== null && <Pill tone="slate">{copy.diary.score(e.score)}</Pill>}
                        </span>
                        {e.symptoms.length > 0 && (
                          <span className="block text-sm text-slate-700">
                            {e.symptoms.map((s) => `${s.label}${s.severity ? ` ${s.severity}` : ""}`).join(" · ")}
                          </span>
                        )}
                        {e.started.length > 0 && <span className="block text-sm text-slate-700">{copy.diary.started(e.started.join(", "))}</span>}
                        {e.tests.length > 0 && <span className="block text-sm text-slate-700">{e.tests.join(", ")}</span>}
                        {e.note && <span className="block text-sm text-midnight italic">{e.note}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </Card>
          </section>
        ))
      )}

      {open && (
        <DaySheet
          key={date}
          date={date}
          pickDate={adding}
          today={today}
          entry={entries.find((e) => e.on === date) ?? null}
          episode={episodeOn(episodes.map((e) => ({ ...e, notes: null })), date, today)}
          symptomOrder={symptomOrder}
          onDate={(iso) => setEditing(iso)}
          onClose={() => { setAdding(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

/** Thirty cells, one a day, shaded by the feeling logged. One tap opens the day. */
function FeelingStrip({ cells, onPick }: { cells: Cell[]; onPick: (on: string) => void }) {
  const shade: Record<number, string> = { 1: "bg-maroon", 2: "bg-maroon/75", 3: "bg-maroon/50", 4: "bg-maroon/30", 5: "bg-maroon/15" };
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
      {cells.map((c) => (
        <button
          key={c.on}
          type="button"
          onClick={() => onPick(c.on)}
          title={`${formatDayShort(c.on)}${c.feeling ? `: ${labelFor(FEELINGS, String(c.feeling))}` : ""}`}
          aria-label={`${formatDayShort(c.on)}${c.feeling ? `, ${labelFor(FEELINGS, String(c.feeling))}` : ", no entry"}`}
          className={`h-7 rounded-md border border-white ${c.feeling ? shade[c.feeling] : "bg-pink-50"}`}
        />
      ))}
    </div>
  );
}

function DaySheet({ date, pickDate, today, entry, episode, symptomOrder, onDate, onClose }: {
  date: string; pickDate: boolean; today: string; entry: DiaryEntry | null; episode: { id: string; started_on: string; ended_on: string | null } | null;
  symptomOrder: string[]; onDate: (iso: string) => void; onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [feeling, setFeeling] = useState<number | null>(entry?.feeling ?? null);
  const [note, setNote] = useState(entry?.note ?? "");
  const [symptoms, setSymptoms] = useState<Record<string, number | null>>(Object.fromEntries((entry?.symptoms ?? []).map((s) => [s.symptom, s.severity])));
  const [other, setOther] = useState(entry?.symptoms.find((s) => s.symptom === "other")?.label ?? "");
  const selected = new Set(Object.keys(symptoms));

  const run = (fn: () => Promise<{ error?: string } | { ok: boolean }>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if ("error" in r && r.error) setError(r.error);
      else after?.();
    });
  };
  const options = symptomOrder.map((k) => SYMPTOMS.find((o) => o.key === k)!).filter(Boolean);

  return (
    <Sheet open title={pickDate ? copy.diary.add : formatDayShort(date)} onClose={onClose} doneLabel={copy.episode.cancel} modal testId="sheet-diary">
      <div className="space-y-5">
        {pickDate && <DateChips label={copy.diary.whichDay} value={date} max={today} onChange={onDate} />}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">{copy.diary.feelingQuestion}</p>
          <FeelingFaces value={feeling} onChange={setFeeling} />
        </div>
        {episode && (
          <div className="rounded-2xl bg-pink-25 p-4" data-testid="diary-symptoms">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-sm font-semibold text-slate-700">{copy.diary.symptomsQuestion}</p>
              <Link href={`/portal/passport/episodes/${episode.id}`} className="text-xs font-semibold text-maroon">{copy.diary.openUti}</Link>
            </div>
            <ChipGroup
              options={options}
              selected={selected}
              otherText={other}
              onOtherText={setOther}
              onToggle={(key, on) => {
                setSymptoms((s) => { const n = { ...s }; if (on) n[key] = n[key] ?? null; else delete n[key]; return n; });
                run(() => toggleSymptom(episode.id, key, on, other, date));
              }}
            />
            {selected.size > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-slate-500">{copy.episode.severityHint}</p>
                {options.filter((o) => selected.has(o.key)).map((o) => (
                  <SeverityScale
                    key={o.key}
                    label={o.key === "other" ? other || o.label : o.label}
                    value={symptoms[o.key] ?? null}
                    onChange={(v) => { setSymptoms((s) => ({ ...s, [o.key]: v })); run(() => setSymptomSeverity(episode.id, o.key, date, v)); }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        <div>
          <label htmlFor="diary-note" className="block text-sm font-semibold text-slate-700 mb-2">{copy.diary.noteLabel}</label>
          <textarea id="diary-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} className={inputClass} placeholder={copy.diary.notePlaceholder} />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={pending} onClick={() => run(() => saveDiaryEntry({ onDate: date, feeling, note }), onClose)}>{copy.diary.save}</Button>
          <button type="button" className="min-h-[44px] px-2 text-sm font-semibold text-maroon" onClick={onClose}>{copy.episode.cancel}</button>
          {entry && (entry.feeling !== null || entry.note) && (
            <button type="button" className="ml-auto min-h-[44px] px-2 text-sm font-semibold text-maroon" disabled={pending} onClick={() => run(() => saveDiaryEntry({ onDate: date, feeling: null, note: null }), onClose)}>{copy.diary.clear}</button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
