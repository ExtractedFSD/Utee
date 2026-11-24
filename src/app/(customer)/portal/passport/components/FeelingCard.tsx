"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Card, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { FEELINGS } from "@/lib/tracker/options";
import { saveDiaryEntry } from "../actions";
import type { Streak } from "./TodayHero";

/*
 * Today's check-in, on its own white card under the hero. Tapping a face
 * only outlines it: a pink band then asks "Save how you feel today?" with
 * Save and Add a note first, so nothing is written until the person says
 * so. The streak pill becomes "Not saved yet" while a tap is pending.
 *
 * Three modes decide how loud it is: "uti" while a UTI is open, "recovery"
 * for the fortnight after one ends, and "quiet" the rest of the time, when
 * it folds down to one line ("Not feeling right today? Note it") unless
 * there is already an entry for today.
 */
export type FeelingMode = "uti" | "recovery" | "quiet";

/* The five mouths, worst to best: an open "oh", a frown, a flat line, a smile, an open grin. */
const FACES: Record<string, { d: string; filled?: boolean }> = {
  "1": { d: "M12 12.6a2.3 2.6 0 1 0 0 5.2a2.3 2.6 0 1 0 0-5.2z", filled: true },
  "2": { d: "M8.3 17.2c1.1-1.5 2.4-2.2 3.7-2.2s2.6.7 3.7 2.2" },
  "3": { d: "M8.3 15.6h7.4" },
  "4": { d: "M8.3 14.2c1.1 1.5 2.4 2.2 3.7 2.2s2.6-.7 3.7-2.2" },
  "5": { d: "M7.6 14h8.8a4.4 4.4 0 0 1-8.8 0z", filled: true },
};
/* Tile tints, worst to best: coral, peach, pink, sky, mint. */
const TINT: Record<string, string> = { "1": "bg-peach-50", "2": "bg-sun-50", "3": "bg-pink-25", "4": "bg-sky-50", "5": "bg-mint-50" };

function Face({ feeling }: { feeling: string }) {
  const m = FACES[feeling];
  return (
    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8.7" cy="9.2" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.3" cy="9.2" r="1.2" fill="currentColor" stroke="none" />
      <path d={m.d} fill={m.filled ? "currentColor" : "none"} />
    </svg>
  );
}

