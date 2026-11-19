import { describe, expect, it } from "vitest";
import { enteredByLine, patientSchema, readStoredPatient, toStoredPatient } from "./patient";

describe("who the test is for", () => {
  it("accepts the account holder with name, date of birth and sex", () => {
    const r = patientSchema.safeParse({ for: "me", name: "Demo Patient", dateOfBirth: "1990-05-14", sex: "female" });
    expect(r.success).toBe(true);
    if (r.success) expect(toStoredPatient(r.data)).toEqual({ for: "me", name: "Demo Patient", dateOfBirth: "1990-05-14", sex: "female", relationship: null, enteredBy: "self" });
  });

  it("needs a relationship and the responsibility confirmation for a dependant", () => {
    const missing = patientSchema.safeParse({ for: "dependant", name: "Amelia Chapman", dateOfBirth: "2019-03-12", sex: "female" });
    expect(missing.success).toBe(false);
    const ok = patientSchema.safeParse({ for: "dependant", name: "Amelia  Chapman", dateOfBirth: "2019-03-12", sex: "female", relationship: "parent", dependantConfirmed: true });
    expect(ok.success).toBe(true);
    if (ok.success) {
      const stored = toStoredPatient(ok.data);
      expect(stored).toMatchObject({ for: "dependant", name: "Amelia Chapman", relationship: "parent", enteredBy: "account_holder" });
      expect(enteredByLine(stored, "Dan Chapman")).toBe("Details entered by the account holder, Dan Chapman (parent or guardian)");
    }
  });

  it("refuses a date of birth in the future or before 1900", () => {
    expect(patientSchema.safeParse({ for: "me", name: "Demo Patient", dateOfBirth: "2999-01-01", sex: "male" }).success).toBe(false);
    expect(patientSchema.safeParse({ for: "me", name: "Demo Patient", dateOfBirth: "1850-01-01", sex: "male" }).success).toBe(false);
  });

  it("reads stored values defensively and says nothing for self-entered details", () => {
    expect(readStoredPatient(null)).toBeNull();
    expect(readStoredPatient({ for: "me", name: "X", dateOfBirth: "1990-01-01", sex: "nonsense" })?.sex).toBe("prefer_not");
    expect(enteredByLine(readStoredPatient({ for: "me", name: "X", dateOfBirth: "1990-01-01", sex: "female" }), "Dan")).toBeNull();
  });
});
