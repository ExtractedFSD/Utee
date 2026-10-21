import { z } from "zod/v4";
import { CULTURE_METHODS, CULTURE_OUTCOMES, ORGANISMS, type Sir } from "../cultures";
import { ANTIBIOTICS, searchAntibiotics } from "../search";
import { parseDatePhrase } from "./local";
import { isoToday } from "../stats";

/*
 * Reading a culture result into the form, from a sentence or a photographed
 * report. The AI reader and the rule-based fallback share this schema and
 * the person confirms the result before anything is saved.
 */

const sir = z.enum(["S", "I", "R"]);
const antibioticIds = ANTIBIOTICS.map((a) => a.id) as [string, ...string[]];

export const cultureExtractSchema = z.object({
  sample_on: z.string().nullable(),
  method: z.enum(CULTURE_METHODS.map((m) => m.key) as [string, ...string[]]).nullable(),
  outcome: z.enum(CULTURE_OUTCOMES.map((o) => o.key) as [string, ...string[]]).nullable(),
  organisms: z.array(
    z.object({
      key: z.enum(["other", ...ORGANISMS.map((o) => o.key)] as [string, ...string[]]),
      name: z.string().nullable(),
      count: z.string().nullable(),
      sensitivities: z.array(z.object({ antibiotic_id: z.enum(antibioticIds), result: sir })),
    })
  ),
  red_cells: z.number().nullable(),
  white_cells: z.number().nullable(),
  notes: z.string().nullable(),
});
export type CultureExtract = z.infer<typeof cultureExtractSchema>;

export const emptyCulture = (): CultureExtract => ({ sample_on: null, method: null, outcome: null, organisms: [], red_cells: null, white_cells: null, notes: null });

export const CULTURE_PROMPT = `The person is describing one urine culture or advanced urine test result (from a lab report, a letter, or memory). Record only what is stated.
- sample_on: YYYY-MM-DD or null.
- method: ${CULTURE_METHODS.map((m) => `${m.key} = ${m.label}`).join("; ")}. A hospital or GP "culture report" is standard_culture. Null if unclear.
- outcome: ${CULTURE_OUTCOMES.map((o) => `${o.key} = ${o.label}`).join("; ")}. "pathogens" whenever one or more named organisms were found.
- organisms: one entry per organism found. key from: ${ORGANISMS.map((o) => `${o.key} = ${o.name}`).join("; ")}; use "other" with the name for anything else. count as written on the report (for example ">10^8 cfu/L") or null.
- sensitivities: for each organism, every antibiotic on the report with its result: S = sensitive, I = intermediate, R = resistant. antibiotic_id from: ${ANTIBIOTICS.filter((a) => a.id !== "other" && a.id !== "dont_know").map((a) => `${a.id} = ${a.name}`).join("; ")}. On a report with numbered columns (1), 2)) each column is one organism, in the order the organisms are listed. Leave out antibiotics not on the report.
- red_cells, white_cells: microscopy counts as numbers when given (red cells, erythrocytes, haemoglobin; white cells, leucocytes, pus cells). Null otherwise.
- notes: anything else from the report in a few words, or null. Never add advice.`;

const SIR_WORDS: [Sir, RegExp][] = [
  ["R", /\bresistant to\b/i],
  ["I", /\bintermediate (?:to|for)\b/i],
  ["S", /\bsensitive to\b|\bsusceptible to\b/i],
];

function antibioticsIn(fragment: string): string[] {
  const ids: string[] = [];
  for (const piece of fragment.split(/,|\band\b|;|\//i)) {
    const q = piece.trim().replace(/\.$/, "");
    if (!q || q.length < 3) continue;
    const hit = searchAntibiotics(q)[0];
    if (hit && hit.item.id !== "other" && hit.item.id !== "dont_know" && !ids.includes(hit.item.id)) ids.push(hit.item.id);
  }
  return ids;
}

/** Rule-based reader: "E. coli, sensitive to nitrofurantoin and cefalexin, resistant to trimethoprim". */
export function parseCulture(text: string, today = isoToday()): CultureExtract {
  const t = text.trim();
  const lower = t.toLowerCase();
  const out = emptyCulture();
  out.sample_on = parseDatePhrase(t, today);
  for (const m of CULTURE_METHODS) {
    if (m.key !== "other" && m.key !== "standard_culture" && new RegExp(m.label.split(" ")[0], "i").test(t)) out.method = m.key;
  }
  const found = ORGANISMS.filter((o) => o.aliases.some((a) => lower.includes(a)));
  // A named organism with no test named is, nearly always, an NHS culture report.
  if (!out.method && (found.length || /culture|msu|lab|hospital|gp/i.test(t))) out.method = "standard_culture";
  if (/no growth/i.test(t)) out.outcome = "no_growth";
  else if (/no significant growth|nsg\b/i.test(t)) out.outcome = "no_significant_growth";
  else if (/mixed growth/i.test(t)) out.outcome = "mixed_growth";
  else if (found.length) out.outcome = "pathogens";

  // Sensitivities: split on the S/I/R phrases; everything up to the next phrase belongs to that result.
  const sens: { antibiotic_id: string; result: Sir }[] = [];
  const marks: { index: number; result: Sir; length: number }[] = [];
  for (const [result, re] of SIR_WORDS) {
    const g = new RegExp(re.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = g.exec(t))) marks.push({ index: m.index, result, length: m[0].length });
  }
  marks.sort((a, b) => a.index - b.index);
  marks.forEach((mark, i) => {
    const end = marks[i + 1]?.index ?? t.length;
    const fragment = t.slice(mark.index + mark.length, end).replace(/\b(but|and|however|although)\b\s*$/i, "");
    for (const id of antibioticsIn(fragment)) if (!sens.some((s) => s.antibiotic_id === id)) sens.push({ antibiotic_id: id, result: mark.result });
  });

  const count = t.match(/>?\s*10\s*[\^*]\s*\d\s*cfu\s*\/\s*(?:l|ml)/i)?.[0]?.replace(/\s+/g, "") ?? null;
  out.organisms = found.map((o, i) => ({ key: o.key, name: null, count, sensitivities: i === 0 ? sens : [] }));
  out.white_cells = numberNear(t, /(?:white cells?|wbc|leucocytes?|leukocytes?|pus cells?)/i);
  out.red_cells = numberNear(t, /(?:red cells?|rbc|erythrocytes?|haemoglobin|hemoglobin)/i);
  return out;
}

function numberNear(text: string, label: RegExp): number | null {
  const m = text.match(new RegExp(`${label.source}[^\\d]{0,12}(\\d+(?:[.,]\\d+)?)`, "i")) ?? text.match(new RegExp(`(\\d+(?:[.,]\\d+)?)[^\\d]{0,8}${label.source}`, "i"));
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
