import { FEELINGS, SYMPTOMS, labelFor } from "./options";
import { antibioticName } from "./search";
import { daysBetween, isoToday, type EpisodeRow } from "./stats";

/*
 * The diary: one entry per day, built from what is already logged (the
 * day's feeling and note, the symptoms ticked that day with how bad each
 * was, anything started that day). Nothing here interprets; it only reads
 * back what the person entered, in day order.
 */

export const SEVERITY_MIN = 1;
export const SEVERITY_MAX = 10;
export const SEVERITY_POINTS = Array.from({ length: SEVERITY_MAX - SEVERITY_MIN + 1 }, (_, i) => SEVERITY_MIN + i);

export type CheckinRow = { episode_id: string | null; on_date: string; feeling: number | null; note: string | null };
export type ScoredSymptom = { episode_id: string; symptom: string; other_text: string | null; logged_on: string; severity?: number | null };
type TreatmentLike = { episode_id: string; antibiotic_id: string; other_name: string | null; started_on: string | null };
type TestLike = { episode_id: string; kind: string; tested_on: string | null };

export function feelingLabel(feeling: number | null | undefined): string {
  return feeling ? labelFor(FEELINGS, String(feeling)) : "";
}

export function symptomLabel(s: { symptom: string; other_text: string | null }): string {
  return s.symptom === "other" ? s.other_text?.trim() || "Other" : labelFor(SYMPTOMS, s.symptom);
}

/** The UTI that was open on a given day, if any. */
export function episodeOn(episodes: EpisodeRow[], date: string, today = isoToday()): EpisodeRow | null {
  return episodes.find((e) => e.started_on <= date && (e.ended_on ?? today) >= date) ?? null;
}

export type ScorePoint = {
  on: string;
  /** Day of the UTI, counting from 1. */
  day: number;
  /** Sum of the 1 to 10 ratings given that day. */
  score: number;
  /** How many symptoms were ticked, and how many of those were rated. */
  ticked: number;
  rated: number;
  items: { symptom: string; label: string; severity: number | null }[];
};

/** One point per day with at least one rated symptom, oldest first. */
export function symptomScores(symptoms: ScoredSymptom[], episode: EpisodeRow): ScorePoint[] {
  const byDay = new Map<string, ScoredSymptom[]>();
  for (const s of symptoms) {
    if (s.episode_id !== episode.id) continue;
    if (!byDay.has(s.logged_on)) byDay.set(s.logged_on, []);
    byDay.get(s.logged_on)!.push(s);
  }
  return [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([on, rows]) => {
      const items = rows.map((r) => ({ symptom: r.symptom, label: symptomLabel(r), severity: r.severity ?? null })).sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
      const rated = items.filter((i) => i.severity !== null);
      return { on, day: daysBetween(episode.started_on, on) + 1, score: rated.reduce((sum, i) => sum + (i.severity ?? 0), 0), ticked: items.length, rated: rated.length, items };
    })
    .filter((p) => p.rated > 0);
}

/** "Peaked at 23 on day 2, down to 6 by day 5." Null until there are two rated days. */
export function scoreSummary(points: ScorePoint[]): string | null {
  if (points.length < 2) return null;
  const peak = points.reduce((m, p) => (p.score > m.score ? p : m), points[0]);
  const last = points[points.length - 1];
  const first = points[0];
  if (peak.on === last.on && last.score > first.score) return `Symptom score rose from ${first.score} on day ${first.day} to ${last.score} on day ${last.day}.`;
  if (peak.on === last.on) return `Symptom score ${last.score} on day ${last.day}, unchanged since day ${first.day}.`;
  const direction = last.score < peak.score ? "down to" : "at";
  return `Symptom score peaked at ${peak.score} on day ${peak.day}, ${direction} ${last.score} by day ${last.day}.`;
}

export type DiaryEntry = {
  on: string;
  feeling: number | null;
  note: string | null;
  episodeId: string | null;
  /** Day of the UTI this entry falls in, counting from 1; null outside a UTI. */
  utiDay: number | null;
  symptoms: { symptom: string; label: string; severity: number | null }[];
  /** Sum of ratings given that day, null when nothing was rated. */
  score: number | null;
  started: string[];
  tests: string[];
};

/**
 * Every day with something in it, newest first. A day is in the diary when
 * it has a check-in, a ticked symptom, an antibiotic started or a test.
 */
