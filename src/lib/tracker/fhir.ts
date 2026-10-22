import type { TrackerData, TrackerProfile } from "./data";
import { FEELINGS, MENOPAUSE_STAGES, SYMPTOMS, TEST_KINDS, TEST_RESULTS, labelFor } from "./options";
import { antibioticName } from "./search";
import { preventionName } from "./prevention";
import { FREQUENCIES, INVESTIGATION_KINDS, MEDICAL_HISTORY, ROUTES, investigationKind, investigationLine } from "./passport";
import { ORGANISMS, methodLabel } from "./cultures";
import { diaryEntries } from "./diary";
import { verificationFor } from "./verify";

/*
 * The passport as a FHIR R4 Bundle (type "collection"), for anyone taking it
 * into another system. Every resource is tagged with where it came from:
 * patient-entered, the Utee laboratory, or clinician-verified. Codes are
 * used only where they are certain; everything else is carried as text, which
 * FHIR allows and which is honest about what a patient-kept record is.
 */

const SOURCE_SYSTEM = "https://myutee.co.uk/fhir/source";
const SNOMED = "http://snomed.info/sct";
const LOINC = "http://loinc.org";
const INTERPRETATION = "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation";
const NHS_NUMBER = "https://fhir.nhs.uk/Id/nhs-number";

type Resource = Record<string, unknown> & { resourceType: string; id: string };

export type FhirInput = {
  patient: { name: string | null; email: string; dateOfBirth: string | null };
  profile: TrackerProfile;
  data: TrackerData;
  generatedOn: string;
};

const tag = (source: "patient" | "utee" | "verified") => ({ tag: [{ system: SOURCE_SYSTEM, code: source, display: source === "patient" ? "Patient-entered" : source === "utee" ? "Utee laboratory" : "Clinician-verified" }] });
const text = (t: string, coding?: { system: string; code: string; display: string }) => ({ ...(coding ? { coding: [coding] } : {}), text: t });
const ref = (type: string, id: string) => ({ reference: `${type}/${id}` });

