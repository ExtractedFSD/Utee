import { z } from "zod/v4";
import { INVESTIGATION_KEYS, INVESTIGATION_KINDS, investigationKind, type InvestigationKind } from "../passport";
import { parseDatePhrase } from "./local";
import { isoToday } from "../stats";

/*
 * Una reads a sentence like "ultrasound in August, all normal, residual 30 ml"
 * into an investigation entry. The AI reader (in extract.ts) and this
 * rule-based fallback share the schema, and the person reviews the result
 * before it is saved.
 */

export const investigationExtractSchema = z.object({
  kind: z.enum(INVESTIGATION_KEYS).nullable(),
  performed_on: z.string().nullable(),
  normal: z.boolean().nullable(),
  findings: z.array(z.string()),
  body_part: z.string().nullable(),
  creatinine: z.number().nullable(),
  egfr: z.number().nullable(),
  pvr_ml: z.number().nullable(),
  notes: z.string().nullable(),
});
export type InvestigationExtract = z.infer<typeof investigationExtractSchema>;

export const emptyInvestigation = (): InvestigationExtract => ({
  kind: null,
  performed_on: null,
  normal: null,
  findings: [],
  body_part: null,
  creatinine: null,
  egfr: null,
  pvr_ml: null,
  notes: null,
});

const KIND_WORDS: [InvestigationKind, RegExp][] = [
  ["cystoscopy", /cystoscop/i],
  ["laparoscopy", /laparoscop|keyhole/i],
  ["mri", /\bmri\b|magnetic resonance/i],
  ["ct_ap", /\bct\b|cat scan|computed tomograph/i],
  ["uss_kub", /ultrasound|\buss\b|\bkub\b|sonograph|scan of (my )?(kidneys?|bladder)/i],
  ["bloods", /blood|creatinine|egfr|kidney function|u&e|renal function/i],
];

const number = (text: string, re: RegExp): number | null => {
  const m = text.match(re);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Rule-based reader used when the AI is off or unavailable. */
export function parseInvestigation(text: string, today = isoToday()): InvestigationExtract {
  const t = text.trim();
  const lower = t.toLowerCase();
  const out = emptyInvestigation();
  for (const [kind, re] of KIND_WORDS) {
    if (re.test(t)) {
      out.kind = kind;
      break;
    }
  }
  if (!out.kind && /scan|test/i.test(t)) out.kind = "other";
  out.performed_on = parseDatePhrase(t, today);

  const abnormalWords = /abnormal|not normal|wasn'?t normal|found|showed|stones?|scarring|hydronephrosis|cysts?|thicken|fibroid|diverticul|inflam|lesion|adhesion|endometriosis/i;
  const normalWords = /\b(all |completely |totally )?(normal|clear|fine|nothing (found|wrong|to report)|no (abnormalit|problem)|unremarkable)\b/i;
  if (abnormalWords.test(t) && !/no stones|no scarring|no cysts|no abnormal/i.test(t)) out.normal = false;
  else if (normalWords.test(t)) out.normal = true;

  if (out.kind) {
    const def = investigationKind(out.kind);
    const findingWords: Record<string, RegExp> = {
      hydronephrosis: /hydronephrosis|swollen kidney/i,
      scarring: /scar/i,
      stones: /stones?/i,
      renal_cysts: /cyst/i,
      bladder_wall: /thick/i,
      diverticular: /diverticul/i,
      ovarian_cysts: /ovarian/i,
      fibroids: /fibroid/i,
      inflammation: /inflam|red/i,
      trabeculation: /trabecul/i,
      lesion: /lesion|growth|polyp|tumour/i,
      endometriosis: /endometriosis/i,
      adhesions: /adhesion/i,
    };
    out.findings = def.findings.map((f) => f.key).filter((k) => findingWords[k]?.test(t));
    if (out.findings.includes("renal_cysts") && out.findings.includes("ovarian_cysts") && !/kidney|renal/i.test(t)) out.findings = out.findings.filter((k) => k !== "renal_cysts");
    if (out.findings.length) out.normal = false;
  }

  out.pvr_ml = number(t, /(?:residual|pvr|left (?:in|behind)|after (?:passing|emptying))[^\d]{0,20}(\d+(?:[.,]\d+)?)\s*(?:ml|mls|millilit)?/i) ?? number(t, /(\d+(?:[.,]\d+)?)\s*ml[s]?\s*(?:residual|left|pvr)/i);
  out.egfr = number(t, /egfr[^\d]{0,12}(\d+(?:[.,]\d+)?)/i);
  out.creatinine = number(t, /creatinine[^\d]{0,12}(\d+(?:[.,]\d+)?)/i);
  if (out.kind === "mri") {
    const part = t.match(/mri (?:scan )?(?:of (?:my |the )?)?([a-z ]{3,30}?)(?:[,.;]| in | on | was | showed | last |$)/i);
    if (part && !/normal|abnormal|scan/i.test(part[1])) out.body_part = part[1].trim();
  }
  if (lower.includes("nothing") || t.length < 3) return out;
  return out;
}

/** Fields for the AI prompt, kept beside the rule-based reader so they stay in step. */
export const INVESTIGATION_PROMPT = `The person is describing one medical investigation (a test or scan) they have had for their urinary tract.
- kind: ${INVESTIGATION_KINDS.map((k) => `${k.key} = ${k.label}`).join("; ")}. Null if unclear.
- performed_on: YYYY-MM-DD or null (a month alone means the first of that month is NOT assumed; use the 15th and keep notes empty).
- normal: true if they say it was normal, clear or fine; false if they describe an abnormal finding; otherwise null.
- findings: keys from the list for that kind only: ${INVESTIGATION_KINDS.filter((k) => k.findings.length).map((k) => `${k.key}: ${k.findings.map((f) => `${f.key} = ${f.label}`).join(", ")}`).join(" | ")}.
- body_part: for an MRI, what was scanned, in a few words; otherwise null.
- creatinine, egfr, pvr_ml: numbers only when stated (pvr_ml is urine left after passing, "residual").
- notes: anything else said about the result, a few words, or null.`;
