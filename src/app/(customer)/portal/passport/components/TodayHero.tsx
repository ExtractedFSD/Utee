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

export type Streak = { current: number; best: number; todayDone: boolean };

export type HeroState =
  | { kind: "new" }
  | { kind: "between"; daysSince: number; result: { kitId: string; code: string } | null; feelingToday: number | null; noteToday: string | null; streak: Streak }
  | { kind: "open"; uti: OpenUti; streak: Streak };

type Run = (fn: () => Promise<unknown>, optimistic?: () => void) => void;

/*
 * The five mouths, worst to best: an open filled "oh", a frown, a flat
 * line, a smile, and an open filled grin. Filled mouths mark the extremes.
 */
const FACES: Record<string, { d: string; filled?: boolean }> = {
  "1": { d: "M12 12.6a2.3 2.6 0 1 0 0 5.2a2.3 2.6 0 1 0 0-5.2z", filled: true },
  "2": { d: "M8.3 17.2c1.1-1.5 2.4-2.2 3.7-2.2s2.6.7 3.7 2.2" },
  "3": { d: "M8.3 15.6h7.4" },
  "4": { d: "M8.3 14.2c1.1 1.5 2.4 2.2 3.7 2.2s2.6-.7 3.7-2.2" },
  "5": { d: "M7.6 14h8.8a4.4 4.4 0 0 1-8.8 0z", filled: true },
};

function Face({ feeling }: { feeling: string }) {
  const m = FACES[feeling];
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8.7" cy="9.2" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.3" cy="9.2" r="1.2" fill="currentColor" stroke="none" />
      <path d={m.d} fill={m.filled ? "currentColor" : "none"} />
    </svg>
  );
}

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
  if (state.kind === "between") return <BetweenHero state={state} />;
  return <OpenHero uti={state.uti} streak={state.streak} pregnantOrTrying={pregnantOrTrying} />;
}

function OpenHero({ uti, streak, pregnantOrTrying }: { uti: OpenUti; streak: Streak; pregnantOrTrying: string }) {
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

        <div className="mt-4">
          <Faces value={feeling} pending={pending} onPick={(n) => run(() => setFeeling(uti.id, n), () => setFeelingNow(n))} />
        </div>

        <StreakLine streak={streak} done={feeling !== null} className="mt-3" />

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

/** The five faces, worst to best, each named underneath; selected is white with maroon strokes. Shared by both heroes. */
function Faces({ value, pending, onPick }: { value: number | null; pending: boolean; onPick: (n: number) => void }) {
  return (
    <div className="flex justify-between gap-1" role="radiogroup" aria-label={copy.episode.feelingQuestion}>
      {FEELINGS.map((f) => {
        const n = Number(f.key);
        const on = value === n;
        return (
          <button
            key={f.key}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={f.label}
            disabled={pending}
            onClick={() => onPick(n)}
            className="flex min-w-0 flex-col items-center gap-1.5 disabled:opacity-70"
          >
            <span className={`flex h-[52px] w-[52px] items-center justify-center rounded-full border transition-colors ${on ? "border-white bg-white text-maroon shadow-card" : "border-white/60 text-white"}`}>
              <Face feeling={f.key} />
            </span>
            <span className={`text-[11px] font-semibold leading-none ${on ? "text-white" : "text-white/80"}`}>{f.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** "5-day streak · best 12", or the nudge to check in. `done` is today's optimistic state. */
function StreakLine({ streak, done, className = "" }: { streak: Streak; done: boolean; className?: string }) {
  const current = done && !streak.todayDone ? streak.current + 1 : streak.current;
  const best = Math.max(streak.best, current);
  return (
    <p className={`flex items-center gap-2 text-sm text-white/90 ${className}`} data-testid="streak" aria-live="polite">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.5.5-2.5 1-3.5.5 1 1.5 1.5 2.5 1.5C11.5 7.5 11 5 12 3z" /></svg>
      {current > 0 ? <><span className="font-semibold">{copy.dashboard.streak(current)}</span>{best > current ? <span className="text-white/70">· {copy.dashboard.streakBest(best)}</span> : null}{!done ? <span className="text-white/70">· {copy.dashboard.streakKeep}</span> : null}</> : <span>{copy.dashboard.streakStart}</span>}
    </p>
  );
}

/*
 * Between UTIs the hero is two halves: the UTI side (days clear, Log a UTI)
 * and the diary side (today's face, a note, the streak). One tap on a face
 * saves the day; the streak counts every day with an entry, UTI or not.
 */
function BetweenHero({ state }: { state: Extract<HeroState, { kind: "between" }> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [feeling, setFeelingNow] = useOptimistic(state.feelingToday, (_: number | null, next: number) => next);
  const [noteOpen, setNoteOpen] = useState(!!state.noteToday);
  const [note, setNote] = useState(state.noteToday ?? "");
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

  return (
    <div className={`${hero} grid gap-5 p-0 sm:grid-cols-2 sm:gap-0`} style={shadow} data-testid="between-hero">
      <div className="p-5 sm:border-r sm:border-white/20">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/85">{copy.nav.today}</p>
        <p className="mt-1 font-display text-3xl font-light leading-tight">{copy.dashboard.sinceLast(state.daysSince)}</p>
        {state.result && (
          <p className="mt-2 text-sm text-white/85">
            {copy.dashboard.resultReady(state.result.code)} · <Link href={`/portal/tests/${state.result.kitId}`} className="font-semibold text-white underline underline-offset-4">{copy.dashboard.seeResult}</Link>
          </p>
        )}
        <div className="mt-5">
          <LinkButton href="/portal/passport/log" variant="white">{copy.dashboard.logNew}</LinkButton>
        </div>
      </div>
      <div className="border-t border-white/20 p-5 sm:border-t-0" data-testid="diary-half">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-[22px] font-light leading-tight">{copy.dashboard.diaryTitle}</p>
          <span aria-live="polite" className={`shrink-0 text-sm text-white/90 transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}>{copy.episode.saved} ✓</span>
        </div>
        <div className="mt-3">
          <Faces value={feeling} pending={pending} onPick={(n) => run(() => setFeeling(null, n), () => setFeelingNow(n))} />
        </div>
        <StreakLine streak={state.streak} done={feeling !== null} className="mt-3" />
        {noteOpen && (
          <textarea
            value={note}
            autoFocus={!state.noteToday}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => { if (note.trim() !== (state.noteToday ?? "").trim()) run(() => saveDiaryEntry({ onDate: today, note })); }}
            rows={2}
            maxLength={1000}
            className={`${inputClass} mt-3 text-midnight`}
            aria-label={copy.episode.noteToday}
            placeholder={copy.episode.noteTodayPlaceholder}
          />
        )}
        {error && <p className="mt-2 text-sm text-white">{error}</p>}
        <div className="mt-3 flex items-center justify-between gap-3 text-sm font-semibold">
          {!noteOpen ? <button type="button" onClick={() => setNoteOpen(true)} className="min-h-[44px] underline underline-offset-4">{copy.dashboard.addNote}</button> : <span />}
          <Link href="/portal/passport/history?view=days" className="min-h-[44px] inline-flex items-center underline underline-offset-4">{copy.dashboard.seeDiary}</Link>
        </div>
      </div>
    </div>
  );
}
