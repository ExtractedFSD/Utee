import { describe, it, expect } from "vitest";
import { redFlagFor, RED_FLAG_SYMPTOMS } from "./redflags";
import { searchAntibiotics, antibioticName, PINNED_ANTIBIOTICS, ANTIBIOTICS } from "./search";
import { summarise, patterns, episodeLength, orderByUsage, daysBetween, ageBandFor } from "./stats";
import { copy } from "./copy";
import { SYMPTOMS, TRIGGERS } from "./options";
import { diffPreventions, preventionName, searchPreventions } from "./prevention";
import { parseAbout, parseDatePhrase, parseFree, parsePrevention, parseUtis } from "./guided/local";

describe("red flags", () => {
  it("shows for each listed symptom and not otherwise", () => {
    for (const s of SYMPTOMS) {
      const r = redFlagFor([s.key], "no");
      expect(r.show).toBe(RED_FLAG_SYMPTOMS.has(s.key));
    }
    expect(redFlagFor(["burning", "frequency"], "no")).toEqual({ show: false });
    expect(redFlagFor([], "no")).toEqual({ show: false });
  });
  it("shows for pregnancy regardless of symptoms, with its own reason", () => {
    expect(redFlagFor([], "yes")).toEqual({ show: true, reason: "pregnancy" });
    expect(redFlagFor(["burning"], "prefer_not")).toEqual({ show: false });
  });
  it("copy never diagnoses", () => {
    const text = [copy.redFlag.title, copy.redFlag.body, copy.redFlag.pregnancyBody, copy.redFlag.footnote].join(" ").toLowerCase();
    for (const banned of ["you have", "infection", "risk", "probably", "likely"]) expect(text).not.toContain(banned);
    expect(text).toContain("111");
    expect(text).toContain("999");
  });
});

describe("antibiotic search", () => {
  it("prefix matches on generic name rank first", () => {
    const hits = searchAntibiotics("nitro");
    expect(hits[0].item.id).toBe("nitrofurantoin");
  });
  it("matches brands and shows generic in brackets", () => {
    const hits = searchAntibiotics("macrobid");
    expect(hits[0].item.id).toBe("nitrofurantoin");
    expect(hits[0].label).toBe("Macrobid (nitrofurantoin)");
  });
  it("matches aliases and misspellings from the file", () => {
    expect(searchAntibiotics("cephalexin")[0].item.id).toBe("cefalexin");
    expect(searchAntibiotics("augmentin")[0].item.id).toBe("co_amoxiclav");
    expect(searchAntibiotics("trimethaprim")[0].item.id).toBe("trimethoprim");
  });
  it("tolerates a small typo not in the file", () => {
    expect(searchAntibiotics("nitrofurantoim")[0].item.id).toBe("nitrofurantoin");
    expect(searchAntibiotics("fosfomycn")[0].item.id).toBe("fosfomycin");
  });
  it("is case-insensitive and never returns the pinned items", () => {
    const hits = searchAntibiotics("CIPRO");
    expect(hits[0].item.id).toBe("ciprofloxacin");
    expect(hits.some((h) => h.item.pinned)).toBe(false);
    expect(PINNED_ANTIBIOTICS.map((p) => p.id)).toEqual(["other", "dont_know"]);
  });
  it("returns nothing for empty input and clean names for stored ids", () => {
    expect(searchAntibiotics("  ")).toEqual([]);
    expect(antibioticName("nitrofurantoin")).toBe("Nitrofurantoin");
    expect(antibioticName("other", "Mystery tablets")).toBe("Mystery tablets");
    expect(ANTIBIOTICS.every((a) => a.dmd_code === undefined || a.dmd_code === null)).toBe(true);
  });
});