export function FeelingCard({ today, feelingToday, noteToday, streak, mode = "uti" }: { today: string; feelingToday: number | null; noteToday: string | null; streak: Streak; mode?: FeelingMode }) {
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // What is on the server for today, kept here so the card updates the moment a save lands.
  const [saved, setSavedState] = useState<{ feeling: number | null; note: string }>({ feeling: feelingToday, note: noteToday ?? "" });
  useEffect(() => setSavedState({ feeling: feelingToday, note: noteToday ?? "" }), [feelingToday, noteToday]);
  const [picked, setPicked] = useState<number | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(noteToday ?? "");
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bandRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  const current = picked ?? saved.feeling;
  const pendingPick = picked !== null && picked !== saved.feeling;
  const noteDirty = note.trim() !== saved.note.trim();
  const unsaved = pendingPick || (noteOpen && noteDirty);
  useEffect(() => { if (pendingPick) bandRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [pendingPick]);

  const streakNow = (saved.feeling !== null || saved.note.trim()) && !streak.todayDone ? streak.current + 1 : streak.current;

  const save = (withNote: boolean) => {
    const feeling = current;
    if (feeling === null) return;
    setError(null);
    startTransition(async () => {
      const r = await saveDiaryEntry({ onDate: today, feeling, ...(withNote ? { note } : {}) });
      if ((r as { error?: string } | null)?.error) { setError((r as { error: string }).error); return; }
      setSavedState({ feeling, note: withNote ? note : saved.note });
      setPicked(null);
      setNoteOpen(false);
      setFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(false), 2000);
    });
  };

  if (mode === "quiet" && !expanded && saved.feeling === null && !saved.note.trim()) {
    return (
      <div className="flex justify-center" data-testid="feeling-quiet">
        <button type="button" onClick={() => setExpanded(true)} className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-maroon">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" /><path d="M9 15.5h6" /></svg>
          {copy.dashboard.quietPrompt}
        </button>
      </div>
    );
  }

  return (
    <Card data-testid="feeling-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-display text-2xl font-light text-midnight">{mode === "recovery" ? copy.dashboard.recoveryTitle : copy.dashboard.diaryTitle}</h2>
        <span className="flex items-center gap-2">
          <span aria-live="polite" className="text-sm font-semibold text-midnight">{flash ? `${copy.episode.saved} ✓` : ""}</span>
          {unsaved ? (
            <span className="inline-flex items-center rounded-full bg-sun px-3 py-1 text-[12px] font-semibold uppercase tracking-[.08em] text-amber-900" data-testid="feeling-unsaved">{copy.dashboard.notSavedYet}</span>
          ) : mode !== "quiet" ? (
            <span className="inline-flex items-center rounded-full bg-pink-25 px-3 py-1 text-[12px] font-semibold uppercase tracking-[.08em] text-maroon" data-testid="streak">{streakNow > 0 ? copy.dashboard.streakPill(streakNow) : copy.dashboard.streakStart}</span>
          ) : null}
        </span>
      </div>

      <div className="mt-4 grid max-w-[640px] grid-cols-5 gap-3" role="radiogroup" aria-label={copy.episode.feelingQuestion} data-testid="feeling-faces">
        {FEELINGS.map((f) => {
          const n = Number(f.key);
          const on = current === n;
          return (
            <button
              key={f.key}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={pending}
              onClick={() => setPicked(n)}
              className={`flex aspect-square min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border-2 text-midnight transition-colors disabled:opacity-70 ${TINT[f.key]} ${on ? "border-midnight" : "border-transparent hover:border-midnight/30"}`}
            >
              <Face feeling={f.key} />
              <span className="text-sm font-semibold">{f.label}</span>
            </button>
          );
        })}
      </div>

      {pendingPick && !noteOpen && (
        <div ref={bandRef} className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-pink-25 p-4" role="group" aria-label={copy.dashboard.feelingPrompt} data-testid="feeling-prompt">
          <p className="text-sm font-semibold text-midnight">{copy.dashboard.feelingPrompt}</p>
          <span className="flex flex-wrap gap-2">
            <Button disabled={pending} onClick={() => save(false)}>{copy.dashboard.feelingSave}</Button>
            <Button variant="secondary" disabled={pending} onClick={() => { setNote(saved.note); setNoteOpen(true); }}>{copy.dashboard.addNoteFirst}</Button>
          </span>
        </div>
      )}

      {noteOpen && (
        <div className="mt-4 rounded-2xl bg-pink-25 p-4" data-testid="today-note">
          <label htmlFor="today-note" className="block text-sm font-semibold text-midnight mb-1.5">{copy.episode.noteToday}</label>
          <textarea id="today-note" value={note} autoFocus onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} className={inputClass} placeholder={copy.episode.noteTodayPlaceholder} />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button disabled={pending || current === null} onClick={() => save(true)}>{copy.dashboard.feelingSave}</Button>
            {pendingPick ? (
              <button type="button" disabled={pending} onClick={() => save(false)} className="min-h-[44px] px-2 text-sm font-semibold text-maroon">{copy.dashboard.skipNote}</button>
            ) : (
              <button type="button" onClick={() => { setNoteOpen(false); setNote(saved.note); }} className="min-h-[44px] px-2 text-sm font-semibold text-maroon">{copy.episode.cancel}</button>
            )}
          </div>
        </div>
      )}

      {!noteOpen && saved.note.trim() && !pendingPick ? (
        <p className="mt-4 whitespace-pre-wrap text-sm text-midnight" data-testid="today-note-text">{saved.note}</p>
      ) : null}
      {error && <p className="mt-3 text-sm text-rose-700" role="alert">{error}</p>}

      {!pendingPick && !noteOpen && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(29,0,58,.08)] pt-4 text-sm font-semibold">
          <button type="button" disabled={current === null} title={current === null ? "Choose a face first" : undefined} onClick={() => { setNote(saved.note); setNoteOpen(true); }} className="min-h-[44px] text-maroon disabled:opacity-50">+ {saved.note.trim() ? copy.dashboard.editNote : copy.dashboard.addNote}</button>
          <Link href="/portal/passport/history?view=days" className="min-h-[44px] inline-flex items-center gap-1 text-maroon">{copy.dashboard.seeDiary} <span aria-hidden>→</span></Link>
        </div>
      )}
    </Card>
  );
}
