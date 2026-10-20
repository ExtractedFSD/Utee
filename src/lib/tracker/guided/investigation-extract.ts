import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { aiAvailable } from "./extract";
import { INVESTIGATION_PROMPT, investigationExtractSchema, parseInvestigation, type InvestigationExtract } from "./investigation";

const RULES = `You fill in a medical investigation entry in a UTI diary from what a person typed. You are not a clinician and you never add advice, diagnoses, suggestions or commentary. Only record what the person actually said. Leave a field null or empty when it was not said. Never guess a value the text does not support. Dates are in UK order (day before month). Resolve relative dates against the date given in the message.`;

/** Reads one typed description of a test or scan into an entry for the person to review. */
export async function extractInvestigation(text: string, today: string, allowAi = true): Promise<{ result: InvestigationExtract; source: "ai" | "local" }> {
  const local = () => ({ result: parseInvestigation(text, today), source: "local" as const });
  if (!aiAvailable() || !allowAi) return local();
  try {
    const client = new Anthropic({ timeout: 25_000, maxRetries: 1 });
    const response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 1500,
      system: [{ type: "text", text: `${RULES}\n${INVESTIGATION_PROMPT}`, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `Today is ${today}.\n\nThe person wrote:\n${text}` }],
      output_config: { effort: "low", format: zodOutputFormat(investigationExtractSchema) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return local();
    return { result: response.parsed_output as InvestigationExtract, source: "ai" };
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error(`[guided] investigation extraction failed (${err.status}): ${err.message.slice(0, 300)}`);
    else console.error("[guided] investigation extraction failed");
    return local();
  }
}