export function toFhirBundle(input: FhirInput): { resourceType: "Bundle"; id: string; type: "collection"; timestamp: string; entry: { fullUrl: string; resource: Resource }[] } {
  const { patient, profile, data } = input;
  const resources: Resource[] = [];
  const patientId = `patient-${profile.user_id}`;
  const subject = ref("Patient", patientId);

  resources.push({
    resourceType: "Patient",
    id: patientId,
    meta: tag("patient"),
    identifier: profile.nhs_number ? [{ system: NHS_NUMBER, value: profile.nhs_number }] : undefined,
    name: patient.name ? [{ text: patient.name }] : undefined,
    birthDate: patient.dateOfBirth ?? undefined,
    telecom: [{ system: "email", value: patient.email }, ...(profile.phone ? [{ system: "phone", value: profile.phone }] : [])],
    address: profile.address_line1 || profile.postcode ? [{ line: [profile.address_line1, profile.address_line2].filter(Boolean), city: profile.city ?? undefined, postalCode: profile.postcode ?? undefined, country: "GB" }] : undefined,
    extension: profile.local_hospital ? [{ url: "https://myutee.co.uk/fhir/StructureDefinition/local-hospital", valueString: profile.local_hospital }] : undefined,
  });

  // Past medical history and the menopause stage, as conditions in text.
  for (const key of profile.medical_history ?? []) {
    const label = key === "other" ? profile.medical_history_other?.trim() : MEDICAL_HISTORY.find((o) => o.key === key)?.label;
    if (!label) continue;
    resources.push({ resourceType: "Condition", id: `pmh-${key}`, meta: tag("patient"), subject, clinicalStatus: text("active", { system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active", display: "Active" }), code: text(label) });
  }
  if (profile.menopause_stage && profile.menopause_stage !== "prefer_not") {
    resources.push({ resourceType: "Observation", id: "menopause-stage", meta: tag("patient"), status: "final", subject, code: text("Menopause stage (patient-reported)"), valueString: labelFor(MENOPAUSE_STAGES, profile.menopause_stage) });
  }

  for (const [i, a] of (profile.allergies ?? []).entries()) {
    resources.push({
      resourceType: "AllergyIntolerance", id: `allergy-${i + 1}`, meta: tag("patient"), patient: subject, category: ["medication"],
      code: text(antibioticName(a.antibiotic_id, a.other_name)),
      reaction: a.reaction ? [{ manifestation: [text(a.reaction)] }] : undefined,
    });
  }

  // Each UTI is a Condition; the symptoms logged against it are its evidence.
  for (const e of data.episodes) {
    const symptoms = [...new Set(data.symptoms.filter((s) => s.episode_id === e.id).map((s) => (s.symptom === "other" ? s.other_text?.trim() || "Other" : labelFor(SYMPTOMS, s.symptom))))];
    resources.push({
      resourceType: "Condition", id: `uti-${e.id}`, meta: tag("patient"), subject,
      clinicalStatus: text(e.ended_on ? "resolved" : "active", { system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: e.ended_on ? "resolved" : "active", display: e.ended_on ? "Resolved" : "Active" }),
      code: text("Urinary tract infection (patient-reported)", { system: SNOMED, code: "68566005", display: "Urinary tract infectious disease" }),
      onsetDateTime: e.started_on, abatementDateTime: e.ended_on ?? undefined,
      evidence: symptoms.length ? symptoms.map((s) => ({ code: [text(s)] })) : undefined,
      note: e.notes ? [{ text: e.notes }] : undefined,
    });
  }

  for (const t of data.treatments) {
    const dosage = [t.dose, t.frequency && (FREQUENCIES.find((f) => f.key === t.frequency)?.label ?? t.frequency).toLowerCase(), t.route && ROUTES.find((r) => r.key === t.route)?.label, t.days && `${t.days} days`].filter(Boolean).join(", ");
    const end = t.started_on && t.days ? new Date(new Date(`${t.started_on}T00:00:00Z`).getTime() + (t.days - 1) * 86_400_000).toISOString().slice(0, 10) : undefined;
    resources.push({
      resourceType: "MedicationStatement", id: `treatment-${t.id}`, meta: tag("patient"), subject, status: end && end < input.generatedOn ? "completed" : "active",
      medicationCodeableConcept: text(antibioticName(t.antibiotic_id, t.other_name)),
      effectivePeriod: t.started_on ? { start: t.started_on, end } : undefined,
      reasonReference: [ref("Condition", `uti-${t.episode_id}`)],
      dosage: dosage ? [{ text: dosage }] : undefined,
      note: [t.worked && `Patient-reported outcome: worked ${t.worked.replace("_", " ")}`, t.reaction && `Reaction: ${t.reaction}`, t.source && `Prescribed via: ${t.source.replace("_", " ")}`].filter(Boolean).map((x) => ({ text: x as string })),
    });
  }

  for (const p of data.preventions) {
    const dosage = [p.product, p.dose, p.frequency && (FREQUENCIES.find((f) => f.key === p.frequency)?.label ?? p.frequency).toLowerCase(), p.course_weeks && `${p.course_weeks}-week course${p.completed ? ", completed" : p.completed === false ? ", not completed" : ""}`].filter(Boolean).join(", ");
    resources.push({
      resourceType: "MedicationStatement", id: `prevention-${p.id}`, meta: tag("patient"), subject, status: p.stopped_on ? "stopped" : "active",
      category: text("Preventive (prophylaxis)"),
      medicationCodeableConcept: text(preventionName(p)),
      effectivePeriod: p.started_on || p.stopped_on ? { start: p.started_on ?? undefined, end: p.stopped_on ?? undefined } : undefined,
      dosage: dosage ? [{ text: dosage }] : undefined,
      note: [p.helping && `Patient says it is helping: ${p.helping.replace("_", " ")}`, p.notes].filter(Boolean).map((x) => ({ text: x as string })),
    });
  }

  // Simple tests (dipstick, lab sent, Utee without a report) as observations.
  for (const t of data.tests) {
    if (t.kit_id && data.cultures.some((c) => c.id === `utee:${t.kit_id}`)) continue;
    resources.push({
      resourceType: "Observation", id: `test-${t.id}`, meta: tag("patient"), status: "final", subject,
      code: text(labelFor(TEST_KINDS, t.kind)), effectiveDateTime: t.tested_on ?? undefined,
      valueString: t.result ? labelFor(TEST_RESULTS, t.result) : undefined, note: t.notes ? [{ text: t.notes }] : undefined,
    });
  }

  // Cultures: one observation per sample, one per organism with its sensitivities as components.
  for (const c of data.cultures) {
    const source = c.source === "utee" ? "utee" : verificationFor(data.verifications, "culture", c.id) ? "verified" : "patient";
    const verified = verificationFor(data.verifications, "culture", c.id);
    const base = { meta: tag(source), status: "final", subject, effectiveDateTime: c.sample_on ?? undefined, performer: verified ? [{ display: `Verified by ${verified.verified_name}` }] : undefined };
    const sampleId = `culture-${c.id.replace(/[^A-Za-z0-9-]/g, "-")}`;
    resources.push({
      resourceType: "Observation", id: sampleId, ...base,
      code: text(`Urine culture: ${methodLabel(c)}`, { system: LOINC, code: "630-4", display: "Bacteria identified in Urine by Culture" }),
      valueString: c.outcome === "pathogens" ? c.organisms.map((o) => `${organismName(o.key, o.name)}${o.count ? ` ${o.count}` : ""}`).join("; ") : c.outcome.replace(/_/g, " "),
      note: c.notes ? [{ text: c.notes }] : undefined,
      hasMember: c.organisms.map((o) => ref("Observation", `${sampleId}-${o.key}`)),
    });
    for (const o of c.organisms) {
      const sens = c.sensitivities[o.key] ?? {};
      resources.push({
        resourceType: "Observation", id: `${sampleId}-${o.key}`, ...base,
        code: text("Organism identified in urine culture"),
        valueCodeableConcept: text(organismName(o.key, o.name), o.key === "e_coli" ? { system: SNOMED, code: "112283007", display: "Escherichia coli" } : undefined),
        note: o.count ? [{ text: `Count: ${o.count}` }] : undefined,
        component: Object.entries(sens).map(([antibioticId, sir]) => ({
          code: text(`${antibioticName(antibioticId, null)} susceptibility`),
          interpretation: [text(sir === "S" ? "Susceptible" : sir === "I" ? "Intermediate" : "Resistant", { system: INTERPRETATION, code: sir, display: sir === "S" ? "Susceptible" : sir === "I" ? "Intermediate" : "Resistant" })],
        })),
      });
    }
    if (c.microscopy.white_cells !== undefined && c.microscopy.white_cells !== null) resources.push({ resourceType: "Observation", id: `${sampleId}-wbc`, ...base, code: text("White cells in urine (microscopy)"), valueQuantity: { value: c.microscopy.white_cells } });
    if (c.microscopy.red_cells !== undefined && c.microscopy.red_cells !== null) resources.push({ resourceType: "Observation", id: `${sampleId}-rbc`, ...base, code: text("Red cells in urine (microscopy)"), valueQuantity: { value: c.microscopy.red_cells } });
  }

  // Investigations: a DiagnosticReport each, with measured values as observations.
  for (const inv of data.investigations) {
    const def = investigationKind(inv.kind);
    const verified = verificationFor(data.verifications, "investigation", inv.id);
    const line = investigationLine(inv);
    const results: { reference: string }[] = [];
    for (const v of def.values) {
      const value = inv.values?.[v.key];
      if (value === null || value === undefined || value === "") continue;
      const id = `investigation-${inv.id}-${v.key}`;
      results.push(ref("Observation", id));
      resources.push({ resourceType: "Observation", id, meta: tag(verified ? "verified" : "patient"), status: "final", subject, effectiveDateTime: inv.performed_on ?? undefined, code: text(v.label), valueQuantity: { value: Number(value), unit: v.unit } });
    }
    resources.push({
      resourceType: "DiagnosticReport", id: `investigation-${inv.id}`, meta: tag(verified ? "verified" : "patient"), status: "final", subject,
      code: text(INVESTIGATION_KINDS.find((k) => k.key === inv.kind)?.label ?? inv.kind), effectiveDateTime: inv.performed_on ?? undefined,
      performer: verified ? [{ display: `Verified by ${verified.verified_name}` }] : undefined,
      conclusion: [line.title !== def.short ? line.title : null, line.detail || null].filter(Boolean).join(": ") || undefined,
      result: results.length ? results : undefined,
    });
  }

  // The diary: how the patient felt each day and the daily symptom score.
  for (const d of diaryEntries(data.checkins, data.symptoms, [], [], data.episodes, { testKind: (k) => k }, input.generatedOn)) {
    if (d.feeling === null && d.score === null && !d.note) continue;
    resources.push({
      resourceType: "Observation", id: `diary-${d.on}`, meta: tag("patient"), status: "final", subject, effectiveDateTime: d.on,
      code: text("Daily diary entry (patient-reported)"),
      valueString: d.feeling ? `Feeling: ${labelFor(FEELINGS, String(d.feeling))} (${d.feeling} of 5)` : undefined,
      component: [
        ...(d.score !== null ? [{ code: text("Symptom score (sum of 1 to 10 ratings)"), valueInteger: d.score }] : []),
        ...d.symptoms.filter((s) => s.severity).map((s) => ({ code: text(`${s.label} (1 to 10)`), valueInteger: s.severity })),
      ],
      note: d.note ? [{ text: d.note }] : undefined,
      ...(d.episodeId ? { focus: [ref("Condition", `uti-${d.episodeId}`)] } : {}),
    });
  }

  const entry = resources.map((r) => ({ fullUrl: `urn:utee:${r.resourceType.toLowerCase()}:${r.id}`, resource: strip(r) as Resource }));
  return { resourceType: "Bundle", id: `uti-passport-${profile.user_id}`, type: "collection", timestamp: new Date().toISOString(), entry };
}

function organismName(key: string, name: string | null): string {
  return key === "other" ? name?.trim() || "Other organism" : ORGANISMS.find((o) => o.key === key)?.name ?? key;
}

/** Drop undefined fields and empty arrays so the JSON is clean. */
function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined || (Array.isArray(v) && v.length === 0)) continue;
      out[k] = strip(v);
    }
    return out;
  }
  return value;
}
