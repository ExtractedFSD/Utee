import { describe, expect, it } from "vitest";
import { detailsGiven, inBrief } from "./brief";
import type { TrackerData, TrackerProfile } from "./data";

const profile: TrackerProfile = {
  user_id: "u1", date_of_birth: null, age_band: null, menopause_stage: null, contraception: null, pregnant_or_trying: "no",
  preventive_treatment_id: null, preventive_treatment_other: null, reminder_daily: false, reminder_monthly: false, last_treatment_source: null, una_ai: true,
  phone: null, address_line1: null, address_line2: null, city: null, postcode: null, local_hospital: "Royal Berkshire", nhs_number: null,
  first_uti_onset: null, first_uti_year: null, lifetime_utis: 12, medical_history: [], medical_history_other: null,
  allergies: [{ antibiotic_id: "trimethoprim", other_name: null, reaction: null }],
};
const data: TrackerData = {
  episodes: [{ id: "e1", started_on: "2026-08-04", ended_on: "2026-08-11", notes: null }, { id: "e2", started_on: "2026-09-21", ended_on: "2026-09-24", notes: null }],
  symptoms: [], triggers: [],
  treatments: [
    { id: "t1", episode_id: "e1", antibiotic_id: "amoxicillin", other_name: null, started_on: "2026-08-05", days: 3, course_type: "treatment", source: null, worked: null, created_at: "" },
    { id: "t2", episode_id: "e2", antibiotic_id: "dont_know", other_name: null, started_on: "2026-09-21", days: 3, course_type: "treatment", source: null, worked: "yes", created_at: "" },
  ],
  tests: [], checkins: [], preventions: [],
  investigations: [],
  cultures: [{ id: "utee:k1", episode_id: null, sample_on: "2026-10-06", method: "utee", method_other: null, outcome: "pathogens", organisms: [{ key: "e_coli", name: null, count: null }], sensitivities: {}, microscopy: {}, notes: null, source: "utee", created_at: "" }],
  verifications: [],
};

describe("in brief", () => {
  it("says the five things a clinician asks first, and what is missing", () => {
    const b = inBrief(profile, data, "2026-10-22");
    expect(b.parts).toEqual(["2 UTIs in 12 months, average 6 days", "2 antibiotic courses", "E. coli on last culture (Utee lab, 6 Oct)", "allergy: trimethoprim"]);
    expect(b.missing).toEqual(["investigations", "medical history", "preventive treatments"]);
  });
  it("shows only the details given and lists the rest once", () => {
    const d = detailsGiven(profile, { email: "p@example.com", dateOfBirth: null }, null);
    expect(d.given).toEqual([{ k: "Local hospital", v: "Royal Berkshire" }, { k: "Email", v: "p@example.com" }]);
    expect(d.notGiven).toEqual(["date of birth", "nhs number", "phone", "address"]);
  });
});
