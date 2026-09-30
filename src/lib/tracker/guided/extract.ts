import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod/v4";
import { CONTRACEPTION, COURSE_TYPES, MENOPAUSE_STAGES, PREGNANT, SOURCES, SYMPTOMS, TEST_KINDS, TEST_RESULTS, TRIGGERS, WORKED } from "../options";
import { ANTIBIOTICS } from "../search";
import { PREVENTION_GROUPS, PREVENTION_OTHER } from "../prevention";
import { parseAbout, parseFree, parsePrevention, parseUtis } from "./local";
import { aboutSchema, looseFreeSchema, normaliseFree, preventionSchema, utisSchema, type FreeExtract, type GuidedStep } from "./schema";

/*
 * Turns a typed answer into form fields. With an API key the model reads the
 * text against a fixed schema (it can only fill in known keys, never add
 * advice or free text beyond names and notes). Without a key, or if the call
 * fails or is refused, the rule-based reader takes over. The person always
 * reviews the result before anything is saved.
 */

export function aiAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const list = (opts: { key: string; label: string }[]) => opts.map((o) => `${o.key} = ${o.label}`).join("; ");

const RULES = `You fill in a UTI diary form from what a person typed. You are not a clinician and you never add advice, diagnoses, suggestions or commentary. Only record what the person actually said. Leave a field null or empty when it was not said. Never guess a value the text does not support. Dates are in UK order (day before month). Resolve relative dates against the date given in the message. Free text you may keep: an "other" name, an "other" symptom in a few words, and short notes only if the person wrote something that does not fit a field.`;

const PROMPTS: Record<GuidedStep, string> = {
  about: `${RULES}
Fields:
- menopause_stage: ${list(MENOPAUSE_STAGES)}
- contraception: ${list(CONTRACEPTION)}
- pregnant_or_trying: ${list(PREGNANT)} ("yes" also covers trying to conceive)`,
  prevention: `${RULES}
List everything the person takes or does to help prevent UTIs, as keys from this list only:
${PREVENTION_GROUPS.map((g) => `${g.label}: ${list(g.options)}`).join("\n")}
${PREVENTION_OTHER.key} = something not in the list (put its name in other_name).
If they name a specific antibiotic they take to prevent UTIs, set antibiotic_id from: ${ANTIBIOTICS.map((a) => `${a.id} = ${a.name}${a.brands?.length ? ` (${a.brands.join(", ")})` : ""}`).join("; ")}.
Put things they say they have stopped, no longer take or gave up in stopped_keys instead of keys.
If they say they take or do nothing, or nothing has changed, return empty lists.`,
  utis: `${RULES}
The person is describing one or more UTIs (urinary tract infections) they have had. Return one entry per UTI, oldest first.
- started_on / ended_on: YYYY-MM-DD or null. If they say it is still going, set ongoing true and ended_on null. If they only give a length ("lasted 5 days"), compute ended_on from started_on.
- symptoms keys: ${list(SYMPTOMS)} (use "other" plus other_symptom for anything else)
- triggers keys (only if they suggest a cause): ${list(TRIGGERS)} (use "other" plus other_trigger, a few words, for a cause not in the list, such as a shower gel)
- treatments: one per antibiotic course. antibiotic_id from: ${ANTIBIOTICS.map((a) => `${a.id} = ${a.name}${a.brands?.length ? ` (${a.brands.join(", ")})` : ""}`).join("; ")}. days = course length if said. course_type: ${list(COURSE_TYPES)}. source (who gave it): ${list(SOURCES)}. worked (only if they said how it went): ${list(WORKED)}.
- tests: kind: ${list(TEST_KINDS)}; result: ${list(TEST_RESULTS)}; tested_on YYYY-MM-DD or null.
- notes: null unless something important does not fit.`,
  free: "",
};
PROMPTS.free = `${RULES}
The person may be describing UTIs they have had, changes to what they take or do to prevent UTIs, or both. Fill both parts; leave a part empty when it is not mentioned.

UTIs (utis): ${PROMPTS.utis.slice(RULES.length).trim().replace(/^The person is describing[^\n]*\n/, "")}

What they take (taking): ${PROMPTS.prevention.slice(RULES.length).trim()}
An antibiotic taken as a course for a UTI belongs in that UTI's treatments, not in taking.

The UTI they already have (existing): if they talk about their current UTI ("my UTI is still here", "it's gone", "today I..."), set existing.mentioned true and leave utis empty unless they clearly describe a different, past UTI. If it has cleared up: ended true and ended_on if given. If it is still going: ended false. Read how they feel today into feeling (1 awful, 2 bad, 3 ok, 4 good, 5 great), what they notice today into symptoms_today, any cause they suspect into triggers (or "other" plus other_trigger, e.g. "Shower gel"), any antibiotic started into treatments, any test into tests, and anything else worth keeping, such as a plan to see a doctor, into note in a few words ("Going to the doctor today").`;

