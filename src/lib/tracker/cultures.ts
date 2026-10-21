import type { Option } from "./options";
import { antibioticName } from "./search";
import { formatDay } from "./stats";

/*
 * Culture and advanced test results: what a lab found in a sample and which
 * antibiotics it was sensitive or resistant to. The vocabulary here is shared
 * by the form, the photo and sentence readers, the summary and the PDF.
 */

export const CULTURE_METHODS: Option[] = [
  { key: "standard_culture", label: "Standard culture (NHS lab)" },
  { key: "utee", label: "Utee test" },
  { key: "lodestar", label: "Lodestar" },
  { key: "focus_labs", label: "Focus Labs" },
  { key: "tota", label: "Tota" },
  { key: "microgendx", label: "MicrogenDx" },
  { key: "other", label: "Other" },
];

export const CULTURE_OUTCOMES: Option[] = [
  { key: "pathogens", label: "Bacteria found" },
  { key: "mixed_growth", label: "Mixed growth" },
  { key: "no_significant_growth", label: "No significant growth" },
  { key: "no_growth", label: "No growth" },
  { key: "unknown", label: "Not sure" },
];

export type Sir = "S" | "I" | "R";
export const SIR_LABELS: Record<Sir, string> = { S: "Sensitive", I: "Intermediate", R: "Resistant" };
export const SIR_PLAIN: Record<Sir, string> = { S: "should work", I: "may work", R: "did not work in the lab" };

export type OrganismDef = { key: string; name: string; short: string; aliases: string[] };

/** The uropathogens on UK reports, the Lodestar six first (same keys as the lab sheet). */
export const ORGANISMS: OrganismDef[] = [
  { key: "e_coli", name: "Escherichia coli", short: "E. coli", aliases: ["e coli", "e. coli", "ecoli", "escherichia"] },
  { key: "enterococcus", name: "Enterococcus species", short: "Enterococcus", aliases: ["enterococcus", "e. faecalis", "faecalis", "faecium"] },
  { key: "staph_saprophyticus", name: "Staphylococcus saprophyticus", short: "Staph. saprophyticus", aliases: ["saprophyticus", "staph sap"] },
  { key: "proteus_mirabilis", name: "Proteus mirabilis", short: "Proteus", aliases: ["proteus"] },
  { key: "pseudomonas_aeruginosa", name: "Pseudomonas aeruginosa", short: "Pseudomonas", aliases: ["pseudomonas"] },
  { key: "klebsiella_pneumoniae", name: "Klebsiella pneumoniae", short: "Klebsiella pneumoniae", aliases: ["klebsiella pneumoniae", "k. pneumoniae"] },
  { key: "klebsiella_oxytoca", name: "Klebsiella oxytoca", short: "Klebsiella oxytoca", aliases: ["klebsiella oxytoca", "oxytoca"] },
  { key: "strep_agalactiae", name: "Streptococcus agalactiae (Group B strep)", short: "Group B strep", aliases: ["group b strep", "gbs", "agalactiae", "streptococcus agalactiae"] },
  { key: "staph_aureus", name: "Staphylococcus aureus", short: "Staph. aureus", aliases: ["staph aureus", "aureus", "mrsa", "mssa"] },
  { key: "citrobacter", name: "Citrobacter species", short: "Citrobacter", aliases: ["citrobacter"] },
  { key: "enterobacter", name: "Enterobacter species", short: "Enterobacter", aliases: ["enterobacter"] },
  { key: "morganella", name: "Morganella morganii", short: "Morganella", aliases: ["morganella"] },
  { key: "serratia", name: "Serratia species", short: "Serratia", aliases: ["serratia"] },
  { key: "candida", name: "Candida species", short: "Candida", aliases: ["candida", "yeast", "thrush"] },
  { key: "coliform", name: "Coliform (not identified further)", short: "Coliform", aliases: ["coliform", "coliforms"] },
];

export const ORGANISM_KEYS = ORGANISMS.map((o) => o.key);

export function organismDef(key: string): OrganismDef | null {
  return ORGANISMS.find((o) => o.key === key) ?? null;
}

export function organismName(o: { key: string; name?: string | null }): string {
  return organismDef(o.key)?.name ?? o.name?.trim() ?? "Other organism";
}

export function organismShort(o: { key: string; name?: string | null }): string {
  return organismDef(o.key)?.short ?? o.name?.trim() ?? "Other";
}

/** Antibiotics that appear on most UK sensitivity reports, in the order they usually print. */
export const GRID_ANTIBIOTICS = ["amoxicillin", "co_amoxiclav", "nitrofurantoin", "trimethoprim", "cefalexin", "ciprofloxacin", "gentamicin", "fosfomycin", "pivmecillinam"];

export type CultureOrganism = { key: string; name: string | null; count: string | null };
/** sensitivities[organismKey][antibioticId] = S | I | R */
export type Sensitivities = Record<string, Record<string, Sir>>;
export type Microscopy = { red_cells?: number | null; white_cells?: number | null; epithelial?: number | null };

export type CultureRow = {
  id: string;
  episode_id: string | null;
  sample_on: string | null;
  method: string;
  method_other: string | null;
  outcome: string;
  organisms: CultureOrganism[];
  sensitivities: Sensitivities;
  microscopy: Microscopy;
  notes: string | null;
  source: string;
  created_at: string;
};

