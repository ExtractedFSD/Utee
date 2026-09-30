/**
 * The questionnaire a patient answers before taking a sample. One place for
 * the questions and their wording so the form, the clinic view and the
 * patient's own record all agree.
 *
 * Section D: safety check. Any "yes" is a possible sign of a more serious
 *            infection, so the form signposts urgent care before going on.
 * Section A: how often UTI symptoms happen.
 * Section C: each symptom scored 0 (none) to 10 (as bad as it could be).
 * Section B: change over the past 24 hours, -5 (very much worse) to +5.
 * Then the questions the form already asked: duration, previous UTI,
 * pregnancy, current antibiotics, notes, consent.
 */

export const SAFETY_QUESTIONS = [
  { key: "d1", label: "Do you have a high temperature (38°C or above) or feel abnormally cold?" },
  { key: "d2", label: "Have you been experiencing severe chills or uncontrollable shivering fits?" },
  { key: "d3", label: "Do you feel dizzy, faint, or notice your heart racing?" },
  { key: "d4", label: "Does your skin look unusually pale, mottled or grey?" },
  { key: "d5", label: "Have you been vomiting, or are you feeling too nauseous to keep fluids down?" },
  { key: "d6", label: "Have you (or the person you are caring for) become newly confused, unusually drowsy, or agitated?" },
  { key: "d7", label: "Can you see visible blood or blood clots in your urine?" },
  { key: "d8", label: "Have you stopped passing urine entirely, or is the amount a lot less than normal?" },
] as const;

export type SafetyKey = (typeof SAFETY_QUESTIONS)[number]["key"];

export const SYMPTOM_QUESTIONS = [
  { key: "frequency", label: "Needing to urinate more frequently than normal." },
  { key: "urgency", label: "Needing to urinate more urgently or more suddenly than normal." },
  { key: "urge_after", label: "Feeling as though you have the urge to urinate despite having just urinated." },
  { key: "smell", label: "Urine with an unusually strong or unpleasant smell." },
  { key: "cloudy", label: "Cloudy urine." },
  { key: "debris", label: "Debris or floating particles in your urine." },
  { key: "burning", label: "Pain or burning sensation when you are urinating." },
  { key: "burning_after", label: "Pain or burning sensation within the 30 minutes after urinating." },
  { key: "lower_back", label: "Pain or discomfort in your lower back." },
  { key: "flank", label: "Pain or discomfort in your side/flank." },
  { key: "legs", label: "Pain or discomfort radiating down into your legs." },
] as const;

export type SymptomKey = (typeof SYMPTOM_QUESTIONS)[number]["key"];

export const SEVERITY_MIN = 0;
export const SEVERITY_MAX = 10;
export const CHANGE_MIN = -5;
export const CHANGE_MAX = 5;

export const INTRO =
  "A urinary tract infection, or UTI, is an infection in any part of your urinary system. This may include your bladder, urethra, ureters, and/or kidneys. Some people may experience episodes of UTI symptoms with no symptoms in between, while some people may experience UTI symptoms that feel continuous and do not fully subside. This questionnaire asks about your experience of UTI symptoms and pain or discomfort.";

export const HISTORY_INTRO =
  "The following questions are about how often you experience UTI symptoms. Please consider UTIs that may or may not have been medically diagnosed.";

export const HISTORY = {
  continuous: "Have you had UTI symptoms that feel continuous and do not fully subside for at least the past 3 months?",
  episodes6m: "Approximately how many episodes of UTI symptoms have you had in the past 6 months?",
  episodes12m: "Approximately how many episodes of UTI symptoms have you had in the past 12 months?",
} as const;

export const CHANGE_QUESTION =
  "Please consider how you typically experience UTI symptoms. To what extent have your UTI symptoms over the past 24 hours been better or worse than your typical experience?";

/** Labels for every symptom key ever saved, so old submissions still read. */
export const SYMPTOM_LABELS: Record<string, string> = {
  ...Object.fromEntries(SYMPTOM_QUESTIONS.map((q) => [q.key, q.label])),
  lower_abdominal_pain: "Lower abdominal pain",
  blood_in_urine: "Blood in urine",
  cloudy_or_smelly: "Cloudy or strong-smelling urine",
  fever: "Fever or chills",
  back_pain: "Back or side (flank) pain",
  nausea: "Nausea or vomiting",
};

export const SAFETY_LABELS: Record<string, string> = Object.fromEntries(
  SAFETY_QUESTIONS.map((q) => [q.key, q.label])
);

export type YesNo = "yes" | "no";

/** What the form saves into triage_submissions.symptoms (version 2). */
export type TriageAnswers = {
  version: 2;
  safety: Record<SafetyKey, YesNo>;
  /** Safety questions answered "yes", in question order. Empty when none. */
  safetyFlags: SafetyKey[];
  history: {
    continuous: YesNo;
    episodes6m: number | null;
    episodes12m: number | null;
  };
  severity: Record<SymptomKey, number>;
  change24h: number;
  /** Symptoms scored above 0, kept so older views that list symptoms still work. */
  selected: SymptomKey[];
  duration: string;
  previousUti: string;
  pregnant: string;
  currentAntibiotics: string;
  notes: string;
};

/** Older submissions (before the sections) had just these fields. */
export type LegacyTriageAnswers = {
  version?: undefined;
  selected?: string[];
  duration?: string;
  previousUti?: string;
  pregnant?: string;
  currentAntibiotics?: string;
  notes?: string;
};

export type StoredTriage = TriageAnswers | LegacyTriageAnswers;

export function isVersioned(answers: StoredTriage | null | undefined): answers is TriageAnswers {
  return !!answers && answers.version === 2;
}

export function safetyFlagsIn(safety: Partial<Record<string, string>>): SafetyKey[] {
  return SAFETY_QUESTIONS.filter((q) => safety[q.key] === "yes").map((q) => q.key);
}

export function selectedFrom(severity: Partial<Record<string, number>>): SymptomKey[] {
  return SYMPTOM_QUESTIONS.filter((q) => (severity[q.key] ?? 0) > 0).map((q) => q.key);
}

export function changeLabel(value: number): string {
  if (value <= -4) return "Very much worse";
  if (value < 0) return "Worse";
  if (value === 0) return "No change";
  if (value < 4) return "Better";
  return "Very much better";
}

/** Optional research consent on the questionnaire, worded like the tracker's. */
export const RESEARCH = {
  title: "Optional: help other women with UTIs",
  text: "I also consent to Utee using my answers and my test result, with anything that could identify me removed, in combined figures for research and reporting. Recurrent UTIs are under-researched, and most of what is known comes from a handful of small studies. Real records of symptoms matched to real test results are what change that. Combined with others', mine could help improve testing, treatment and care for women like me. This is optional and does not affect my test.",
  label: "Yes, use my anonymised answers and result to help research that could improve care for women with UTIs (optional)",
} as const;
