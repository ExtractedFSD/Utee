/**
 * The Lodestar UTI Test sheet (Llusern Scientific), as the lab fills it in:
 * six uropathogens ticked if positive (more than one is common), plus the
 * controls that say whether the run can be trusted at all.
 */
export const UROPATHOGENS = [
  { key: "e_coli", label: "E. coli", formal: "Escherichia coli" },
  { key: "enterococcus", label: "Enterococcus", formal: "Enterococcus" },
  { key: "staph_saprophyticus", label: "Staph. saprophyticus", formal: "Staphylococcus saprophyticus" },
  { key: "proteus_mirabilis", label: "Proteus mirabilis", formal: "Proteus mirabilis" },
  { key: "pseudomonas_aeruginosa", label: "Pseudomonas aeruginosa", formal: "Pseudomonas aeruginosa" },
  { key: "klebsiella_pneumoniae", label: "Klebsiella pneumoniae", formal: "Klebsiella pneumoniae" },
] as const;

export type UropathogenKey = (typeof UROPATHOGENS)[number]["key"];

export const ORGANISM_LABELS: Record<string, string> = Object.fromEntries(UROPATHOGENS.map((u) => [u.key, u.formal]));

export type Controls = {
  /** Positive control passed (green). Must be ticked for a valid result. */
  positive: boolean;
  /** Negative control passed (green). Must be ticked for a valid result; red means the test failed. */
  negative: boolean;
  /** The analyser reported an error: the run is invalid. */
  error: boolean;
};

export type SheetReading = {
  organisms: UropathogenKey[];
  controls: Controls;
};

export type SheetVerdict =
  | { valid: true; outcome: "positive" | "negative" }
  | { valid: false; outcome: "inconclusive"; reasons: string[] };

/** What the controls say about the run, and the outcome when it is sound. */
export function judgeSheet(reading: SheetReading): SheetVerdict {
  const reasons: string[] = [];
  if (!reading.controls.positive) reasons.push("Positive control did not pass");
  if (!reading.controls.negative) reasons.push("Negative control did not pass");
  if (reading.controls.error) reasons.push("Error reported by the analyser");
  if (reasons.length) return { valid: false, outcome: "inconclusive", reasons };
  return { valid: true, outcome: reading.organisms.length ? "positive" : "negative" };
}

export function organismNames(keys: readonly string[]): string[] {
  return keys.map((k) => ORGANISM_LABELS[k] ?? k);
}

/** How many invalid runs the lab absorbs before the kit is parked as a problem. */
export const FAILED_RUNS_BEFORE_ISSUE = 2;

/** What can be wrong with a sample when the bag is opened. */
export const SAMPLE_FAULTS = [
  { key: "leaked_tube", label: "Sample tube has leaked" },
  { key: "no_sample", label: "Tube has no sample in it" },
  { key: "damaged_tube", label: "Sample tube is damaged" },
  { key: "damaged_packaging", label: "Packaging is damaged" },
  { key: "other", label: "Something else (describe below)" },
] as const;

export type SampleFaultKey = (typeof SAMPLE_FAULTS)[number]["key"];

export const SAMPLE_FAULT_LABELS: Record<string, string> = Object.fromEntries(SAMPLE_FAULTS.map((f) => [f.key, f.label]));