export function methodLabel(row: Pick<CultureRow, "method" | "method_other">): string {
  if (row.method === "other" && row.method_other) return row.method_other;
  return CULTURE_METHODS.find((m) => m.key === row.method)?.label ?? row.method;
}

/** Antibiotic ids with a result for this organism, grid order first, then the rest. */
export function antibioticsFor(sens: Record<string, Sir> | undefined): string[] {
  const keys = Object.keys(sens ?? {});
  return [...GRID_ANTIBIOTICS.filter((k) => keys.includes(k)), ...keys.filter((k) => !GRID_ANTIBIOTICS.includes(k)).sort()];
}

/** "E. coli: sensitive to nitrofurantoin, cefalexin; resistant to trimethoprim". */
export function sensitivityText(row: CultureRow, organismKey: string): string {
  const sens = row.sensitivities[organismKey] ?? {};
  const byClass: Record<Sir, string[]> = { S: [], I: [], R: [] };
  for (const id of antibioticsFor(sens)) byClass[sens[id]].push(antibioticName(id));
  const parts: string[] = [];
  if (byClass.S.length) parts.push(`sensitive to ${byClass.S.join(", ")}`);
  if (byClass.I.length) parts.push(`intermediate to ${byClass.I.join(", ")}`);
  if (byClass.R.length) parts.push(`resistant to ${byClass.R.join(", ")}`);
  return parts.join("; ");
}

/** One line for lists and the timeline. */
export function cultureLine(row: CultureRow): { title: string; detail: string } {
  const title = row.outcome === "pathogens" && row.organisms.length ? row.organisms.map(organismShort).join(" + ") : CULTURE_OUTCOMES.find((o) => o.key === row.outcome)?.label ?? "Result";
  const details: string[] = [methodLabel(row)];
  if (row.outcome === "pathogens") {
    for (const o of row.organisms) {
      const text = sensitivityText(row, o.key);
      if (text) details.push(`${organismShort(o)}: ${text}`);
    }
  }
  if (row.microscopy.white_cells !== undefined && row.microscopy.white_cells !== null) details.push(`white cells ${row.microscopy.white_cells}`);
  if (row.microscopy.red_cells !== undefined && row.microscopy.red_cells !== null) details.push(`red cells ${row.microscopy.red_cells}`);
  return { title, detail: details.join(" · ") };
}

// --------------------------------------------------------------- summaries

export type OrganismCount = { key: string; name: string; short: string; times: number; lastOn: string | null };
export type ResistanceRow = { antibiotic_id: string; name: string; S: number; I: number; R: number; lastOn: string | null; lastResult: Sir | null };

export type CultureSummary = {
  cultures: number;
  positive: number;
  organisms: OrganismCount[];
  resistance: ResistanceRow[];
};

/** Predominant organisms and the resistance picture across every culture. */
export function cultureSummary(rows: CultureRow[]): CultureSummary {
  const orgs = new Map<string, OrganismCount>();
  const res = new Map<string, ResistanceRow>();
  let positive = 0;
  for (const row of [...rows].sort((a, b) => ((a.sample_on ?? "") < (b.sample_on ?? "") ? -1 : 1))) {
    if (row.outcome === "pathogens" && row.organisms.length) positive += 1;
    for (const o of row.organisms) {
      const k = o.key === "other" ? `other:${(o.name ?? "").trim().toLowerCase()}` : o.key;
      const cur = orgs.get(k) ?? { key: o.key, name: organismName(o), short: organismShort(o), times: 0, lastOn: null };
      cur.times += 1;
      if (row.sample_on && (!cur.lastOn || row.sample_on > cur.lastOn)) cur.lastOn = row.sample_on;
      orgs.set(k, cur);
      for (const [id, sir] of Object.entries(row.sensitivities[o.key] ?? {})) {
        const r = res.get(id) ?? { antibiotic_id: id, name: antibioticName(id), S: 0, I: 0, R: 0, lastOn: null, lastResult: null };
        r[sir] += 1;
        if (!row.sample_on || !r.lastOn || row.sample_on >= r.lastOn) {
          r.lastOn = row.sample_on ?? r.lastOn;
          r.lastResult = sir;
        }
        res.set(id, r);
      }
    }
  }
  return {
    cultures: rows.length,
    positive,
    organisms: [...orgs.values()].sort((a, b) => b.times - a.times || ((a.lastOn ?? "") < (b.lastOn ?? "") ? 1 : -1)),
    resistance: [...res.values()].sort((a, b) => b.R - a.R || b.S - a.S || a.name.localeCompare(b.name)),
  };
}

/** The Lodestar sheet's organism keys are the passport's own, so a Utee result maps straight across. */
export function organismsFromLabSheet(keys: readonly string[]): CultureOrganism[] {
  return keys.filter((k) => ORGANISM_KEYS.includes(k)).map((key) => ({ key, name: null, count: null }));
}

export function formatCultureDate(row: Pick<CultureRow, "sample_on">): string {
  return row.sample_on ? formatDay(row.sample_on) : "date unknown";
}
