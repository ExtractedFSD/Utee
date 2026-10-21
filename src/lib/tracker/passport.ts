import type { Option } from "./options";
import { antibioticName } from "./search";
import { preventionName, preventionShortName, type PreventionLike } from "./prevention";
import type { EpisodeRow, TreatmentRow } from "./stats";
import { formatDay } from "./stats";

/*
 * The UTI passport: the parts of the tracker a clinician reads at a glance.
 * Option lists here are the vocabulary the forms, the summary and the PDF
 * share. Nothing here interprets a result; it describes and dates.
 */

export const FIRST_UTI_ONSET: Option[] = [
  { key: "childhood", label: "As a child" },
  { key: "adult", label: "As an adult" },
  { key: "unsure", label: "Not sure" },
];

/** Conditions a clinician reviewing recurrent UTIs wants to know about. */
export const MEDICAL_HISTORY: Option[] = [
  { key: "diabetes", label: "Diabetes" },
  { key: "kidney_stones", label: "Kidney or bladder stones" },
  { key: "catheter", label: "Urinary catheter (now or in the past)" },
  { key: "prolapse", label: "Prolapse" },
  { key: "neuro_bladder", label: "Neurological bladder condition" },
  { key: "immunosuppressed", label: "Immunosuppressed or on immunosuppressants" },
  { key: "urological_surgery", label: "Previous urological surgery" },
  { key: "interstitial_cystitis", label: "Interstitial cystitis or painful bladder syndrome" },
  { key: "kidney_disease", label: "Chronic kidney disease" },
  { key: "endometriosis", label: "Endometriosis" },
  { key: "ibs_bowel", label: "IBS or bowel condition" },
  { key: "other", label: "Something else" },
];

export type Allergy = { antibiotic_id: string; other_name: string | null; reaction: string | null };

export const ROUTES: Option[] = [
  { key: "oral", label: "By mouth" },
  { key: "iv", label: "Drip or injection (IV)" },
  { key: "other", label: "Other" },
];

export const FREQUENCIES: Option[] = [
  { key: "once_daily", label: "Once a day" },
  { key: "twice_daily", label: "Twice a day" },
  { key: "three_daily", label: "Three times a day" },
  { key: "four_daily", label: "Four times a day" },
  { key: "twice_weekly", label: "Twice a week" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "as_needed", label: "When needed" },
  { key: "other", label: "Other" },
];

/** Products given as bladder instillations. "Mix" covers two together. */
export const INSTILLATION_PRODUCTS: Option[] = [
  { key: "ialuril", label: "iAluRil" },
  { key: "hyacyst", label: "Hyacyst" },
  { key: "cystistat", label: "Cystistat" },
  { key: "controcyst", label: "Controcyst" },
  { key: "gentamicin", label: "Gentamicin" },
  { key: "amikacin", label: "Amikacin" },
  { key: "vancomycin", label: "Vancomycin" },
  { key: "mix", label: "A mix of two" },
  { key: "other", label: "Other" },
];

export const VAGINAL_OESTROGEN_PRODUCTS: Option[] = [
  { key: "vagifem", label: "Vagifem (pessary)" },
  { key: "estriol_cream", label: "Estriol cream (Ovestin, Gina)" },
  { key: "imvaggis", label: "Imvaggis (pessary)" },
  { key: "estring", label: "Estring (ring)" },
  { key: "blissel", label: "Blissel (gel)" },
  { key: "other", label: "Other" },
];

/** Prevention option keys that take a product, a dose, a frequency or a course. */
export const PREVENTION_DETAIL: Record<string, { product?: Option[]; dose?: boolean; frequency?: boolean; course?: boolean }> = {
  vaginal_oestrogen: { product: VAGINAL_OESTROGEN_PRODUCTS, dose: true, frequency: true },
  methenamine: { dose: true, frequency: true },
  bladder_instillation: { product: INSTILLATION_PRODUCTS, frequency: true },
  low_dose_antibiotic: { dose: true, frequency: true },
  post_sex_antibiotic: { dose: true },
  uromune: { course: true },
  urovaxom: { course: true },
  other_vaccine: { course: true },
  d_mannose: { dose: true, frequency: true },
  cranberry: { dose: true, frequency: true },
  probiotics: { frequency: true },
};

// ----------------------------------------------------------- investigations

export type InvestigationKind = "bloods" | "uss_kub" | "ct_ap" | "mri" | "cystoscopy" | "laparoscopy" | "other";

