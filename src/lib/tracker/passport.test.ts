import { describe, expect, it } from "vitest";
import { antibioticHistory, formatNhsNumber, investigationLine, passportGlance, prophylaxisLine, timeline, type InvestigationRow } from "./passport";
import { parseInvestigation } from "./guided/investigation";

const inv = (over: Partial<InvestigationRow>): InvestigationRow => ({
  id: "i1",
  kind: "uss_kub",
  performed_on: "2025-08-12",
  normal: true,
  findings: [],
  body_part: null,
  values: {},
  notes: null,
  source: "patient",
  created_at: "2025-08-12T00:00:00Z",
  ...over,
});

describe("investigation lines", () => {
  it("reads the way a clinician writes it", () => {
    expect(investigationLine(inv({ values: { pvr_ml: 30 } }))).toEqual({ title: "USS KUB", detail: "Normal · PVR 30 ml" });
    expect(investigationLine(inv({ normal: false, findings: ["stones", "scarring"] })).detail).toBe("Abnormal: stones, kidney scarring");
    expect(investigationLine(inv({ kind: "bloods", values: { egfr: 92, creatinine: 70 } })).detail).toBe("Normal · Creatinine 70 µmol/L · eGFR 92 mL/min");
    expect(investigationLine(inv({ kind: "mri", body_part: "pelvis" })).title).toBe("MRI pelvis");
    expect(investigationLine(inv({ kind: "cystoscopy", normal: null, notes: "Awaiting letter" })).detail).toBe("Awaiting letter");
  });
});

describe("rule-based investigation reader", () => {
  it("reads kind, date, outcome and residual from a sentence", () => {
    const r = parseInvestigation("Ultrasound of my kidneys on 12 August 2025, all normal, 30 ml left after passing", "2026-10-20");
    expect(r.kind).toBe("uss_kub");
    expect(r.performed_on).toBe("2025-08-12");
    expect(r.normal).toBe(true);
    expect(r.pvr_ml).toBe(30);
  });
  it("reads abnormal findings and blood values", () => {
    const r = parseInvestigation("CT scan last year showed kidney stones and a cyst", "2026-10-20");
    expect(r.kind).toBe("ct_ap");
    expect(r.normal).toBe(false);
    expect(r.findings).toContain("stones");
    expect(r.findings).toContain("renal_cysts");
    const b = parseInvestigation("Kidney bloods in March: eGFR 88, creatinine 72", "2026-10-20");
    expect(b.kind).toBe("bloods");
    expect(b.egfr).toBe(88);
    expect(b.creatinine).toBe(72);
  });
  it("picks up a cystoscopy and an MRI body part", () => {
    expect(parseInvestigation("had a cystoscopy in 2024, inflamed bladder", "2026-10-20")).toMatchObject({ kind: "cystoscopy", normal: false, findings: ["inflammation"] });
    expect(parseInvestigation("MRI of the pelvis, normal", "2026-10-20")).toMatchObject({ kind: "mri", normal: true, body_part: "pelvis" });
  });
});

describe("antibiotic history", () => {
  it("counts courses, outcomes and reactions per antibiotic", () => {
    const rows = antibioticHistory(
      [
        { episode_id: "e1", antibiotic_id: "nitrofurantoin", other_name: null, started_on: "2026-01-01", days: 3, course_type: null, source: null, worked: "yes", reaction: null },
        { episode_id: "e2", antibiotic_id: "nitrofurantoin", other_name: null, started_on: "2026-03-01", days: 3, course_type: null, source: null, worked: "no", reaction: "nausea" },
        { episode_id: "e3", antibiotic_id: "trimethoprim", other_name: null, started_on: "2025-11-01", days: 3, course_type: null, source: null, worked: null, reaction: null },
      ],
      [{ antibiotic_id: "trimethoprim", other_name: null, reaction: "rash" }]
    );
    expect(rows.map((r) => r.antibiotic_id)).toEqual(["nitrofurantoin", "trimethoprim"]);
    expect(rows[0]).toMatchObject({ courses: 2, worked: 1, failed: 1, lastUsed: "2026-03-01", reactions: ["nausea"], allergy: false });
    expect(rows[1]).toMatchObject({ courses: 1, allergy: true });
  });
});

describe("prophylaxis lines and glance", () => {
  const p = { option_key: "vaginal_oestrogen", other_name: null, antibiotic_id: null, started_on: "2026-02-03", stopped_on: null, helping: null, product: "vagifem", dose: "10 micrograms", frequency: "twice_weekly" };
  it("writes the active regimen the way the summary wants it", () => {
    expect(prophylaxisLine(p)).toBe("Vaginal oestrogen Vagifem (pessary) 10 micrograms twice a week, since 3 Feb 2026");
    expect(prophylaxisLine({ option_key: "uromune", other_name: null, antibiotic_id: null, started_on: "2026-01-10", stopped_on: "2026-04-10", helping: null, course_weeks: 12, completed: true })).toContain("12-week course, completed, 10 Jan 2026 to 10 Apr 2026");
  });
  it("summarises at a glance", () => {
    const g = passportGlance({ utis6m: 2, utis12m: 4 }, { lifetime_utis: 20, medical_history: ["diabetes", "other"], medical_history_other: "Asthma", allergies: [{ antibiotic_id: "trimethoprim", other_name: null, reaction: "rash" }] }, [p], [inv({ values: { pvr_ml: 30 } })]);
    expect(g.utis12m).toBe(4);
    expect(g.lifetime).toBe(20);
    expect(g.activeProphylaxis).toHaveLength(1);
    expect(g.lastInvestigation).toEqual({ title: "USS KUB", detail: "Normal · PVR 30 ml", on: "2025-08-12" });
    expect(g.medicalHistory).toEqual(["Diabetes", "Asthma"]);
    expect(g.allergies).toEqual(["Trimethoprim: rash"]);
  });
});

describe("timeline", () => {
  it("merges everything newest first", () => {
    const events = timeline(
      [{ id: "e1", started_on: "2026-03-01", ended_on: "2026-03-05", notes: null }],
      [{ id: "t1", episode_id: "e1", antibiotic_id: "nitrofurantoin", other_name: null, started_on: "2026-03-02", days: 3, course_type: null, source: null, worked: "yes" }],
      [{ episode_id: "e1", kind: "lab", tested_on: "2026-03-01", result: "positive", kit_id: null }],
      [inv({})],
      [{ option_key: "d_mannose", other_name: null, antibiotic_id: null, started_on: "2026-04-01", stopped_on: null, helping: null }],
      { testKind: (k) => k, testResult: (r) => r ?? "" }
    );
    expect(events.map((e) => `${e.on} ${e.kind}`)).toEqual(["2026-04-01 prevention_started", "2026-03-02 treatment", "2026-03-01 uti", "2026-03-01 test", "2025-08-12 investigation"]);
  });
});

describe("NHS number", () => {
  it("formats ten digits and rejects anything else", () => {
    expect(formatNhsNumber("1234567890")).toBe("123 456 7890");
    expect(formatNhsNumber("123 456 7890")).toBe("123 456 7890");
    expect(formatNhsNumber("12345")).toBeNull();
    expect(formatNhsNumber(null)).toBeNull();
  });
});
