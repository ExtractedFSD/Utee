import { z } from "zod";

/*
 * Who the test is for, asked at the start of the symptom form and stored
 * with it, per kit. Three answers: the account holder themselves; another
 * adult, who should have the kit passed to their own account instead; or a
 * dependant the account holder looks after and answers for. The report,
 * the clinic case and the passport use this identity, not the account's.
 */
export const TEST_FOR = [
  { key: "me", label: "Me", hint: "I will take the sample and this is my result." },
  { key: "other_adult", label: "Another adult who can use Utee themselves", hint: "A partner, friend or relative. The kit should move to their own account so the result is theirs." },
  { key: "dependant", label: "Someone I look after who can't use the portal", hint: "A child, or an adult you care for. You answer on their behalf and the result is in their name." },
] as const;
export type TestFor = (typeof TEST_FOR)[number]["key"];

export const SEX = [
  { key: "female", label: "Female" },
  { key: "male", label: "Male" },
  { key: "intersex", label: "Intersex" },
  { key: "prefer_not", label: "Prefer not to say" },
] as const;
export type Sex = (typeof SEX)[number]["key"];

export const RELATIONSHIP = [
  { key: "parent", label: "Parent or guardian" },
  { key: "carer", label: "Carer" },
  { key: "other", label: "Other" },
] as const;
export type Relationship = (typeof RELATIONSHIP)[number]["key"];

export const DEPENDANT_CONFIRM = "I am responsible for this person's care and I consent to this test on their behalf.";

const today = () => new Date().toISOString().slice(0, 10);

/** What the form sends. "other_adult" never reaches the server: the form sends them to pass the kit on instead. */
export const patientSchema = z
  .object({
    for: z.enum(["me", "dependant"]),
    name: z.string().trim().min(2, "Enter the patient's full name").max(150),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date of birth")
      .refine((v) => v <= today() && v >= "1900-01-01", "Enter a real date of birth"),
    sex: z.enum(["female", "male", "intersex", "prefer_not"], { errorMap: () => ({ message: "Choose an option for sex" }) }),
    relationship: z.enum(["parent", "carer", "other"]).optional(),
    dependantConfirmed: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.for === "dependant") {
      if (!v.relationship) ctx.addIssue({ code: "custom", message: "Tell us your relationship to them" });
      if (!v.dependantConfirmed) ctx.addIssue({ code: "custom", message: "Please confirm you are responsible for their care" });
    }
  });

export type PatientInput = z.input<typeof patientSchema>;

/** What is stored on the submission. */
export type TriagePatient = {
  for: "me" | "dependant";
  name: string;
  dateOfBirth: string;
  sex: Sex;
  relationship: Relationship | null;
  /** Who typed it: the patient, or the account holder on a dependant's behalf. */
  enteredBy: "self" | "account_holder";
};

export function toStoredPatient(p: z.output<typeof patientSchema>): TriagePatient {
  return {
    for: p.for,
    name: p.name.trim().replace(/\s+/g, " "),
    dateOfBirth: p.dateOfBirth,
    sex: p.sex,
    relationship: p.for === "dependant" ? (p.relationship ?? "other") : null,
    enteredBy: p.for === "dependant" ? "account_holder" : "self",
  };
}

export function readStoredPatient(value: unknown): TriagePatient | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<TriagePatient>;
  if ((v.for !== "me" && v.for !== "dependant") || typeof v.name !== "string" || typeof v.dateOfBirth !== "string") return null;
  return {
    for: v.for,
    name: v.name,
    dateOfBirth: v.dateOfBirth,
    sex: (SEX.some((s) => s.key === v.sex) ? v.sex : "prefer_not") as Sex,
    relationship: (RELATIONSHIP.some((r) => r.key === v.relationship) ? v.relationship : null) as Relationship | null,
    enteredBy: v.enteredBy === "account_holder" ? "account_holder" : "self",
  };
}

export const sexLabel = (s: Sex) => SEX.find((x) => x.key === s)?.label ?? "";
export const relationshipLabel = (r: Relationship | null) => (r ? RELATIONSHIP.find((x) => x.key === r)?.label ?? "Other" : "");

/** One line for clinicians: "Entered by the account holder (parent or guardian)". */
export function enteredByLine(p: TriagePatient | null, accountName: string | null): string | null {
  if (!p || p.enteredBy !== "account_holder") return null;
  return `Details entered by the account holder${accountName ? `, ${accountName}` : ""} (${relationshipLabel(p.relationship).toLowerCase()})`;
}
