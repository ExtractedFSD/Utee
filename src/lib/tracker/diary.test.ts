import { describe, expect, it } from "vitest";
import { calendar, dayMeans, diaryEntries, episodeOn, feelingStrip, meanSummary, scoreSummary, symptomScores } from "./diary";

const episode = { id: "e1", started_on: "2026-03-01", ended_on: "2026-03-05", notes: null };
const symptoms = [
  { episode_id: "e1", symptom: "burning", other_text: null, logged_on: "2026-03-01", severity: 8 },
  { episode_id: "e1", symptom: "frequency", other_text: null, logged_on: "2026-03-01", severity: 7 },
  { episode_id: "e1", symptom: "urgency", other_text: null, logged_on: "2026-03-01", severity: null },
  { episode_id: "e1", symptom: "burning", other_text: null, logged_on: "2026-03-02", severity: 9 },
  { episode_id: "e1", symptom: "frequency", other_text: null, logged_on: "2026-03-02", severity: 8 },
  { episode_id: "e1", symptom: "burning", other_text: null, logged_on: "2026-03-04", severity: 3 },
  { episode_id: "e1", symptom: "other", other_text: "Itchy", logged_on: "2026-03-04", severity: 3 },
  // A day ticked but never rated does not become a point.
  { episode_id: "e1", symptom: "burning", other_text: null, logged_on: "2026-03-05", severity: null },
  { episode_id: "e2", symptom: "burning", other_text: null, logged_on: "2026-03-02", severity: 10 },
];

describe("symptom scores", () => {
  it("adds up each day's ratings and skips unrated days", () => {
    const points = symptomScores(symptoms, episode);
    expect(points.map((p) => [p.day, p.score, p.ticked, p.rated])).toEqual([[1, 15, 3, 2], [2, 17, 2, 2], [4, 6, 2, 2]]);
    expect(points[2].items.map((i) => i.label)).toEqual(["Burning or stinging when peeing", "Itchy"]);
  });
  it("summarises the shape of the UTI in a sentence", () => {
    expect(scoreSummary(symptomScores(symptoms, episode))).toBe("Symptom score peaked at 17 on day 2, down to 6 by day 4.");
    expect(scoreSummary(symptomScores(symptoms, episode).slice(0, 1))).toBeNull();
    expect(scoreSummary(symptomScores(symptoms, episode).slice(0, 2))).toBe("Symptom score rose from 15 on day 1 to 17 on day 2.");
  });
});

describe("diary", () => {
  const checkins = [
    { episode_id: "e1", on_date: "2026-03-01", feeling: 2, note: "Started in the night" },
    { episode_id: null, on_date: "2026-03-10", feeling: 5, note: null },
    { episode_id: null, on_date: "2026-03-11", feeling: null, note: "   " },
    { episode_id: null, on_date: "2026-03-12", feeling: null, note: "Long drive, drank little" },
  ];
  const treatments = [{ episode_id: "e1", antibiotic_id: "nitrofurantoin", other_name: null, started_on: "2026-03-02" }];
  const tests = [{ episode_id: "e1", kind: "dipstick_home", tested_on: "2026-03-01" }];
  it("builds one entry per day with something in it, newest first", () => {
    const entries = diaryEntries(checkins, symptoms.filter((s) => s.episode_id === "e1"), treatments, tests, [episode], { testKind: (k) => k }, "2026-03-20");
    expect(entries.map((e) => e.on)).toEqual(["2026-03-12", "2026-03-10", "2026-03-05", "2026-03-04", "2026-03-02", "2026-03-01"]);
    const first = entries[entries.length - 1];
    expect(first).toMatchObject({ feeling: 2, note: "Started in the night", episodeId: "e1", utiDay: 1, score: 15, tests: ["dipstick_home"] });
    expect(first.symptoms.map((s) => s.severity)).toEqual([8, 7, null]);
    expect(entries.find((e) => e.on === "2026-03-02")?.started).toEqual(["Nitrofurantoin"]);
    expect(entries.find((e) => e.on === "2026-03-12")).toMatchObject({ feeling: null, note: "Long drive, drank little", episodeId: null, utiDay: null, score: null });
  });
  it("knows which UTI a day falls in", () => {
    expect(episodeOn([episode], "2026-03-03")?.id).toBe("e1");
    expect(episodeOn([episode], "2026-03-06")).toBeNull();
    expect(episodeOn([{ ...episode, ended_on: null }], "2026-03-19", "2026-03-20")?.id).toBe("e1");
  });
  it("lays the last days on a Monday-first grid and marks UTI days and today", () => {
    // 2026-03-12 is a Thursday; 30 days back starts on Wednesday 11 Feb, so two blanks lead.
    const cal = calendar(checkins, [episode], 30, "2026-03-12");
    expect(cal.lead).toBe(2);
    expect(cal.cells).toHaveLength(30);
    expect(cal.cells[cal.cells.length - 1]).toMatchObject({ on: "2026-03-12", today: true, dayOfMonth: 12, feeling: null });
    expect(cal.cells.find((c) => c.on === "2026-03-03")).toMatchObject({ inUti: true, feeling: null });
    expect(cal.cells.find((c) => c.on === "2026-03-10")).toMatchObject({ inUti: false, feeling: 5 });
  });
  it("averages each day's ratings into a 1 to 10 bar", () => {
    const points = symptomScores(symptoms, episode);
    expect(dayMeans(points).map((d) => [d.day, d.mean])).toEqual([[1, 8], [2, 9], [4, 3]]);
    expect(meanSummary(points)).toBe("Worst on day 2, easing to 3 out of 10 by day 4.");
    expect(meanSummary(points.slice(0, 1))).toBeNull();
  });
  it("lays the last days out as a strip", () => {
    const strip = feelingStrip(checkins, 5, "2026-03-12");
    expect(strip.map((c) => c.on)).toEqual(["2026-03-08", "2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12"]);
    expect(strip.map((c) => c.feeling)).toEqual([null, null, 5, null, null]);
  });
});
