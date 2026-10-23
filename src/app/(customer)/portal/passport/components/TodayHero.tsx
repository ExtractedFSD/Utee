"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Button, LinkButton, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { FEELINGS, SYMPTOMS, WORKED, labelFor } from "@/lib/tracker/options";
import { redFlagFor } from "@/lib/tracker/redflags";
import { formatDayShort, isoToday } from "@/lib/tracker/stats";
import { Chip, DateChips } from "./Chips";
import { RedFlagBanner } from "./RedFlagBanner";
import { SeverityScale } from "./SeverityScale";
import { Sheet } from "./Sheet";
import { copyYesterdaySymptoms, rateTreatment, saveDiaryEntry, setFeeling, setSymptomSeverity, toggleSymptom, updateEpisode } from "../actions";

/*
 * The hero decides what the person is here to do. Three states: a new
 * account, a UTI open today (the check-in lives inside the hero), or the
 * days since the last one ended. The safety banner sits above it and
 * follows what is ticked, as it is ticked.
 */
export type OpenUti = {
  id: string;
  startedOn: string;
  day: number;
  feelingToday: number | null;
  noteToday: string | null;
  symptomsToday: { key: string; other: string | null; severity: number | null }[];
  yesterdaySymptoms: string[];
  symptomOrder: string[];
  unrated: { id: string; name: string }[];
};

export type HeroState =
  | { kind: "new" }
  | { kind: "between"; daysSince: number; result: { kitId: string; code: string } | null }
  | { kind: "open"; uti: OpenUti };

type Run = (fn: () => Promise<unknown>, optimistic?: () => void) => void;

const FACES: Record<string, string> = {
  "1": "M8 16.5c1.2-1.6 2.5-2.4 4-2.4s2.8.8 4 2.4",
  "2": "M8.5 16c1-.9 2.2-1.4 3.5-1.4s2.5.5 3.5 1.4",
  "3": "M8.5 15.5h7",
  "4": "M8.5 14.6c1 .9 2.2 1.4 3.5 1.4s2.5-.5 3.5-1.4",
  "5": "M8 14c1.2 1.6 2.5 2.4 4 2.4s2.8-.8 4-2.4",
};

const hero = "rounded-card bg-gradient-brand p-5 text-white";
const shadow = { boxShadow: "0 10px 30px rgba(145,25,59,.25)" };

export function TodayHero({ state, pregnantOrTrying }: { state: HeroState; pregnantOrTrying: string }) {
  if (state.kind === "new") {
    return (
      <div className={hero} style={shadow} data-testid="new-hero">
        <p className="font-display text-3xl font-light leading-tight">{copy.dashboard.welcomeHeading}</p>
        <p className="mt-2 text-sm text-white/85 leading-relaxed max-w-xl">{copy.dashboard.welcomeLine}</p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <LinkButton href="/portal/passport/setup?mode=utis" variant="white">{copy.dashboard.setUpWithUna}</LinkButton>
          <Link href="/portal/passport/log" className="text-sm font-semibold underline underline-offset-4">{copy.dashboard.logInstead}</Link>
        </div>
      </div>
    );
  }
  if (state.kind === "between") {
    return (
      <div className={hero} style={shadow} data-testid="between-hero">
        <p className="font-display text-3xl font-light leading-tight">{copy.dashboard.sinceLast(state.daysSince)}</p>
        {state.result && (
          <p className="mt-2 text-sm text-white/85">
            {copy.dashboard.resultReady(state.result.code)} · <Link href={`/portal/tests/${state.result.kitId}`} className="font-semibold text-white underline underline-offset-4">{copy.dashboard.seeResult}</Link>
          </p>
        )}
        <div className="mt-5">
          <LinkButton href="/portal/passport/log" variant="white">{copy.dashboard.logNew}</LinkButton>
        </div>
      </div>
    );
  }
  return <OpenHero uti={state.uti} pregnantOrTrying={pregnantOrTrying} />;
}

