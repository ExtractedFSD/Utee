import type { Option } from "./options";
import { antibioticName } from "./search";

/*
 * Things people take or do to help prevent UTIs. Grouped only so they are
 * quick to find; the groups and the list carry no recommendation. Keys are
 * stored, labels are shown. Brand names appear where that is how people
 * know the thing.
 */
export type PreventionOption = Option & { short?: string; aliases?: string[] };
export type PreventionGroup = { key: string; label: string; tone: string; options: PreventionOption[] };

export const PREVENTION_GROUPS: PreventionGroup[] = [
  {
    key: "medicine",
    label: "Prescribed medicines",
    tone: "brand",
    options: [
      { key: "low_dose_antibiotic", label: "Low-dose daily antibiotic", short: "Low-dose antibiotic", aliases: ["prophylactic", "prophylaxis", "trimethoprim", "nitrofurantoin", "daily antibiotic"] },
      { key: "post_sex_antibiotic", label: "Single antibiotic dose after sex", short: "Antibiotic after sex", aliases: ["after sex", "post coital", "intercourse"] },
      { key: "standby_antibiotic", label: "Standby antibiotics kept at home", short: "Standby antibiotics", aliases: ["rescue pack", "emergency antibiotics", "back up"] },
      { key: "methenamine", label: "Methenamine hippurate (Hiprex)", short: "Methenamine (Hiprex)", aliases: ["hiprex", "hexamine"] },
      { key: "bladder_instillation", label: "Bladder instillations (e.g. iAluRil)", short: "Bladder instillations", aliases: ["ialuril", "hyacyst", "gepan", "cystistat", "instillations"] },
    ],
  },
  {
    key: "hormonal",
    label: "Hormonal",
    tone: "lavender",
    options: [
      { key: "vaginal_oestrogen", label: "Vaginal oestrogen (cream, pessary or ring)", short: "Vaginal oestrogen", aliases: ["estrogen", "vagifem", "estriol", "ovestin", "imvaggis", "gina", "vagirux", "blissel", "pessary", "cream", "ring", "estring"] },
      { key: "hrt", label: "HRT", aliases: ["hormone replacement", "patches", "gel"] },
      { key: "contraception_change", label: "Changed contraception", short: "Changed contraception", aliases: ["pill", "coil", "spermicide", "diaphragm"] },
    ],
  },
  {
    key: "vaccine",
    label: "Vaccines and immunotherapy",
    tone: "green",
    options: [
      { key: "uromune", label: "Uromune (MV140) spray", short: "Uromune spray", aliases: ["mv140", "spray", "vaccine", "sublingual"] },
      { key: "urovaxom", label: "Uro-Vaxom (OM-89) capsules", short: "Uro-Vaxom", aliases: ["om-89", "om89", "vaccine", "capsules"] },
      { key: "other_vaccine", label: "Another UTI vaccine", short: "UTI vaccine", aliases: ["vaccine", "immunotherapy", "strovac"] },
    ],
  },
  {
    key: "supplement",
    label: "Supplements",
    tone: "amber",
    options: [
      { key: "d_mannose", label: "D-mannose", aliases: ["mannose", "sachets", "powder", "d mannose"] },
      { key: "cranberry", label: "Cranberry (juice, tablets or capsules)", short: "Cranberry", aliases: ["juice", "tablets", "capsules", "extract", "pacs"] },
      { key: "probiotics", label: "Probiotics", aliases: ["lactobacillus", "probiotic", "optibac", "gut"] },
      { key: "vitamin_c", label: "Vitamin C", aliases: ["ascorbic acid", "vit c"] },
      { key: "uva_ursi", label: "Uva ursi", aliases: ["bearberry"] },
      { key: "hyaluronic", label: "Hyaluronic acid or chondroitin", short: "Hyaluronic acid", aliases: ["chondroitin", "hyaluronic acid", "glucosamine"] },
      { key: "oregano_garlic", label: "Oregano oil or garlic", short: "Oregano or garlic", aliases: ["oregano oil", "garlic", "allicin"] },
    ],
  },
  {
    key: "topical",
    label: "Creams, sprays and washes",
    tone: "red",
    options: [
      { key: "p_happi", label: "P Happi spray", short: "P Happi", aliases: ["phappi", "p-happi", "spray"] },
      { key: "vaginal_moisturiser", label: "Vaginal moisturiser", aliases: ["moisturiser", "moisturizer", "replens", "hyalofemme", "yes vm", "sylk", "dryness"] },
      { key: "lubricant", label: "Lubricant during sex", short: "Lubricant", aliases: ["lube", "yes", "sylk"] },
      { key: "barrier_cream", label: "Barrier cream", aliases: ["sudocrem", "bepanthen", "zinc"] },
      { key: "intimate_wash", label: "pH-balanced intimate wash", short: "Intimate wash", aliases: ["femfresh", "wash", "ph balanced", "unscented"] },
    ],
  },
];

export const PREVENTION_OTHER: Option = { key: "other", label: "Other (type the name)" };

/** Options no longer offered, kept so rows saved under them still read well. */
export const RETIRED_OPTIONS: Option[] = [
  { key: "water", label: "Drinking more water" },
  { key: "pee_after_sex", label: "Peeing after sex" },
  { key: "front_to_back", label: "Wiping front to back" },
  { key: "no_holding", label: "Not holding on when I need to pee" },
  { key: "double_void", label: "Emptying my bladder fully" },
  { key: "showers", label: "Showers instead of baths" },
  { key: "cotton_underwear", label: "Cotton underwear" },
  { key: "no_perfumed", label: "Avoiding perfumed products" },
  { key: "constipation", label: "Managing constipation" },
  { key: "pelvic_physio", label: "Pelvic floor physio" },
  { key: "bladder_training", label: "Bladder training" },
];

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
  const label = [...PREVENTION_GROUPS.flatMap((g) => g.options), ...RETIRED_OPTIONS].find((o) => o.key === p.option_key)?.label ?? p.option_key;
  if (ANTIBIOTIC_PREVENTIONS.includes(p.option_key) && p.antibiotic_id) {
    return `${label}: ${antibioticName(p.antibiotic_id, p.other_name)}`;
  }
  return label;
}

/** Short name for pills and tight spaces; the antibiotic where one was chosen. */
export function preventionShortName(p: PreventionLike): string {
  if (p.option_key === PREVENTION_OTHER.key) return p.other_name?.trim() || "Other";
  const o = [...PREVENTION_GROUPS.flatMap((g) => g.options), ...RETIRED_OPTIONS].find((x) => x.key === p.option_key);
  const label = (o as PreventionOption | undefined)?.short ?? o?.label ?? p.option_key;
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

/**
 * Search across every option by label, short name and the names people use
 * (brands, spellings). Word-start matches rank first.
 */
export function searchPreventions(query: string): (PreventionOption & { group: PreventionGroup })[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { o: PreventionOption & { group: PreventionGroup }; score: number }[] = [];
  for (const g of PREVENTION_GROUPS) {
    for (const o of g.options) {
      const texts = [o.label, o.short ?? "", ...(o.aliases ?? []), g.label].map((t) => t.toLowerCase());
      let score = 0;
      for (const t of texts) {
        if (t === q) score = Math.max(score, 3);
        else if (t.split(/[\s(),/]+/).some((w) => w.startsWith(q))) score = Math.max(score, 2);
        else if (t.includes(q)) score = Math.max(score, 1);
      }
      if (score) scored.push({ o: { ...o, group: g }, score });
    }
  }
  return scored.sort((a, b) => b.score - a.score).map((x) => x.o);
}
