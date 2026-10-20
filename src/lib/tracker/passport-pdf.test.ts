import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { renderPassportPdf, type PassportInput } from "./passport-pdf";

const profile: PassportInput["profile"] = {
  user_id: "u1",
  date_of_birth: "1988-04-12",
  age_band: "35-44",
  menopause_stage: "not_yet",
  contraception: "none",
  pregnant_or_trying: "no",
  preventive_treatment_id: null,
  preventive_treatment_other: null,
  reminder_daily: false,
  reminder_monthly: false,
  last_treatment_source: null,
  una_ai: true,
  phone: "07700 900123",
  address_line1: "1 Example Road",
  address_line2: null,
  city: "Reading",
  postcode: "RG1 1AA",
  local_hospital: "Royal Berkshire Hospital",
  nhs_number: "1234567890",
  first_uti_onset: "adult",
  first_uti_year: 2015,
  lifetime_utis: 20,
  medical_history: ["diabetes"],
  medical_history_other: null,
  allergies: [{ antibiotic_id: "trimethoprim", other_name: null, reaction: "rash" }],
};

describe("passport PDF", () => {
  it("renders with history, investigations and prophylaxis", async () => {
    const pdf = await renderPassportPdf({
      patient: { name: "Test Patient", email: "test@example.com", dateOfBirth: "1988-04-12" },
      profile,
      generatedOn: "2026-10-20",
      data: {
        episodes: [
          { id: "e1", started_on: "2026-03-01", ended_on: "2026-03-06", notes: null },
          { id: "e2", started_on: "2026-07-10", ended_on: null, notes: null },
        ],
        symptoms: [{ id: "s1", episode_id: "e1", symptom: "burning", other_text: null, logged_on: "2026-03-01" }],
        triggers: [],
        treatments: [
          { id: "t1", episode_id: "e1", antibiotic_id: "nitrofurantoin", other_name: null, started_on: "2026-03-02", days: 3, course_type: "treatment", source: "gp", worked: "yes", dose: "100 mg", frequency: "twice_daily", route: "oral", reaction: null, created_at: "2026-03-02T00:00:00Z" },
          { id: "t2", episode_id: "e2", antibiotic_id: "trimethoprim", other_name: null, started_on: "2026-07-11", days: 3, course_type: "treatment", source: "gp", worked: "no", dose: "200 mg", frequency: "twice_daily", route: "oral", reaction: "rash", created_at: "2026-07-11T00:00:00Z" },
        ],
        tests: [{ id: "x1", episode_id: "e1", kind: "lab", tested_on: "2026-03-01", result: "positive", notes: "E. coli", kit_id: null }],
        checkins: [],
        preventions: [
          { id: "p1", option_key: "vaginal_oestrogen", other_name: null, antibiotic_id: null, started_on: "2026-02-03", stopped_on: null, helping: "yes", notes: null, product: "vagifem", dose: "10 micrograms", frequency: "twice_weekly", course_weeks: null, completed: null, created_at: "2026-02-03T00:00:00Z" },
          { id: "p2", option_key: "methenamine", other_name: null, antibiotic_id: null, started_on: "2026-04-01", stopped_on: null, helping: null, notes: null, product: null, dose: "1 g", frequency: "twice_daily", course_weeks: null, completed: null, created_at: "2026-04-01T00:00:00Z" },
          { id: "p3", option_key: "d_mannose", other_name: null, antibiotic_id: null, started_on: "2025-10-01", stopped_on: "2026-01-15", helping: "no", notes: "Made no difference", product: null, dose: null, frequency: "once_daily", course_weeks: null, completed: null, created_at: "2025-10-01T00:00:00Z" },
        ],
        investigations: [
          { id: "i1", kind: "uss_kub", performed_on: "2025-08-12", normal: true, findings: [], body_part: null, values: { pvr_ml: 30 }, notes: null, source: "patient", created_at: "2025-08-12T00:00:00Z" },
          { id: "i2", kind: "bloods", performed_on: "2026-09-16", normal: true, findings: [], body_part: null, values: { egfr: 92, creatinine: 70 }, notes: null, source: "patient", created_at: "2026-09-16T00:00:00Z" },
          { id: "i3", kind: "cystoscopy", performed_on: "2025-09-15", normal: true, findings: [], body_part: null, values: {}, notes: "Normal urothelium", source: "patient", created_at: "2025-09-15T00:00:00Z" },
        ],
      },
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const out = process.env.REPORT_PDF_OUT;
    if (out) fs.writeFileSync(path.join(out, "passport.pdf"), pdf);
  }, 60_000);
});