// The free-form call uses a loose schema (plain strings) and normalises afterwards; the grammar for the full one is too large.
const SCHEMAS = { about: aboutSchema, prevention: preventionSchema, utis: utisSchema, free: looseFreeSchema } as const;

export type Extracted<S extends GuidedStep> = S extends "free" ? FreeExtract : z.infer<(typeof SCHEMAS)[S]>;

/** The JSON shape asked for in the free-form call, where a compiled grammar would be too large. */
const FREE_SHAPE = `Reply with JSON only, no prose, in exactly this shape (null or [] where nothing was said):
{"utis":[{"started_on":"YYYY-MM-DD"|null,"ended_on":"YYYY-MM-DD"|null,"ongoing":true|false|null,"symptoms":[keys],"other_symptom":string|null,"triggers":[keys],"other_trigger":string|null,"treatments":[{"antibiotic_id":id|null,"other_name":string|null,"days":int|null,"course_type":key|null,"source":key|null,"worked":key|null}],"tests":[{"kind":key,"result":key|null,"tested_on":"YYYY-MM-DD"|null}],"notes":string|null}],
 "taking":{"keys":[keys],"stopped_keys":[keys],"other_name":string|null,"antibiotic_id":id|null},
 "existing":{"mentioned":true|false,"ended":true|false|null,"ended_on":"YYYY-MM-DD"|null,"feeling":1-5|null,"symptoms_today":[keys],"other_symptom":string|null,"triggers":[keys],"other_trigger":string|null,"treatments":[...same as above],"tests":[...same as above],"note":string|null}}`;

function parseJsonText(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function extract<S extends GuidedStep>(step: S, text: string, today: string, allowAi = true): Promise<{ result: Extracted<S>; source: "ai" | "local" }> {
  const local = () => ({
    result: (step === "about" ? parseAbout(text) : step === "prevention" ? parsePrevention(text) : step === "free" ? parseFree(text, today) : parseUtis(text, today)) as Extracted<S>,
    source: "local" as const,
  });
  if (!aiAvailable() || !allowAi) return local();
  try {
    const client = new Anthropic({ timeout: 25_000, maxRetries: 1 });
    if (step === "free") {
      const response = await client.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 4000,
        system: [{ type: "text", text: `${PROMPTS.free}\n\n${FREE_SHAPE}`, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: `Today is ${today}.\n\nThe person wrote:\n${text}` }],
        output_config: { effort: "low" },
      });
      if (response.stop_reason === "refusal") return local();
      const reply = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      const loose = looseFreeSchema.safeParse(parseJsonText(reply));
      if (!loose.success) { console.error("[guided] free-form reply did not match the shape"); return local(); }
      return { result: normaliseFree(loose.data) as Extracted<S>, source: "ai" };
    }
    const response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      system: [{ type: "text", text: PROMPTS[step], cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `Today is ${today}.\n\nThe person wrote:\n${text}` }],
      output_config: { effort: "low", format: zodOutputFormat(SCHEMAS[step]) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return local();
    const parsed = step === "free" ? normaliseFree(response.parsed_output as z.infer<typeof looseFreeSchema>) : response.parsed_output;
    return { result: parsed as Extracted<S>, source: "ai" };
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error(`[guided] extraction failed (${err.status}): ${err.message.slice(0, 300)}`);
    else console.error("[guided] extraction failed");
    return local();
  }
}