export type InvestigationKindDef = {
  key: InvestigationKind;
  label: string;
  /** The line a clinician reads, e.g. "USS KUB". */
  short: string;
  /** Structured findings offered when the result is not normal. */
  findings: Option[];
  /** Numbers worth capturing for this kind, with units. */
  values: { key: string; label: string; unit: string }[];
  /** MRI needs to say what was scanned. */
  bodyPart?: boolean;
};

const UPPER_TRACT_FINDINGS: Option[] = [
  { key: "hydronephrosis", label: "Hydronephrosis (swollen kidney)" },
  { key: "scarring", label: "Kidney scarring" },
  { key: "stones", label: "Stones" },
  { key: "renal_cysts", label: "Kidney cysts" },
];

export const INVESTIGATION_KINDS: InvestigationKindDef[] = [
  {
    key: "bloods",
    label: "Kidney blood tests",
    short: "Kidney bloods",
    findings: [],
    values: [
      { key: "creatinine", label: "Creatinine", unit: "µmol/L" },
      { key: "egfr", label: "eGFR", unit: "mL/min" },
    ],
  },
  {
    key: "uss_kub",
    label: "Ultrasound of kidneys and bladder (USS KUB)",
    short: "USS KUB",
    findings: [...UPPER_TRACT_FINDINGS, { key: "bladder_wall", label: "Thickened bladder wall" }, { key: "other", label: "Something else" }],
    values: [{ key: "pvr_ml", label: "Urine left after passing (post-void residual)", unit: "ml" }],
  },
  {
    key: "ct_ap",
    label: "CT scan of abdomen and pelvis",
    short: "CT abdomen and pelvis",
    findings: [
      ...UPPER_TRACT_FINDINGS,
      { key: "diverticular", label: "Bowel diverticular disease" },
      { key: "ovarian_cysts", label: "Ovarian cysts" },
      { key: "fibroids", label: "Fibroids" },
      { key: "other", label: "Something else" },
    ],
    values: [],
  },
  {
    key: "mri",
    label: "MRI scan",
    short: "MRI",
    findings: [{ key: "other", label: "Abnormal finding (describe below)" }],
    values: [],
    bodyPart: true,
  },
  {
    key: "cystoscopy",
    label: "Cystoscopy (camera into the bladder)",
    short: "Cystoscopy",
    findings: [
      { key: "inflammation", label: "Inflammation" },
      { key: "trabeculation", label: "Trabeculation" },
      { key: "stones", label: "Stones" },
      { key: "lesion", label: "Lesion or growth" },
      { key: "other", label: "Something else" },
    ],
    values: [],
  },
  {
    key: "laparoscopy",
    label: "Laparoscopy (keyhole look inside)",
    short: "Laparoscopy",
    findings: [
      { key: "endometriosis", label: "Endometriosis" },
      { key: "adhesions", label: "Adhesions" },
      { key: "other", label: "Something else" },
    ],
    values: [],
  },
  {
    key: "other",
    label: "Another test or scan",
    short: "Other",
    findings: [{ key: "other", label: "Abnormal finding (describe below)" }],
    values: [],
  },
];

export const INVESTIGATION_KEYS = INVESTIGATION_KINDS.map((k) => k.key) as [InvestigationKind, ...InvestigationKind[]];

export function investigationKind(key: string): InvestigationKindDef {
  return INVESTIGATION_KINDS.find((k) => k.key === key) ?? INVESTIGATION_KINDS[INVESTIGATION_KINDS.length - 1];
}

export type InvestigationRow = {
  id: string;
  kind: string;
  performed_on: string | null;
  normal: boolean | null;
  findings: string[];
  body_part: string | null;
  values: Record<string, number | string | null>;
  notes: string | null;
  source: string;
  created_at: string;
};

/** What a clinician reads: "USS KUB 12 Aug 2025: Normal, PVR 30 ml". */
export function investigationLine(row: InvestigationRow): { title: string; detail: string } {
  const def = investigationKind(row.kind);
  const title = def.key === "other" && row.notes ? row.notes.split(/[.\n]/)[0].slice(0, 60) : def.key === "mri" && row.body_part ? `MRI ${row.body_part}` : def.short;
  const parts: string[] = [];
  if (row.normal === true) parts.push("Normal");
  else if (row.normal === false) {
    const names = row.findings.map((f) => def.findings.find((o) => o.key === f)?.label ?? f).filter((f) => f !== "Something else" && f !== "Abnormal finding (describe below)");
    parts.push(names.length ? `Abnormal: ${names.join(", ").toLowerCase()}` : "Abnormal");
  }
  for (const v of def.values) {
    const value = row.values?.[v.key];
    if (value !== null && value !== undefined && value !== "") parts.push(`${v.label === "eGFR" ? "eGFR" : v.key === "pvr_ml" ? "PVR" : v.label} ${value}${v.unit === "ml" || v.unit === "mL/min" ? " " + v.unit : " " + v.unit}`);
  }
  if (def.key !== "other" && row.notes) parts.push(row.notes.length > 80 ? `${row.notes.slice(0, 77)}...` : row.notes);
  return { title, detail: parts.join(" · ") };
}

