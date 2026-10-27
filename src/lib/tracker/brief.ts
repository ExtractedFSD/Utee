import type { TrackerData, TrackerProfile } from "./data";
import { organismShort } from "./cultures";
import { antibioticName } from "./search";
import { formatDay, summarise } from "./stats";

/*
 * The one line a clinician reads first: counts, courses, the last culture,
 * allergies, and what is missing. Everything in it is derived from what
 * the patient logged; nothing is interpreted.
 */
export type Brief = {
  /** Fragments joined with " · "; the first carries the UTI count and is bold on the page. */
  parts: string[];
  /** Sections with nothing recorded, in page order, for one "Nothing recorded for:" line. */
  missing: string[];
};

export function inBrief(profile: TrackerProfile, data: TrackerData, today: string): Brief {
  const sum = summarise(data.episodes, data.treatments, today);
  const parts: string[] = [];
  parts.push(`${sum.episodes12m} UTI${sum.episodes12m === 1 ? "" : "s"} in 12 months${sum.averageLengthDays !== null ? `, average ${sum.averageLengthDays} days` : ""}`);
  const courses = data.treatments.filter((t) => t.course_type !== "preventive_daily" && t.course_type !== "post_sex_single").length;
  parts.push(`${courses} antibiotic course${courses === 1 ? "" : "s"}`);
  const last = [...data.cultures].filter((c) => c.sample_on).sort((a, b) => (a.sample_on! < b.sample_on! ? 1 : -1))[0];
  if (last) {
    const what = last.outcome === "pathogens" && last.organisms.length ? last.organisms.map(organismShort).join(" + ") : last.outcome === "no_growth" ? "no growth" : last.outcome === "no_significant_growth" ? "no significant growth" : last.outcome === "mixed_growth" ? "mixed growth" : "result";
    parts.push(`${what} on last culture (${last.source === "utee" ? "Utee lab" : "patient"}, ${formatDay(last.sample_on!).replace(/ \d{4}$/, "")})`);
  }
  const allergies = (profile.allergies ?? []).map((a) => antibioticName(a.antibiotic_id, a.other_name).toLowerCase());
  parts.push(allergies.length ? `allerg${allergies.length === 1 ? "y" : "ies"}: ${allergies.join(", ")}` : "no allergies recorded");
  const active = data.preventions.filter((p) => !p.stopped_on).length;
  if (active) parts.push(`${active} preventive treatment${active === 1 ? "" : "s"} now`);
  const missing: string[] = [];
  if (!data.cultures.length) missing.push("cultures");
  if (!data.investigations.length) missing.push("investigations");
  if (!(profile.medical_history ?? []).length) missing.push("medical history");
  if (!data.preventions.length) missing.push("preventive treatments");
  return { parts, missing };
}

/** The details a clinician can act on, and one line for the rest. */
export function detailsGiven(profile: TrackerProfile, patient: { email: string; dateOfBirth: string | null }, nhs: string | null): { given: { k: string; v: string }[]; notGiven: string[] } {
  const rows: { k: string; v: string | null }[] = [
    { k: "Date of birth", v: patient.dateOfBirth ? formatDay(patient.dateOfBirth) : null },
    { k: "NHS number", v: nhs },
    { k: "Local hospital", v: profile.local_hospital },
    { k: "Email", v: patient.email },
    { k: "Phone", v: profile.phone },
    { k: "Address", v: [profile.address_line1, profile.address_line2, profile.city, profile.postcode].filter(Boolean).join(", ") || null },
  ];
  return {
    given: rows.filter((r): r is { k: string; v: string } => !!r.v),
    notGiven: rows.filter((r) => !r.v).map((r) => (r.k === "NHS number" ? r.k : r.k.toLowerCase())),
  };
}
