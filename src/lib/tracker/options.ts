/**
 * Fixed option lists for the tracker. Keys are what gets stored; labels are
 * what the user sees. Keep clinical-sounding wording in copy.ts.
 */
export type Option = { key: string; label: string };

export const SYMPTOMS: Option[] = [
  { key: "burning", label: "Burning or stinging when peeing" },
  { key: "frequency", label: "Needing to pee more often" },
  { key: "urgency", label: "Sudden urgent need to pee" },
  { key: "cloudy", label: "Cloudy urine" },
  { key: "smelly", label: "Strong-smelling urine" },
  { key: "blood", label: "Blood in urine" },
  { key: "lower_tummy_pain", label: "Pain low in the tummy" },
  { key: "back_side_pain", label: "Pain in the back or side" },
  { key: "fever_chills", label: "High temperature, shivering or chills" },
  { key: "nausea_vomiting", label: "Feeling sick or being sick" },
  { key: "confusion_tired", label: "Feeling confused or unusually tired" },
  { key: "other", label: "Other" },
];

export const TRIGGERS: Option[] = [
  { key: "sex", label: "Sex" },
  { key: "dehydration", label: "Not drinking enough" },
  { key: "holding_pee", label: "Holding in pee" },
  { key: "period_cycle", label: "Period or point in cycle" },
  { key: "new_contraception", label: "New contraception" },
  { key: "menopause", label: "Menopause-related changes" },
  { key: "swimming_hot_bath", label: "Swimming or a hot bath" },
  { key: "constipation", label: "Constipation" },
  { key: "recent_antibiotics", label: "Recently had antibiotics for something else" },
  { key: "dont_know", label: "Don't know" },
  { key: "other", label: "Other" },
];

export const COURSE_TYPES: Option[] = [
  { key: "treatment", label: "Treatment course" },
  { key: "preventive_daily", label: "Daily low dose to prevent UTIs" },
  { key: "post_sex_single", label: "Single dose after sex" },
  { key: "dont_know", label: "Don't know" },
];

export const COURSE_DAYS = [1, 3, 5, 7, 14];

export const SOURCES: Option[] = [
  { key: "gp", label: "GP" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "private_clinic", label: "Private clinic" },
  { key: "online", label: "Online" },
  { key: "hospital", label: "Hospital" },
  { key: "other", label: "Other" },
];

export const WORKED: Option[] = [
  { key: "yes", label: "Yes" },
  { key: "partly", label: "Partly" },
  { key: "no", label: "No" },
  { key: "too_early", label: "Too early to say" },
];

export const TEST_KINDS: Option[] = [
  { key: "dipstick_home", label: "Dipstick at home" },
  { key: "dipstick_gp_pharmacy", label: "Dipstick at GP or pharmacy" },
  { key: "lab", label: "Urine sent to a lab" },
  { key: "utee", label: "Utee test" },
];

export const TEST_RESULTS: Option[] = [
  { key: "positive", label: "Positive" },
  { key: "negative", label: "Negative" },
  { key: "waiting", label: "Waiting" },
  { key: "dont_know", label: "Don't know" },
];

export const AGE_BANDS: Option[] = [
  { key: "18_24", label: "18 to 24" },
  { key: "25_34", label: "25 to 34" },
  { key: "35_44", label: "35 to 44" },
  { key: "45_54", label: "45 to 54" },
  { key: "55_64", label: "55 to 64" },
  { key: "65_plus", label: "65 or over" },
  { key: "prefer_not", label: "Prefer not to say" },
];

export const MENOPAUSE_STAGES: Option[] = [
  { key: "not_yet", label: "Not yet" },
  { key: "around", label: "Around menopause" },
  { key: "after", label: "After menopause" },
  { key: "prefer_not", label: "Prefer not to say" },
];

export const CONTRACEPTION: Option[] = [
  { key: "none", label: "None" },
  { key: "pill", label: "Pill" },
  { key: "coil_hormonal", label: "Hormonal coil" },
  { key: "coil_copper", label: "Copper coil" },
  { key: "implant", label: "Implant" },
  { key: "injection", label: "Injection" },
  { key: "patch_ring", label: "Patch or ring" },
  { key: "condoms", label: "Condoms" },
  { key: "other", label: "Other" },
  { key: "prefer_not", label: "Prefer not to say" },
];

export const PREGNANT: Option[] = [
  { key: "no", label: "No" },
  { key: "yes", label: "Yes" },
  { key: "prefer_not", label: "Prefer not to say" },
];

export const FEELINGS: Option[] = [
  { key: "1", label: "Awful" },
  { key: "2", label: "Bad" },
  { key: "3", label: "OK" },
  { key: "4", label: "Good" },
  { key: "5", label: "Great" },
];

export function labelFor(list: Option[], key: string | null | undefined): string {
  if (!key) return "";
  return list.find((o) => o.key === key)?.label ?? key;
}