// --------------------------------------------------------- derived summary

export type PassportProfileFields = {
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  local_hospital: string | null;
  nhs_number: string | null;
  first_uti_onset: string | null;
  first_uti_year: number | null;
  lifetime_utis: number | null;
  medical_history: string[];
  medical_history_other: string | null;
  allergies: Allergy[];
};

export type AntibioticHistoryRow = {
  antibiotic_id: string;
  name: string;
  courses: number;
  worked: number;
  partly: number;
  failed: number;
  lastUsed: string | null;
  reactions: string[];
  /** Also in the allergy list on the profile. */
  allergy: boolean;
};

type TreatmentDetail = TreatmentRow & { reaction?: string | null };

/**
 * Every antibiotic ever logged, with how often the patient said it worked
 * and any reaction, newest use first. The lab's view (sensitive or resistant)
 * joins this in phase 2.
 */
export function antibioticHistory(treatments: TreatmentDetail[], allergies: Allergy[]): AntibioticHistoryRow[] {
  const map = new Map<string, AntibioticHistoryRow>();
  for (const t of treatments) {
    const id = t.antibiotic_id === "other" ? `other:${(t.other_name ?? "").trim().toLowerCase()}` : t.antibiotic_id;
    const row = map.get(id) ?? {
      antibiotic_id: t.antibiotic_id,
      name: antibioticName(t.antibiotic_id, t.other_name),
      courses: 0,
      worked: 0,
      partly: 0,
      failed: 0,
      lastUsed: null,
      reactions: [],
      allergy: allergies.some((a) => a.antibiotic_id === t.antibiotic_id && (t.antibiotic_id !== "other" || (a.other_name ?? "").trim().toLowerCase() === (t.other_name ?? "").trim().toLowerCase())),
    };
    row.courses += 1;
    if (t.worked === "yes") row.worked += 1;
    else if (t.worked === "partly") row.partly += 1;
    else if (t.worked === "no") row.failed += 1;
    if (t.started_on && (!row.lastUsed || t.started_on > row.lastUsed)) row.lastUsed = t.started_on;
    if (t.reaction?.trim()) row.reactions.push(t.reaction.trim());
    map.set(id, row);
  }
  return [...map.values()].sort((a, b) => (a.lastUsed ?? "") < (b.lastUsed ?? "") ? 1 : -1);
}

export type PreventionDetailRow = PreventionLike & {
  started_on: string | null;
  stopped_on: string | null;
  helping: string | null;
  product?: string | null;
  dose?: string | null;
  frequency?: string | null;
  course_weeks?: number | null;
  completed?: boolean | null;
};

/** "Vaginal oestrogen (Vagifem) twice a week, since 3 Feb 2026". */
export function prophylaxisLine(p: PreventionDetailRow): string {
  const detail = PREVENTION_DETAIL[p.option_key];
  const bits: string[] = [preventionShortName(p)];
  if (p.product && detail?.product && p.product !== "other") {
    bits.push(detail.product.find((o) => o.key === p.product)?.label ?? p.product);
  }
  if (p.dose) bits.push(p.dose);
  if (p.frequency) bits.push((FREQUENCIES.find((f) => f.key === p.frequency)?.label ?? p.frequency).toLowerCase());
  if (p.course_weeks) bits.push(`${p.course_weeks}-week course${p.completed ? ", completed" : p.completed === false ? ", not completed" : ""}`);
  const when = p.stopped_on ? `${p.started_on ? formatDay(p.started_on) : "unknown"} to ${formatDay(p.stopped_on)}` : p.started_on ? `since ${formatDay(p.started_on)}` : "";
  return [bits.join(" "), when].filter(Boolean).join(", ");
}

export type TimelineEvent = {
  on: string;
  kind: "uti" | "treatment" | "test" | "investigation" | "prevention_started" | "prevention_stopped";
  title: string;
  detail?: string;
  href?: string;
};

