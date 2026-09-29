import { antibioticName } from "./search";
import { labelFor, SYMPTOMS, TRIGGERS } from "./options";
import { copy } from "./copy";

export type EpisodeRow = { id: string; started_on: string; ended_on: string | null; notes: string | null };
export type SymptomRow = { episode_id: string; symptom: string; other_text: string | null; logged_on: string };
export type TriggerRow = { episode_id: string; trigger: string; other_text: string | null; logged_on: string };
export type TreatmentRow = {
  episode_id: string;
  antibiotic_id: string;
  other_name: string | null;
  started_on: string | null;
  days: number | null;
  course_type: string | null;
  source: string | null;
  worked: string | null;
};

const DAY = 86_400_000;

export function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function isoToday(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function isoDaysAgo(days: number, now = new Date()): string {
  return new Date(now.getTime() - days * DAY).toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toDate(toIso).getTime() - toDate(fromIso).getTime()) / DAY);
}

/** Inclusive length in days; open episodes count up to today. */
export function episodeLength(e: EpisodeRow, today = isoToday()): number {
  return daysBetween(e.started_on, e.ended_on ?? today) + 1;
}

export type Summary = {
  openEpisode: EpisodeRow | null;
  openDay: number;
  daysSinceLast: number | null;
  episodes6m: number;
  episodes12m: number;
  treatmentCourses12m: number;
  preventiveCourses12m: number;
  averageLengthDays: number | null;
  months: { key: string; label: string; episodes: number }[];
};

export function summarise(
  episodes: EpisodeRow[],
  treatments: TreatmentRow[],
  today = isoToday()
): Summary {
  const sorted = [...episodes].sort((a, b) => (a.started_on < b.started_on ? 1 : -1));
  const openEpisode = sorted.find((e) => !e.ended_on) ?? null;
  const closed = sorted.filter((e) => e.ended_on);
  const last = closed[0] ?? null;

  const since6 = isoDaysAgo(182, toDate(today));
  const since12 = isoDaysAgo(365, toDate(today));
  const in12 = sorted.filter((e) => e.started_on >= since12);
  const ids12 = new Set(in12.map((e) => e.id));
  const t12 = treatments.filter((t) => ids12.has(t.episode_id));

  const lengths = closed.map((e) => episodeLength(e, today));
  const months: Summary["months"] = [];
  const t = toDate(today);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
    const count = sorted.filter((e) => {
      const end = e.ended_on ?? today;
      return e.started_on.slice(0, 7) <= key && end.slice(0, 7) >= key;
    }).length;
    months.push({ key, label, episodes: count });
  }

  return {
    openEpisode,
    openDay: openEpisode ? episodeLength(openEpisode, today) : 0,
    daysSinceLast: openEpisode || !last ? null : daysBetween(last.ended_on!, today),
    episodes6m: sorted.filter((e) => e.started_on >= since6).length,
    episodes12m: in12.length,
    treatmentCourses12m: t12.filter((x) => x.course_type !== "preventive_daily" && x.course_type !== "post_sex_single").length,
    preventiveCourses12m: t12.filter((x) => x.course_type === "preventive_daily" || x.course_type === "post_sex_single").length,
    averageLengthDays: lengths.length ? Math.round((lengths.reduce((a, b) => a + b, 0) / lengths.length) * 10) / 10 : null,
    months,
  };
}

export type Patterns = { triggers: string[]; antibiotics: string[]; symptoms: string[]; enough: boolean };

/** Plain counts reflected back. No interpretation. */
export function patterns(
  episodes: EpisodeRow[],
  symptoms: SymptomRow[],
  triggers: TriggerRow[],
  treatments: TreatmentRow[]
): Patterns {
  const n = episodes.length;
  const enough = n >= 2;
  const countPerEpisode = <T extends { episode_id: string }>(rows: T[], key: (r: T) => string) => {
    const seen = new Map<string, Set<string>>();
    for (const r of rows) {
      const k = key(r);
      if (!seen.has(k)) seen.set(k, new Set());
      seen.get(k)!.add(r.episode_id);
    }
    return [...seen.entries()].map(([k, eps]) => ({ key: k, count: eps.size })).sort((a, b) => b.count - a.count);
  };
  const trig = countPerEpisode(triggers, (r) => r.trigger)
    .filter((x) => x.key !== "dont_know")
    .slice(0, 3)
    .map((x) => copy.patterns.trigger(labelFor(TRIGGERS, x.key), x.count, n));
  const sym = countPerEpisode(symptoms, (r) => r.symptom)
    .slice(0, 3)
    .map((x) => copy.patterns.symptom(labelFor(SYMPTOMS, x.key), x.count, n));
  const rated = new Map<string, { worked: number; rated: number; name: string }>();
  for (const t of treatments) {
    if (!t.worked || t.worked === "too_early") continue;
    const name = antibioticName(t.antibiotic_id, t.other_name);
    const cur = rated.get(name) ?? { worked: 0, rated: 0, name };
    cur.rated += 1;
    if (t.worked === "yes") cur.worked += 1;
    rated.set(name, cur);
  }
  const ab = [...rated.values()]
    .sort((a, b) => b.rated - a.rated)
    .slice(0, 3)
    .map((x) => copy.patterns.antibiotic(x.name, x.worked, x.rated));
  return { triggers: trig, antibiotics: ab, symptoms: sym, enough };
}

/** Order chips by what this user logs most; unseen keys keep default order. */
export function orderByUsage(keys: string[], rows: { key: string }[]): string[] {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.key, (counts.get(r.key) ?? 0) + 1);
  const other = keys.filter((k) => k === "other");
  const rest = keys.filter((k) => k !== "other");
  return [
    ...rest
      .map((k, i) => ({ k, c: counts.get(k) ?? 0, i }))
      .sort((a, b) => b.c - a.c || a.i - b.i)
      .map((x) => x.k),
    ...other,
  ];
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "-";
  return toDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Age band used for aggregate reporting, derived from the account's date of birth. */
export function ageBandFor(dateOfBirth: string | null | undefined, today = isoToday()): string {
  if (!dateOfBirth) return "prefer_not";
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - y;
  if (tm < m || (tm === m && td < d)) age -= 1;
  if (age < 25) return "18_24";
  if (age < 35) return "25_34";
  if (age < 45) return "35_44";
  if (age < 55) return "45_54";
  if (age < 65) return "55_64";
  return "65_plus";
}
