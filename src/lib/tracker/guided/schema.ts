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

/*
 * Loose twins of the free-form schema for the AI call. Structured output
 * compiles every enum into a grammar, and the full free schema repeats the
 * option lists three times, which is too large. The loose version takes
 * plain strings and `normaliseFree` keeps only known keys afterwards.
 */
const looseTreatment = z.object({
  antibiotic_id: z.string().nullable(),
  other_name: z.string().nullable(),
  days: z.number().int().nullable(),
  course_type: z.string().nullable(),
  source: z.string().nullable(),
  worked: z.string().nullable(),
});
const looseTest = z.object({ kind: z.string(), result: z.string().nullable(), tested_on: z.string().nullable() });
const looseUti = z.object({
  started_on: z.string().nullable(),
  ended_on: z.string().nullable(),
  ongoing: z.boolean().nullable(),
  symptoms: z.array(z.string()),
  other_symptom: z.string().nullable(),
  triggers: z.array(z.string()),
  other_trigger: z.string().nullable(),
  treatments: z.array(looseTreatment),
  tests: z.array(looseTest),
  notes: z.string().nullable(),
});
export const looseFreeSchema = z.object({
  utis: z.array(looseUti),
  taking: z.object({ keys: z.array(z.string()), stopped_keys: z.array(z.string()), other_name: z.string().nullable(), antibiotic_id: z.string().nullable() }),
  existing: z.object({
    mentioned: z.boolean(),
    ended: z.boolean().nullable(),
    ended_on: z.string().nullable(),
    feeling: z.number().int().nullable(),
    symptoms_today: z.array(z.string()),
    other_symptom: z.string().nullable(),
    triggers: z.array(z.string()),
    other_trigger: z.string().nullable(),
    treatments: z.array(looseTreatment),
    tests: z.array(looseTest),
    note: z.string().nullable(),
  }),
});
export type LooseFree = z.infer<typeof looseFreeSchema>;

const inList = (list: { key: string }[]) => (k: string | null | undefined) => (k && list.some((o) => o.key === k) ? k : null);
const onlyIn = (list: { key: string }[]) => (keys: string[]) => [...new Set(keys.filter((k) => list.some((o) => o.key === k)))];
const isoOrNull = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
const antibiotic = (id: string | null, other: string | null): { antibiotic_id: string | null; other_name: string | null } => {
  if (!id) return { antibiotic_id: null, other_name: null };
  if ((ANTIBIOTIC_IDS as string[]).includes(id)) return { antibiotic_id: id, other_name: id === "other" ? other : null };
  const byName = ANTIBIOTICS.find((a) => a.name.toLowerCase() === id.toLowerCase() || a.brands?.some((b) => b.toLowerCase() === id.toLowerCase()));
  return byName ? { antibiotic_id: byName.id, other_name: null } : { antibiotic_id: "other", other_name: other ?? id };
};
const normTreatment = (t: z.infer<typeof looseTreatment>): TreatmentExtract => ({
  ...antibiotic(t.antibiotic_id, t.other_name),
  days: t.days && t.days > 0 ? Math.min(t.days, 365) : null,
  course_type: inList(COURSE_TYPES)(t.course_type),
  source: inList(SOURCES)(t.source),
  worked: inList(WORKED)(t.worked),
});
const normTest = (t: z.infer<typeof looseTest>): TestExtract | null => {
  const kind = inList(TEST_KINDS)(t.kind);
  return kind ? { kind, result: inList(TEST_RESULTS)(t.result), tested_on: isoOrNull(t.tested_on) } : null;
};

/** Keep only known keys and ids from the AI's loose answer. */
export function normaliseFree(f: LooseFree): FreeExtract {
  const symptoms = onlyIn(SYMPTOMS);
  const triggers = onlyIn(TRIGGERS);
  const keys = (list: string[]) => list.filter((k) => PREVENTION_KEYS.includes(k));
  return {
    utis: f.utis.map((u) => ({
      started_on: isoOrNull(u.started_on),
      ended_on: isoOrNull(u.ended_on),
      ongoing: u.ongoing,
      symptoms: symptoms(u.symptoms),
      other_symptom: u.other_symptom,
      triggers: triggers(u.triggers),
      other_trigger: u.other_trigger,
      treatments: u.treatments.map(normTreatment).filter((t) => t.antibiotic_id),
      tests: u.tests.map(normTest).filter((t): t is TestExtract => !!t),
      notes: u.notes,
    })),
    taking: { keys: keys(f.taking.keys), stopped_keys: keys(f.taking.stopped_keys), other_name: f.taking.other_name, antibiotic_id: antibiotic(f.taking.antibiotic_id, null).antibiotic_id === "other" ? null : antibiotic(f.taking.antibiotic_id, null).antibiotic_id },
    existing: {
      mentioned: f.existing.mentioned,
      ended: f.existing.ended,
      ended_on: isoOrNull(f.existing.ended_on),
      feeling: f.existing.feeling && f.existing.feeling >= 1 && f.existing.feeling <= 5 ? f.existing.feeling : null,
      symptoms_today: symptoms(f.existing.symptoms_today),
      other_symptom: f.existing.other_symptom,
      triggers: triggers(f.existing.triggers),
      other_trigger: f.existing.other_trigger,
      treatments: f.existing.treatments.map(normTreatment).filter((t) => t.antibiotic_id),
      tests: f.existing.tests.map(normTest).filter((t): t is TestExtract => !!t),
      note: f.existing.note,
    },
  };
}