type TestLike = { episode_id: string; kind: string; tested_on: string | null; result: string | null; kit_id: string | null };

/** Everything on one dated line, newest first. */
export function timeline(
  episodes: EpisodeRow[],
  treatments: (TreatmentDetail & { id: string })[],
  tests: TestLike[],
  investigations: InvestigationRow[],
  preventions: PreventionDetailRow[],
  labels: { testKind: (k: string) => string; testResult: (r: string | null) => string }
): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  for (const e of episodes) {
    out.push({ on: e.started_on, kind: "uti", title: "UTI started", detail: e.ended_on ? `Ended ${formatDay(e.ended_on)}` : "Ongoing", href: `/portal/passport/episodes/${e.id}` });
  }
  for (const t of treatments) {
    const on = t.started_on ?? episodes.find((e) => e.id === t.episode_id)?.started_on;
    if (!on) continue;
    out.push({
      on,
      kind: "treatment",
      title: antibioticName(t.antibiotic_id, t.other_name),
      detail: [t.days && `${t.days} days`, t.worked && `worked: ${t.worked}`].filter(Boolean).join(" · "),
      href: `/portal/passport/episodes/${t.episode_id}`,
    });
  }
  for (const t of tests) {
    const on = t.tested_on ?? episodes.find((e) => e.id === t.episode_id)?.started_on;
    if (!on) continue;
    out.push({ on, kind: "test", title: labels.testKind(t.kind), detail: t.kit_id ? "Utee test" : labels.testResult(t.result), href: `/portal/passport/episodes/${t.episode_id}` });
  }
  for (const i of investigations) {
    if (!i.performed_on) continue;
    const line = investigationLine(i);
    out.push({ on: i.performed_on, kind: "investigation", title: line.title, detail: line.detail, href: "/portal/passport/investigations" });
  }
  for (const p of preventions) {
    if (p.started_on) out.push({ on: p.started_on, kind: "prevention_started", title: `Started ${preventionName(p)}`, href: "/portal/passport/prevention" });
    if (p.stopped_on) out.push({ on: p.stopped_on, kind: "prevention_stopped", title: `Stopped ${preventionName(p)}`, href: "/portal/passport/prevention" });
  }
  return out.sort((a, b) => (a.on < b.on ? 1 : a.on > b.on ? -1 : 0));
}

/** The at-a-glance card and the first page of the passport. */
export type PassportGlance = {
  utis6m: number;
  utis12m: number;
  lifetime: number | null;
  activeProphylaxis: string[];
  lastInvestigation: { title: string; detail: string; on: string } | null;
  investigationCount: number;
  allergies: string[];
  medicalHistory: string[];
};

export function passportGlance(
  counts: { utis6m: number; utis12m: number },
  profile: Partial<PassportProfileFields> | null,
  preventions: PreventionDetailRow[],
  investigations: InvestigationRow[]
): PassportGlance {
  const active = preventions.filter((p) => !p.stopped_on);
  const dated = investigations.filter((i) => i.performed_on).sort((a, b) => (a.performed_on! < b.performed_on! ? 1 : -1));
  const last = dated[0] ?? null;
  const historyLabels = (profile?.medical_history ?? []).map((k) => (k === "other" ? profile?.medical_history_other?.trim() || "" : MEDICAL_HISTORY.find((o) => o.key === k)?.label ?? k)).filter(Boolean);
  return {
    utis6m: counts.utis6m,
    utis12m: counts.utis12m,
    lifetime: profile?.lifetime_utis ?? null,
    activeProphylaxis: active.map(prophylaxisLine),
    lastInvestigation: last ? { ...investigationLine(last), on: last.performed_on! } : null,
    investigationCount: investigations.length,
    allergies: (profile?.allergies ?? []).map((a) => [antibioticName(a.antibiotic_id, a.other_name), a.reaction?.trim()].filter(Boolean).join(": ")),
    medicalHistory: historyLabels,
  };
}

export function firstUtiText(profile: Partial<PassportProfileFields> | null): string | null {
  if (!profile?.first_uti_onset) return null;
  const onset = FIRST_UTI_ONSET.find((o) => o.key === profile.first_uti_onset)?.label ?? profile.first_uti_onset;
  return profile.first_uti_year ? `${onset}, around ${profile.first_uti_year}` : onset;
}

/** Normalises an NHS number to the 3-3-4 form, or null when it is not ten digits. */
export function formatNhsNumber(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length !== 10) return null;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}