describe("stats", () => {
  const today = "2026-09-29";
  const episodes = [
    { id: "a", started_on: "2026-09-25", ended_on: null, notes: null },
    { id: "b", started_on: "2026-06-01", ended_on: "2026-06-05", notes: null },
    { id: "c", started_on: "2025-11-10", ended_on: "2025-11-12", notes: null },
    { id: "d", started_on: "2025-01-01", ended_on: "2025-01-03", notes: null },
  ];
  const treatments = [
    { episode_id: "a", antibiotic_id: "nitrofurantoin", other_name: null, started_on: null, days: 3, course_type: "treatment", source: "gp", worked: null },
    { episode_id: "b", antibiotic_id: "nitrofurantoin", other_name: null, started_on: null, days: 3, course_type: "treatment", source: "gp", worked: "yes" },
    { episode_id: "c", antibiotic_id: "nitrofurantoin", other_name: null, started_on: null, days: 3, course_type: "treatment", source: "gp", worked: "no" },
    { episode_id: "c", antibiotic_id: "trimethoprim", other_name: null, started_on: null, days: 90, course_type: "preventive_daily", source: "gp", worked: "too_early" },
  ];

  it("counts episodes and courses as plain facts", () => {
    const s = summarise(episodes, treatments, today);
    expect(s.openEpisode?.id).toBe("a");
    expect(s.openDay).toBe(5);
    expect(s.daysSinceLast).toBeNull();
    expect(s.episodes6m).toBe(2);
    expect(s.episodes12m).toBe(3);
    expect(s.treatmentCourses12m).toBe(3);
    expect(s.preventiveCourses12m).toBe(1);
    expect(s.averageLengthDays).toBe(3.7);
    expect(s.months).toHaveLength(12);
    expect(s.months.at(-1)?.episodes).toBe(1);
  });
  it("reports days since last when nothing is open", () => {
    const s = summarise(episodes.slice(1), treatments, today);
    expect(s.openEpisode).toBeNull();
    expect(s.daysSinceLast).toBe(daysBetween("2026-06-05", today));
  });
  it("patterns are counts with the user's own words", () => {
    const symptoms = [
      { episode_id: "a", symptom: "burning", other_text: null, logged_on: "2026-09-25" },
      { episode_id: "b", symptom: "burning", other_text: null, logged_on: "2026-06-01" },
      { episode_id: "b", symptom: "urgency", other_text: null, logged_on: "2026-06-01" },
    ];
    const triggers = [
      { episode_id: "a", trigger: "sex", other_text: null, logged_on: "2026-09-25" },
      { episode_id: "b", trigger: "sex", other_text: null, logged_on: "2026-06-01" },
      { episode_id: "c", trigger: "dont_know", other_text: null, logged_on: "2025-11-10" },
    ];
    const p = patterns(episodes, symptoms, triggers, treatments);
    expect(p.enough).toBe(true);
    expect(p.triggers[0]).toBe("Sex: logged in 2 of 4 UTIs");
    expect(p.triggers.some((t) => t.startsWith("Don't know"))).toBe(false);
    expect(p.antibiotics[0]).toBe("Nitrofurantoin: you said it worked 1 of 2 times");
    expect(p.symptoms[0]).toBe("Burning or stinging when peeing: 2 of 4 UTIs");
    const joined = [...p.triggers, ...p.antibiotics, ...p.symptoms].join(" ").toLowerCase();
    for (const banned of ["recurrent", "risk", "should", "recommend"]) expect(joined).not.toContain(banned);
  });
  it("orders chips by usage, keeping Other last", () => {
    const keys = TRIGGERS.map((t) => t.key);
    const ordered = orderByUsage(keys, [{ key: "constipation" }, { key: "constipation" }, { key: "sex" }]);
    expect(ordered.slice(0, 2)).toEqual(["constipation", "sex"]);
    expect(ordered.at(-1)).toBe("other");
  });
  it("derives the age band from the date of birth", () => {
    expect(ageBandFor("1990-05-14", "2026-09-29")).toBe("35_44");
    expect(ageBandFor("2001-09-30", "2026-09-29")).toBe("18_24");
    expect(ageBandFor("2001-09-29", "2026-09-29")).toBe("25_34");
    expect(ageBandFor(null)).toBe("prefer_not");
  });
  it("episode length is inclusive", () => {
    expect(episodeLength({ id: "x", started_on: "2026-01-01", ended_on: "2026-01-01", notes: null })).toBe(1);
  });
});

describe("copy", () => {
  it("has no em dashes and no product claims", () => {
    const walk = (v: unknown): string[] =>
      typeof v === "string" ? [v] : typeof v === "function" ? [String((v as (...a: never[]) => string)("x" as never, 1 as never, 2 as never))] : v && typeof v === "object" ? Object.values(v).flatMap(walk) : [];
    const all = walk(copy).join(" ");
    expect(all).not.toContain(String.fromCharCode(0x2014));
    for (const banned of ["Probiotics", "D-Mannose", "supplement", "prevents", "recommended"]) expect(all).not.toContain(banned);
  });
});


