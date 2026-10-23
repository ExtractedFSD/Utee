"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import type { DiaryEntry } from "@/lib/tracker/diary";
import { SYMPTOMS } from "@/lib/tracker/options";
import { formatDayShort } from "@/lib/tracker/stats";
import { ChipGroup, DateChips } from "./Chips";
import { FeelingFaces } from "./FeelingFaces";
import { SeverityScale } from "./SeverityScale";
import { Sheet } from "./Sheet";
import { saveDiaryEntry, setSymptomSeverity, toggleSymptom } from "../actions";

/** One diary day: the feeling, a note, and the symptoms with ratings when the day falls inside a UTI. */
export function DaySheet({ date, pickDate, today, entry, episode, symptomOrder, onDate, onClose }: {
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