function OpenHero({ uti, pregnantOrTrying }: { uti: OpenUti; pregnantOrTrying: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [feeling, setFeelingNow] = useOptimistic(uti.feelingToday, (_: number | null, next: number) => next);
  type Toggle = { key: string; on: boolean };
  const [keys, toggleNow] = useOptimistic(uti.symptomsToday.map((s) => s.key), (state: string[], { key, on }: Toggle) => (on ? [...new Set([...state, key])] : state.filter((k) => k !== key)));
  const [severity, setSeverityNow] = useOptimistic(
    Object.fromEntries(uti.symptomsToday.map((s) => [s.key, s.severity])) as Record<string, number | null>,
    (state: Record<string, number | null>, next: { key: string; value: number | null }) => ({ ...state, [next.key]: next.value })
  );
  const [rating, setRating] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [noteOpen, setNoteOpen] = useState(!!uti.noteToday);
  const [note, setNote] = useState(uti.noteToday ?? "");
  const [closing, setClosing] = useState(false);
  const [endedOn, setEndedOn] = useState(isoToday());
  const today = isoToday();

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

  const selected = new Set(keys);
  const flag = redFlagFor(selected, pregnantOrTrying);
  const options = uti.symptomOrder.map((k) => SYMPTOMS.find((o) => o.key === k)!).filter(Boolean);
  // Chips show once a feeling is in. Selected ones first, then up to a few more, the rest behind "+N more".
  const chipsOpen = feeling !== null;
  const ordered = [...options.filter((o) => selected.has(o.key)), ...options.filter((o) => !selected.has(o.key))];
  const limit = Math.max(selected.size + 4, 5);
  const visible = showAll ? ordered : ordered.slice(0, limit);
  const hiddenCount = ordered.length - visible.length;
  const ratingOption = rating ? options.find((o) => o.key === rating) : null;

  return (
    <div className="space-y-4">
      <RedFlagBanner flag={flag} />
      <div className={hero} style={shadow} data-testid="open-hero">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-[26px] font-light leading-tight">{copy.dashboard.openEpisodeDay(uti.day)}</p>
          <Link href={`/portal/passport/episodes/${uti.id}`} className="shrink-0 text-sm font-semibold underline underline-offset-4">{copy.dashboard.details}</Link>
        </div>
        <p className="mt-1 text-sm text-white/85">{copy.dashboard.startedAnd(formatDayShort(uti.startedOn))}</p>

        <div className="mt-4 flex justify-between gap-1" role="radiogroup" aria-label={copy.episode.feelingQuestion}>
          {FEELINGS.map((f) => {
            const n = Number(f.key);
            const on = feeling === n;
            return (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={f.label}
                disabled={pending}
                onClick={() => run(() => setFeeling(uti.id, n), () => setFeelingNow(n))}
                className={`flex h-[52px] w-[52px] items-center justify-center rounded-full border transition-colors disabled:opacity-70 ${on ? "border-white bg-white text-maroon shadow-card" : "border-white/60 text-white hover:bg-white/10"}`}
              >
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 9.5h.01M15 9.5h.01" strokeWidth="2" />
                  <path d={FACES[f.key]} />
                </svg>
              </button>
            );
          })}
        </div>

        {chipsOpen && (
          <div className="mt-5" data-testid="hero-symptoms">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-sm text-white/90">{copy.dashboard.noticing}</p>
              <span aria-live="polite" className={`text-sm text-white/90 transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}>{copy.episode.saved} ✓</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {uti.yesterdaySymptoms.length > 0 && selected.size === 0 && (
                <button type="button" disabled={pending} onClick={() => run(() => copyYesterdaySymptoms(uti.id), () => uti.yesterdaySymptoms.forEach((key) => toggleNow({ key, on: true })))} className="inline-flex min-h-[44px] items-center rounded-full border border-white/60 px-4 text-sm font-semibold text-white hover:bg-white/10">
                  {copy.episode.sameAsYesterday}
                </button>
              )}
              {visible.map((o) => {
                const on = selected.has(o.key);
                const rated = severity[o.key];
                return (
                  <button
                    key={o.key}
                    type="button"
                    aria-pressed={on}
                    disabled={pending}
                    onClick={() => {
                      if (on) { setRating(rating === o.key ? null : o.key); return; }
                      setRating(o.key);
                      run(() => toggleSymptom(uti.id, o.key, true, "", today, "day"), () => toggleNow({ key: o.key, on: true }));
                    }}
                    className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold transition-colors ${on ? "bg-white text-midnight shadow-card" : "border border-white/60 text-white hover:bg-white/10"}`}
                  >
                    {o.short ?? o.label}{on && rated ? ` · ${rated}` : ""}
                  </button>
                );
              })}
              {hiddenCount > 0 && (
                <button type="button" onClick={() => setShowAll(true)} className="inline-flex min-h-[44px] items-center rounded-full border border-white/60 px-4 text-sm font-semibold text-white hover:bg-white/10">{copy.dashboard.more(hiddenCount)}</button>
              )}
            </div>
            {ratingOption && selected.has(ratingOption.key) && (
              <div className="mt-3 rounded-2xl bg-white p-3 text-midnight" data-testid="hero-rating">
                <SeverityScale
                  label={ratingOption.short ?? ratingOption.label}
                  value={severity[ratingOption.key] ?? null}
                  onChange={(v) => run(() => setSymptomSeverity(uti.id, ratingOption.key, today, v), () => setSeverityNow({ key: ratingOption.key, value: v }))}
                />
                <div className="mt-2 flex justify-between">
                  <p className="text-xs text-[#8a7a9c]">{copy.episode.severityHint}</p>
                  <button type="button" disabled={pending} onClick={() => { setRating(null); run(() => toggleSymptom(uti.id, ratingOption.key, false, "", today, "day"), () => toggleNow({ key: ratingOption.key, on: false })); }} className="text-xs font-semibold text-maroon">{copy.dashboard.untick}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {noteOpen && (
          <textarea
            value={note}
            autoFocus={!uti.noteToday}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => { if (note.trim() !== (uti.noteToday ?? "").trim()) run(() => saveDiaryEntry({ onDate: today, note })); }}
            rows={2}
            maxLength={1000}
            className={`${inputClass} mt-4 text-midnight`}
            aria-label={copy.episode.noteToday}
            placeholder={copy.episode.noteTodayPlaceholder}
          />
        )}
        {error && <p className="mt-3 text-sm text-white">{error}</p>}

        <div className="mt-5 flex items-center justify-between gap-3 text-sm font-semibold">
          {!noteOpen ? (
            <button type="button" onClick={() => setNoteOpen(true)} className="min-h-[44px] underline underline-offset-4">{copy.dashboard.addNote}</button>
          ) : <span />}
          <button type="button" onClick={() => { setEndedOn(isoToday()); setClosing(true); }} className="min-h-[44px] underline underline-offset-4">{copy.dashboard.feelBetter}</button>
        </div>
      </div>

      <Sheet open={closing} title={copy.episode.whenBetter} onClose={() => setClosing(false)} doneLabel={copy.episode.cancel} modal testId="close-panel">
        <div className="space-y-4">
          <DateChips value={endedOn} onChange={setEndedOn} />
          {uti.unrated.map((t) => (
            <div key={t.id}>
              <p className="text-sm font-semibold text-midnight mb-2">{copy.episode.howDidItGo(t.name)}</p>
              <div className="flex flex-wrap gap-2">
                {WORKED.map((w) => <Chip key={w.key} disabled={pending} onClick={() => run(() => rateTreatment(t.id, w.key))}>{w.label}</Chip>)}
              </div>
            </div>
          ))}
          <Button disabled={pending} onClick={() => run(async () => { const r = await updateEpisode(uti.id, { endedOn }); if (!(r as { error?: string }).error) setClosing(false); return r; })}>{copy.log.save}</Button>
        </div>
      </Sheet>
      <span className="sr-only">{feeling ? labelFor(FEELINGS, String(feeling)) : ""}</span>
    </div>
  );
}
