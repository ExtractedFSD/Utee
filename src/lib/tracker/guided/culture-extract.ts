import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { aiAvailable } from "./extract";
import { CULTURE_PROMPT, cultureExtractSchema, parseCulture, type CultureExtract } from "./culture";

const RULES = `You read urine culture and sensitivity results into a structured entry for a patient's UTI passport. You are not a clinician and you never add advice, diagnoses, suggestions or commentary. Only record what is actually on the report or in the text. Leave a field null or a list empty when it is not given. Never guess. Dates are in UK order (day before month). Resolve relative dates against the date given in the message.`;

const MODEL = "claude-opus-5-5";

/** A sentence into a culture entry: AI when available, rules otherwise. */
export async function extractCultureText(text: string, today: string, allowAi = true): Promise<{ result: CultureExtract; source: "ai" | "local" }> {
  const local = () => ({ result: parseCulture(text, today), source: "local" as const });
  if (!aiAvailable() || !allowAi) return local();
  try {
    const client = new Anthropic({ timeout: 25_000, maxRetries: 1 });
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 2500,
      system: [{ type: "text", text: `${RULES}\n${CULTURE_PROMPT}`, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `Today is ${today}.\n\nThe person wrote:\n${text}` }],
      output_config: { effort: "low", format: zodOutputFormat(cultureExtractSchema) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return local();
    return { result: response.parsed_output as CultureExtract, source: "ai" };
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error(`[guided] culture text extraction failed (${err.status}): ${err.message.slice(0, 300)}`);
    else console.error("[guided] culture text extraction failed");
    return local();
  }
}

type ImageMedia = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

/**
 * A photographed report into a culture entry. The image is sent to the
 * reader and discarded; only the values come back, and the person checks
 * them before saving. Nothing is stored.
 */
export async function extractCultureImage(base64: string, mediaType: ImageMedia, today: string): Promise<{ result: CultureExtract } | { error: string }> {
  if (!aiAvailable()) return { error: "Reading a photo isn't available right now. Type the result instead." };
  try {
    const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 3000,
      system: [{ type: "text", text: `${RULES}\n${CULTURE_PROMPT}\nThe report is a photograph. Read it carefully; columns of S and R letters line up under numbered organism headings. If the photo is unreadable, return nulls and empty lists.`, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: `Today is ${today}. Read this urine culture report into the entry.` },
          ],
        },
      ],
      output_config: { effort: "medium", format: zodOutputFormat(cultureExtractSchema) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return { error: "The photo could not be read. Try a clearer photo, or type the result." };
    return { result: response.parsed_output as CultureExtract };
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error(`[guided] culture image extraction failed (${err.status}): ${err.message.slice(0, 300)}`);
    else console.error("[guided] culture image extraction failed");
    return { error: "The photo could not be read. Try a clearer photo, or type the result." };
  }
}