describe("prevention", () => {
  it("diffs a re-picked list into adds and stops, ignoring unknown keys", () => {
    const d = diffPreventions(["d_mannose", "probiotics"], ["probiotics", "vaginal_oestrogen", "made_up", "water"]);
    expect(d.add).toEqual(["vaginal_oestrogen"]);
    expect(d.stop).toEqual(["d_mannose"]);
  });
  it("names things the way people know them", () => {
    expect(preventionName({ option_key: "p_happi", other_name: null, antibiotic_id: null })).toBe("P Happi spray");
    expect(preventionName({ option_key: "other", other_name: "Cystopurin", antibiotic_id: null })).toBe("Cystopurin");
    expect(preventionName({ option_key: "low_dose_antibiotic", other_name: null, antibiotic_id: "nitrofurantoin" })).toBe("Low-dose daily antibiotic: Nitrofurantoin");
    expect(preventionName({ option_key: "water", other_name: null, antibiotic_id: null })).toBe("Drinking more water");
  });
  it("search finds things by brand, spelling and group", () => {
    expect(searchPreventions("hiprex")[0].key).toBe("methenamine");
    expect(searchPreventions("vagifem")[0].key).toBe("vaginal_oestrogen");
    expect(searchPreventions("mann")[0].key).toBe("d_mannose");
    expect(searchPreventions("vaccine").map((o) => o.key)).toContain("uromune");
    expect(searchPreventions("")).toEqual([]);
    expect(searchPreventions("water")).toEqual([]);
  });
});

describe("guided setup, rule-based reading", () => {
  const today = "2026-09-29";
  it("reads relative and written dates", () => {
    expect(parseDatePhrase("it started 3 days ago", today)).toBe("2026-09-26");
    expect(parseDatePhrase("about a week ago", today)).toBe("2026-09-22");
    expect(parseDatePhrase("on 12 sept", today)).toBe("2026-09-12");
    expect(parseDatePhrase("12/09/2026", today)).toBe("2026-09-12");
    expect(parseDatePhrase("back in march", today)).toBe("2026-03-15");
    expect(parseDatePhrase("no date here", today)).toBeNull();
  });
  it("reads about-you answers", () => {
    expect(parseAbout("I'm post menopause, no contraception, not pregnant")).toEqual({ menopause_stage: "after", contraception: "none", pregnant_or_trying: "no" });
    expect(parseAbout("on the pill, not there yet with menopause").contraception).toBe("pill");
  });
  it("reads what people take", () => {
    const p = parsePrevention("I take D-mannose and vaginal oestrogen and a probiotic");
    expect(p.keys.sort()).toEqual(["d_mannose", "probiotics", "vaginal_oestrogen"]);
    expect(parsePrevention("nothing").keys).toEqual([]);
    expect(parsePrevention("trimethoprim every night to prevent them").antibiotic_id).toBe("trimethoprim");
    const changed = parsePrevention("I've stopped the cranberry tablets and started D-mannose, still on the probiotics");
    expect(changed.stopped_keys).toEqual(["cranberry"]);
    expect(changed.keys.sort()).toEqual(["d_mannose", "probiotics"]);
    expect(parsePrevention("nothing's changed").keys).toEqual([]);
  });
  it("reads one UTI with its course, without confusing course length with UTI length", () => {
    const { utis } = parseUtis("started 3 weeks ago and lasted 5 days, burning and needing to go a lot, nitrofurantoin from the GP for 3 days which helped", today);
    expect(utis).toHaveLength(1);
    const u = utis[0];
    expect(u.started_on).toBe("2026-09-08");
    expect(u.ended_on).toBe("2026-09-12");
    expect(u.symptoms).toEqual(["burning", "frequency"]);
    expect(u.treatments[0]).toMatchObject({ antibiotic_id: "nitrofurantoin", days: 3, source: "gp", worked: "yes" });
  });
  it("free-form: tells a UTI from a change in what they take, and reads both", () => {
    const f = parseFree("Had another one 2 days ago, burning, still got it. Also I've stopped the D-mannose", today);
    expect(f.utis).toHaveLength(1);
    expect(f.utis[0]).toMatchObject({ started_on: "2026-09-27", ongoing: true, symptoms: ["burning"] });
    expect(f.taking.stopped_keys).toEqual(["d_mannose"]);
    expect(f.taking.keys).toEqual([]);
    const course = parseFree("trimethoprim from the GP for 3 days last week, cleared it", today);
    expect(course.utis[0].treatments[0].antibiotic_id).toBe("trimethoprim");
    expect(course.taking.keys).toEqual([]);
    expect(parseFree("started taking cranberry tablets", today).utis).toHaveLength(0);
    expect(parseFree("started taking cranberry tablets", today).taking.keys).toEqual(["cranberry"]);
  });
  it("splits several UTIs and spots an ongoing one", () => {
    const { utis } = parseUtis("One started 3 weeks ago and lasted 5 days, burning. Another one 10 days ago, urgency and cloudy, still going", today);
    expect(utis).toHaveLength(2);
    expect(utis[1]).toMatchObject({ started_on: "2026-09-19", ongoing: true, ended_on: null });
    expect(utis[1].symptoms).toEqual(["urgency", "cloudy"]);
  });
});
