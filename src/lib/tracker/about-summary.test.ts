import { describe, expect, it } from "vitest";
import { aboutStepSummaries } from "./about-summary";
import type { TrackerProfile } from "./data";

const base: TrackerProfile = {
  user_id: "u1", date_of_birth: null, age_band: null, menopause_stage: null, contraception: null, pregnant_or_trying: "prefer_not",
  preventive_treatment_id: null, preventive_treatment_other: null, reminder_daily: false, reminder_monthly: false, last_treatment_source: null, una_ai: true,
  phone: null, address_line1: null, address_line2: null, city: null, postcode: null, local_hospital: null, nhs_number: null,
  first_uti_onset: null, first_uti_year: null, lifetime_utis: null, medical_history: [], medical_history_other: null,
  allergies: [],
};
const taking = [{ option_key: "d_mannose", other_name: null, antibiotic_id: null }, { option_key: "probiotics", other_name: null, antibiotic_id: null }];

describe("about you step summaries", () => {
  it("writes each answer so it reads without its question", () => {
    const rows = aboutStepSummaries({ ...base, menopause_stage: "not_yet", contraception: "pill", pregnant_or_trying: "no" }, taking);
    expect(rows[0]).toEqual(["Before menopause", "On the pill", "Not pregnant", "Taking D-mannose, Probiotics"]);
  });

  it("leaves out what is unanswered or says nothing, so an empty step is empty", () => {
    expect(aboutStepSummaries(base, [])).toEqual([[], [], []]);
    expect(aboutStepSummaries({ ...base, menopause_stage: "prefer_not", contraception: "prefer_not" }, [])[0]).toEqual([]);
  });

  it("says what the history numbers and names are", () => {
    const rows = aboutStepSummaries({ ...base, first_uti_onset: "adult", first_uti_year: 2015, lifetime_utis: 12, medical_history: ["diabetes"], allergies: [{ antibiotic_id: "trimethoprim", other_name: null, reaction: null }] }, []);
    expect(rows[1]).toEqual(["First UTI as an adult, around 2015", "12 UTIs in all", "Diabetes", "Allergic to Trimethoprim"]);
  });

  it("marks the NHS number so it is not mistaken for a phone number", () => {
    const rows = aboutStepSummaries({ ...base, phone: "07700 900123", local_hospital: "Royal Berkshire", city: "Reading", postcode: "RG1 1AA", nhs_number: "1234567890" }, []);
    expect(rows[2]).toEqual(["07700 900123", "Royal Berkshire", "Reading, RG1 1AA", "NHS 123 456 7890"]);
  });
});