export function diaryEntries(
  checkins: CheckinRow[],
  symptoms: ScoredSymptom[],
  treatments: TreatmentLike[],
  tests: TestLike[],
  episodes: EpisodeRow[],
  labels: { testKind: (k: string) => string },
  today = isoToday()
): DiaryEntry[] {
  const days = new Map<string, DiaryEntry>();
  const entry = (on: string) => {
    let e = days.get(on);
    if (!e) {
      const ep = episodeOn(episodes, on, today);
      e = { on, feeling: null, note: null, episodeId: ep?.id ?? null, utiDay: ep ? daysBetween(ep.started_on, on) + 1 : null, symptoms: [], score: null, started: [], tests: [] };
      days.set(on, e);
    }
    return e;
  };
  for (const c of checkins) {
    if (c.feeling === null && !c.note?.trim()) continue;
    const e = entry(c.on_date);
    e.feeling = c.feeling;
    e.note = c.note?.trim() || null;
    if (c.episode_id && !e.episodeId) {
      const ep = episodes.find((x) => x.id === c.episode_id);
      if (ep) { e.episodeId = ep.id; e.utiDay = daysBetween(ep.started_on, c.on_date) + 1; }
    }
  }
  for (const s of symptoms) {
    const e = entry(s.logged_on);
    e.symptoms.push({ symptom: s.symptom, label: symptomLabel(s), severity: s.severity ?? null });
    if (s.severity) e.score = (e.score ?? 0) + s.severity;
    if (!e.episodeId) {
      const ep = episodes.find((x) => x.id === s.episode_id);
      if (ep) { e.episodeId = ep.id; e.utiDay = daysBetween(ep.started_on, s.logged_on) + 1; }
    }
  }
  for (const t of treatments) {
    if (!t.started_on) continue;
    entry(t.started_on).started.push(antibioticName(t.antibiotic_id, t.other_name));
  }
  for (const t of tests) {
    if (!t.tested_on) continue;
    entry(t.tested_on).tests.push(labels.testKind(t.kind));
  }
  for (const e of days.values()) e.symptoms.sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
  return [...days.values()].sort((a, b) => (a.on < b.on ? 1 : -1));
}

/** The last N days as cells for a strip, oldest first, each with the feeling logged (or null). */
export function feelingStrip(checkins: CheckinRow[], days: number, today = isoToday()): { on: string; feeling: number | null }[] {
  const byDay = new Map(checkins.map((c) => [c.on_date, c.feeling]));
  const out: { on: string; feeling: number | null }[] = [];
  const end = new Date(`${today}T00:00:00Z`).getTime();
  for (let i = days - 1; i >= 0; i--) {
    const on = new Date(end - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ on, feeling: byDay.get(on) ?? null });
  }
  return out;
}

/** Shade for a feeling on the calendar: lighter is a better day. */
export const FEELING_SHADE: Record<number, string> = { 1: "#91193b", 2: "#a8345a", 3: "#c0507a", 4: "#df7aa5", 5: "#fe98cb" };

export type CalendarCell = { on: string; feeling: number | null; inUti: boolean; today: boolean; dayOfMonth: number };

/**
 * The last N days laid out on a Monday-first week grid: `lead` blank cells
 * before the first day, then one cell a day with the feeling logged and
 * whether a UTI was open that day.
 */
export function calendar(checkins: CheckinRow[], episodes: EpisodeRow[], days: number, today = isoToday()): { lead: number; cells: CalendarCell[] } {
  const strip = feelingStrip(checkins, days, today);
  const first = new Date(`${strip[0].on}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const lead = (first + 6) % 7;
  return {
    lead,
    cells: strip.map((c) => ({ on: c.on, feeling: c.feeling, inUti: !!episodeOn(episodes, c.on, today), today: c.on === today, dayOfMonth: Number(c.on.slice(8, 10)) })),
  };
}

/** One bar per day: the average of that day's 1 to 10 ratings, rounded. */
export function dayMeans(points: ScorePoint[]): { on: string; day: number; mean: number }[] {
  return points.map((p) => ({ on: p.on, day: p.day, mean: Math.round(p.score / p.rated) }));
}

/** "Worst on day 1, easing by day 4." from the daily means. Null until two rated days. */
export function meanSummary(points: ScorePoint[]): string | null {
  const m = dayMeans(points);
  if (m.length < 2) return null;
  const peak = m.reduce((a, b) => (b.mean > a.mean ? b : a), m[0]);
  const last = m[m.length - 1];
  if (last.mean < peak.mean) return `Worst on day ${peak.day}, easing to ${last.mean} out of 10 by day ${last.day}.`;
  if (last.mean > m[0].mean) return `Rising from ${m[0].mean} on day ${m[0].day} to ${last.mean} out of 10 on day ${last.day}.`;
  return `Around ${last.mean} out of 10 from day ${m[0].day} to day ${last.day}.`;
}
