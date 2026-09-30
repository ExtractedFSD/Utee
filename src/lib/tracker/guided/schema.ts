import { z } from "zod/v4";
import { CONTRACEPTION, COURSE_TYPES, MENOPAUSE_STAGES, PREGNANT, SOURCES, SYMPTOMS, TEST_KINDS, TEST_RESULTS, TRIGGERS, WORKED } from "../options";
import { ANTIBIOTICS } from "../search";
import { PREVENTION_KEYS } from "../prevention";

/*
 * What the guided setup can pull out of a typed answer. The same schemas
 * shape the AI extraction, the rule-based fallback and the review cards, so
 * nothing outside these keys can ever be written.
 */
const keys = (list: { key: string }[]) => list.map((o) => o.key) as [string, ...string[]];
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ANTIBIOTIC_IDS = ANTIBIOTICS.map((a) => a.id) as [string, ...string[]];

export const aboutSchema = z.object({
  menopause_stage: z.enum(keys(MENOPAUSE_STAGES)).nullable(),
  contraception: z.enum(keys(CONTRACEPTION)).nullable(),
  pregnant_or_trying: z.enum(keys(PREGNANT)).nullable(),
});
export type AboutExtract = z.infer<typeof aboutSchema>;

export const preventionSchema = z.object({
  keys: z.array(z.enum(PREVENTION_KEYS as [string, ...string[]])),
  stopped_keys: z.array(z.enum(PREVENTION_KEYS as [string, ...string[]])),
  other_name: z.string().nullable(),
  antibiotic_id: z.enum(ANTIBIOTIC_IDS).nullable(),
});
export type PreventionExtract = z.infer<typeof preventionSchema>;

export const treatmentSchema = z.object({
  antibiotic_id: z.enum(ANTIBIOTIC_IDS).nullable(),
  other_name: z.string().nullable(),
  days: z.number().int().nullable(),
  course_type: z.enum(keys(COURSE_TYPES)).nullable(),
  source: z.enum(keys(SOURCES)).nullable(),
  worked: z.enum(keys(WORKED)).nullable(),
});
export type TreatmentExtract = z.infer<typeof treatmentSchema>;

export const testSchema = z.object({
  kind: z.enum(keys(TEST_KINDS)),
  result: z.enum(keys(TEST_RESULTS)).nullable(),
  tested_on: z.string().nullable(),
});
export type TestExtract = z.infer<typeof testSchema>;

export const utiSchema = z.object({
  started_on: z.string().nullable(),
  ended_on: z.string().nullable(),
  ongoing: z.boolean().nullable(),
  symptoms: z.array(z.enum(keys(SYMPTOMS))),
  other_symptom: z.string().nullable(),
  triggers: z.array(z.enum(keys(TRIGGERS))),
  other_trigger: z.string().nullable(),
  treatments: z.array(treatmentSchema),
  tests: z.array(testSchema),
  notes: z.string().nullable(),
});
export type UtiExtract = z.infer<typeof utiSchema>;

export const utisSchema = z.object({ utis: z.array(utiSchema) });
export type UtisExtract = z.infer<typeof utisSchema>;

/** Something said about the UTI already on the record: it has gone, or how today is going. */
export const existingSchema = z.object({
  mentioned: z.boolean(),
  ended: z.boolean().nullable(),
  ended_on: z.string().nullable(),
  feeling: z.number().int().nullable(),
  symptoms_today: z.array(z.enum(keys(SYMPTOMS))),
  other_symptom: z.string().nullable(),
  triggers: z.array(z.enum(keys(TRIGGERS))),
  other_trigger: z.string().nullable(),
  treatments: z.array(treatmentSchema),
  tests: z.array(testSchema),
  note: z.string().nullable(),
});
export type ExistingExtract = z.infer<typeof existingSchema>;

/** Free-form: one message may hold new UTIs, changes to what they take, news about the open UTI, or a mix. */
export const freeSchema = z.object({ utis: z.array(utiSchema), taking: preventionSchema, existing: existingSchema });
export type FreeExtract = z.infer<typeof freeSchema>;

/** The shape the review card saves. Dates must be real by then. */
export const utiSaveSchema = z.object({
  started_on: isoDate,
  ended_on: isoDate.nullable(),
  symptoms: z.array(z.enum(keys(SYMPTOMS))).max(20),
  other_symptom: z.string().max(200).nullable(),
  triggers: z.array(z.enum(keys(TRIGGERS))).max(20),
  other_trigger: z.string().max(200).nullable(),
  treatments: z.array(treatmentSchema.extend({ days: z.number().int().positive().max(365).nullable() })).max(10),
  tests: z.array(testSchema).max(10),
  notes: z.string().max(4000).nullable(),
});
export type UtiSave = z.infer<typeof utiSaveSchema>;

export const emptyExisting = (): ExistingExtract => ({
  mentioned: false, ended: null, ended_on: null, feeling: null, symptoms_today: [], other_symptom: null, triggers: [], other_trigger: null, treatments: [], tests: [], note: null,
});

export const emptyUti = (): UtiExtract => ({
  started_on: null, ended_on: null, ongoing: null, symptoms: [], other_symptom: null, triggers: [], other_trigger: null, treatments: [], tests: [], notes: null,
});

export type GuidedStep = "about" | "prevention" | "utis" | "free";
