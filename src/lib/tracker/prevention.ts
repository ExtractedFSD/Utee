import type { Option } from "./options";
import { antibioticName } from "./search";

/*
 * Things people take or do to help prevent UTIs. Grouped only so they are
 * quick to find; the groups and the list carry no recommendation. Keys are
 * stored, labels are shown. Brand names appear where that is how people
 * know the thing.
 */
export type PreventionOption = Option & { short?: string };
export type PreventionGroup = { key: string; label: string; tone: string; options: PreventionOption[] };

export const PREVENTION_GROUPS: PreventionGroup[] = [
  {
    key: "medicine",
    label: "Prescribed medicines",
    tone: "brand",
    options: [
      { key: "low_dose_antibiotic", label: "Low-dose daily antibiotic", short: "Low-dose antibiotic" },
      { key: "post_sex_antibiotic", label: "Single antibiotic dose after sex", short: "Antibiotic after sex" },
      { key: "standby_antibiotic", label: "Standby antibiotics kept at home", short: "Standby antibiotics" },
      { key: "methenamine", label: "Methenamine hippurate (Hiprex)", short: "Methenamine (Hiprex)" },
      { key: "bladder_instillation", label: "Bladder instillations (e.g. iAluRil)", short: "Bladder instillations" },
    ],
  },
  {
    key: "hormonal",
    label: "Hormonal",
    tone: "lavender",
    options: [
      { key: "vaginal_oestrogen", label: "Vaginal oestrogen (cream, pessary or ring)", short: "Vaginal oestrogen" },
      { key: "hrt", label: "HRT" },
      { key: "contraception_change", label: "Changed contraception", short: "Changed contraception" },
    ],
  },
  {
    key: "vaccine",
    label: "Vaccines and immunotherapy",
    tone: "green",
    options: [
      { key: "uromune", label: "Uromune (MV140) spray", short: "Uromune spray" },
      { key: "urovaxom", label: "Uro-Vaxom (OM-89) capsules", short: "Uro-Vaxom" },
      { key: "other_vaccine", label: "Another UTI vaccine", short: "UTI vaccine" },
    ],
  },
  {
    key: "supplement",
    label: "Supplements",
    tone: "amber",
    options: [
      { key: "d_mannose", label: "D-mannose" },
      { key: "cranberry", label: "Cranberry (juice, tablets or capsules)", short: "Cranberry" },
      { key: "probiotics", label: "Probiotics" },
      { key: "vitamin_c", label: "Vitamin C" },
      { key: "uva_ursi", label: "Uva ursi" },
      { key: "hyaluronic", label: "Hyaluronic acid or chondroitin", short: "Hyaluronic acid" },
      { key: "oregano_garlic", label: "Oregano oil or garlic", short: "Oregano or garlic" },
    ],
  },
  {
    key: "topical",
    label: "Creams, sprays and washes",
    tone: "red",
    options: [
      { key: "p_happi", label: "P Happi spray", short: "P Happi" },
      { key: "vaginal_moisturiser", label: "Vaginal moisturiser" },
      { key: "lubricant", label: "Lubricant during sex", short: "Lubricant" },
      { key: "barrier_cream", label: "Barrier cream" },
      { key: "intimate_wash", label: "pH-balanced intimate wash", short: "Intimate wash" },
    ],
  },
  {
    key: "habit",
    label: "Habits",
    tone: "slate",
    options: [
      { key: "water", label: "Drinking more water", short: "More water" },
      { key: "pee_after_sex", label: "Peeing after sex" },
      { key: "front_to_back", label: "Wiping front to back" },
      { key: "no_holding", label: "Not holding on when I need to pee", short: "Not holding on" },
      { key: "double_void", label: "Emptying my bladder fully", short: "Emptying fully" },
      { key: "showers", label: "Showers instead of baths", short: "Showers not baths" },
      { key: "cotton_underwear", label: "Cotton underwear", short: "Cotton underwear" },
      { key: "no_perfumed", label: "Avoiding perfumed products", short: "No perfumed products" },
      { key: "constipation", label: "Managing constipation", short: "Managing constipation" },
      { key: "pelvic_physio", label: "Pelvic floor physio", short: "Pelvic floor physio" },
      { key: "bladder_training", label: "Bladder training" },
    ],
  },
];

export const PREVENTION_OTHER: Option = { key: "other", label: "Other (type the name)" };

/** Options where it is useful to know which antibiotic. */
export const ANTIBIOTIC_PREVENTIONS = ["low_dose_antibiotic", "post_sex_antibiotic", "standby_antibiotic"];

export const HELPING: Option[] = [
  { key: "yes", label: "Yes" },
  { key: "not_sure", label: "Not sure" },
  { key: "no", label: "No" },
];

export const PREVENTION_KEYS: string[] = [...PREVENTION_GROUPS.flatMap((g) => g.options.map((o) => o.key)), PREVENTION_OTHER.key];

export function preventionGroup(key: string): PreventionGroup | null {
  return PREVENTION_GROUPS.find((g) => g.options.some((o) => o.key === key)) ?? null;
}

export type PreventionLike = { option_key: string; other_name: string | null; antibiotic_id: string | null };

/** Display name: the option label, the typed name for "other", and the antibiotic where one was chosen. */
export function preventionName(p: PreventionLike): string {
  if (p.option_key === PREVENTION_OTHER.key) return p.other_name?.trim() || "Other";
  const label = PREVENTION_GROUPS.flatMap((g) => g.options).find((o) => o.key === p.option_key)?.label ?? p.option_key;
  if (ANTIBIOTIC_PREVENTIONS.includes(p.option_key) && p.antibiotic_id) {
    return `${label}: ${antibioticName(p.antibiotic_id, p.other_name)}`;
  }
  return label;
}

/** Short name for pills and tight spaces; the antibiotic where one was chosen. */
export function preventionShortName(p: PreventionLike): string {
  if (p.option_key === PREVENTION_OTHER.key) return p.other_name?.trim() || "Other";
  const o = PREVENTION_GROUPS.flatMap((g) => g.options).find((x) => x.key === p.option_key);
  const label = o?.short ?? o?.label ?? p.option_key;
  if (ANTIBIOTIC_PREVENTIONS.includes(p.option_key) && p.antibiotic_id) return `${label}: ${antibioticName(p.antibiotic_id, p.other_name)}`;
  return label;
}

/** What to insert and what to stop when someone re-picks their list. */
export function diffPreventions(activeKeys: string[], chosenKeys: string[]): { add: string[]; stop: string[] } {
  const active = new Set(activeKeys);
  const chosen = new Set(chosenKeys.filter((k) => PREVENTION_KEYS.includes(k)));
  return {
    add: [...chosen].filter((k) => !active.has(k)),
    stop: [...active].filter((k) => !chosen.has(k)),
  };
}
