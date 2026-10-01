/**
 * The Lodestar Rapid Culture Test sheet (Llusern Scientific), as the lab
 * fills it in: six uropathogens ticked if positive, plus three controls that
 * say whether the run can be trusted at all.
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
  /** Confirms the test performed correctly. Must be ticked. */
  positive: boolean;
  /** Ticked means the negative control reacted: the run is invalid. */
  negative: boolean;
  /** The device reported an error: the run is invalid. */
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
  if (!reading.controls.positive) reasons.push("Positive control not confirmed, so the test may not have run correctly");
  if (reading.controls.negative) reasons.push("Negative control reacted");
  if (reading.controls.error) reasons.push("Error reported by the device");
  if (reasons.length) return { valid: false, outcome: "inconclusive", reasons };
  return { valid: true, outcome: reading.organisms.length ? "positive" : "negative" };
}

export function organismNames(keys: readonly string[]): string[] {
  return keys.map((k) => ORGANISM_LABELS[k] ?? k);
}
