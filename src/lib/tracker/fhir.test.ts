import { describe, expect, it } from "vitest";
import { toFhirBundle } from "./fhir";
import type { TrackerData, TrackerProfile } from "./data";

const profile: TrackerProfile = {
  user_id: "u1", date_of_birth: "1988-04-12", age_band: "35-44", menopause_stage: "not_yet", contraception: "none", pregnant_or_trying: "no",
  preventive_treatment_id: null, preventive_treatment_other: null, reminder_daily: false, reminder_monthly: false, last_treatment_source: null, una_ai: true,
  phone: "07700 900123", address_line1: "1 Example Road", address_line2: null, city: "Reading", postcode: "RG1 1AA", local_hospital: "Royal Berkshire Hospital", nhs_number: "1234567890",
  first_uti_onset: "adult", first_uti_year: 2015, lifetime_utis: 20, medical_history: ["diabetes"], medical_history_other: null,
  allergies: [{ antibiotic_id: "trimethoprim", other_name: null, reaction: "rash" }],
};

const data: TrackerData = {
  episodes: [{ id: "e1", started_on: "2026-03-01", ended_on: "2026-03-06", notes: null }],
  symptoms: [{ id: "s1", episode_id: "e1", symptom: "burning", other_text: null, logged_on: "2026-03-01", severity: 8 }],
  triggers: [],
  treatments: [{ id: "t1", episode_id: "e1", antibiotic_id: "nitrofurantoin", other_name: null, started_on: "2026-03-02", days: 3, course_type: "treatment", source: "gp", worked: "yes", dose: "100 mg", frequency: "twice_daily", route: "oral", reaction: null, created_at: "2026-03-02T00:00:00Z" }],
  tests: [{ id: "x1", episode_id: "e1", kind: "dipstick_home", tested_on: "2026-03-01", result: "positive", notes: null, kit_id: null }],
  checkins: [{ episode_id: "e1", on_date: "2026-03-01", feeling: 2, note: "Started overnight" }],
  preventions: [{ id: "p1", option_key: "vaginal_oestrogen", other_name: null, antibiotic_id: null, started_on: "2026-02-03", stopped_on: null, helping: "yes", notes: null, product: "vagifem", dose: "10 micrograms", frequency: "twice_weekly", course_weeks: null, completed: null, created_at: "2026-02-03T00:00:00Z" }],
  investigations: [{ id: "i1", kind: "uss_kub", performed_on: "2025-08-12", normal: true, findings: [], body_part: null, values: { pvr_ml: 30 }, notes: null, source: "patient", created_at: "2025-08-12T00:00:00Z" }],
  cultures: [{ id: "c1", episode_id: "e1", sample_on: "2026-03-01", method: "standard_culture", method_other: null, outcome: "pathogens", organisms: [{ key: "e_coli", name: null, count: ">10^8 cfu/L" }], sensitivities: { e_coli: { nitrofurantoin: "S", trimethoprim: "R" } }, microscopy: { white_cells: 150 }, notes: null, source: "patient", created_at: "2026-03-01T00:00:00Z" }],
  verifications: [{ id: "v1", entity: "investigation", entity_id: "i1", verified_name: "Prof Bob Yang", verified_at: "2026-10-01T10:00:00Z" }],
};

describe("FHIR bundle", () => {
  const bundle = toFhirBundle({ patient: { name: "Test Patient", email: "t@example.com", dateOfBirth: "1988-04-12" }, profile, data, generatedOn: "2026-10-22" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const of = (type: string): Record<string, any>[] => bundle.entry.filter((e) => e.resource.resourceType === type).map((e) => e.resource);
  it("carries every part of the passport as a resource", () => {
    expect(bundle.resourceType).toBe("Bundle");
    expect(bundle.type).toBe("collection");
    expect(of("Patient")).toHaveLength(1);
    expect(of("Condition")).toHaveLength(2);
    expect(of("AllergyIntolerance")).toHaveLength(1);
    expect(of("MedicationStatement")).toHaveLength(2);
    expect(of("DiagnosticReport")).toHaveLength(1);
    // Sample, organism, white cells, PVR, dipstick, diary day, menopause stage.
    expect(of("Observation")).toHaveLength(7);
  });
  it("codes what is certain and tags the source", () => {
    const patient = of("Patient")[0];
    expect(patient.identifier[0]).toEqual({ system: "https://fhir.nhs.uk/Id/nhs-number", value: "1234567890" });
    const uti = of("Condition").find((c) => c.id === "uti-e1")!;
    expect(uti.code.coding[0].code).toBe("68566005");
    expect(uti.evidence).toHaveLength(1);
    const organism = of("Observation").find((o) => o.id === "culture-c1-e_coli")!;
    expect(organism.valueCodeableConcept.coding[0].code).toBe("112283007");
    expect(organism.component.map((c: { interpretation: { coding: { code: string }[] }[] }) => c.interpretation[0].coding[0].code)).toEqual(["S", "R"]);
    const report = of("DiagnosticReport")[0];
    expect(report.meta.tag[0].code).toBe("verified");
    expect(report.performer[0].display).toBe("Verified by Prof Bob Yang");
    expect(report.conclusion).toBe("Normal · PVR 30 ml");
    const treatment = of("MedicationStatement")[0];
    expect(treatment.dosage[0].text).toBe("100 mg, twice a day, By mouth, 3 days");
    expect(treatment.effectivePeriod).toEqual({ start: "2026-03-02", end: "2026-03-04" });
    expect(treatment.status).toBe("completed");
  });
  it("leaves no undefined fields in the JSON", () => {
    expect(JSON.stringify(bundle)).not.toContain("undefined");
    expect(JSON.stringify(bundle)).not.toContain("null");
  });
});
