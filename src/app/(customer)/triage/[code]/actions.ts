"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logKitEvent } from "@/lib/events";
import { antibioticName } from "@/lib/tracker/search";
import {
  CHANGE_MAX,
  CHANGE_MIN,
  RESEARCH,
  SAFETY_QUESTIONS,
  SYMPTOM_QUESTIONS,
  orderedSymptoms,
  safetyFlagsIn,
  type SafetyKey,
  type TriageAnswers,
} from "@/lib/triage/questions";

const CONSENT_TEXT =
  "I consent to my urine sample being tested by Utee's partner laboratory, and to my symptoms and results being reviewed by Utee's clinical team to produce my report.";

const yesNo = z.enum(["yes", "no"]);
const count = z.number().int().min(0).max(999).nullable();
const symptomKeys = SYMPTOM_QUESTIONS.map((q) => q.key) as [string, ...string[]];

const triageSchema = z
  .object({
    safety: z.object(
      Object.fromEntries(SAFETY_QUESTIONS.map((q) => [q.key, yesNo])) as Record<SafetyKey, typeof yesNo>
    ),
    history: z.object({
      continuous: yesNo,
      previousUti: z.enum(["yes", "no", "unsure"]),
      episodes6m: count,
      episodes12m: count,
    }),
    antibiotics: z
      .array(
        z.object({
          id: z.string().min(1).max(80),
          name: z.string().max(120),
          worked: z.enum(["yes", "no", "partly", "taking"]),
        })
      )
      .max(30),
    selected: z.array(z.enum(symptomKeys)).max(SYMPTOM_QUESTIONS.length),
    change24h: z.number().int().min(CHANGE_MIN).max(CHANGE_MAX),
    duration: z.string().min(1, "Tell us how long you've had these symptoms"),
    pregnant: z.enum(["yes", "no", "not_applicable"]),
    notes: z.string().max(2000),
    consent: z.literal(true, { errorMap: () => ({ message: "Consent is required" }) }),
    research: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.history.previousUti === "yes") {
      if (value.history.episodes6m === null) {
        ctx.addIssue({ code: "custom", message: "Tell us roughly how many episodes in the past 6 months" });
      }
      if (value.history.episodes12m === null) {
        ctx.addIssue({ code: "custom", message: "Tell us roughly how many episodes in the past 12 months" });
      }
    }
  });

export type TriageInput = z.input<typeof triageSchema>;

export async function submitTriage(code: string, input: TriageInput) {
  const user = await requireRole(["customer"]);
  const admin = createAdminClient();

  const { data: kit } = await admin
    .from("kits")
    .select("id, code, status, customer_id")
    .eq("code", code)
    .single();
  if (!kit || kit.customer_id !== user.id) {
    return { error: "This kit isn't linked to your account." };
  }
  if (!["assigned", "shipped", "delivered"].includes(kit.status)) {
    return { error: "Symptoms have already been submitted for this kit." };
  }

  const parsed = triageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Please check the form" };
  }

  const { consent: _consent, research, ...answers } = parsed.data;
  void _consent;
  const hadUti = answers.history.previousUti === "yes";
  const symptoms: TriageAnswers = {
    version: 3,
    safety: answers.safety,
    safetyFlags: safetyFlagsIn(answers.safety),
    history: {
      continuous: answers.history.continuous,
      previousUti: answers.history.previousUti,
      episodes6m: hadUti ? answers.history.episodes6m : null,
      episodes12m: hadUti ? answers.history.episodes12m : null,
    },
    // Names resolve server-side from the id, so a stored name is never
    // whatever the browser sent, except for free-text "other".
    antibiotics: hadUti
      ? answers.antibiotics.map((a) => ({
          id: a.id,
          name: a.id === "other" ? a.name.trim().slice(0, 120) || "Other antibiotic" : antibioticName(a.id),
          worked: a.worked,
        }))
      : [],
    selected: orderedSymptoms(answers.selected),
    change24h: answers.change24h,
    duration: answers.duration,
    pregnant: answers.pregnant,
    notes: answers.notes,
  };

  // Upsert, not insert: kit_id is unique, and the status gate above only lets
  // a customer back in here if the previous attempt saved their answers but
  // failed before the kit was activated. A retry must then succeed rather
  // than hit the unique constraint forever.
  const { error: insertError } = await admin.from("triage_submissions").upsert(
    {
      kit_id: kit.id,
      customer_id: user.id,
      symptoms,
      consent_given: true,
      consent_text: CONSENT_TEXT,
      research_consent: research,
      research_consent_text: research ? `${RESEARCH.text} ${RESEARCH.label}` : null,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "kit_id" }
  );
  if (insertError) {
    return { error: "Could not save your answers. Please try again." };
  }

  try {
    await logKitEvent(admin, {
      kitId: kit.id,
      type: "triage",
      label: "Symptoms submitted",
      detail: "Symptom form completed and consent recorded.",
      actorRole: "customer",
      actorId: user.id,
      newStatus: "activated",
      metadata: { safetyFlags: symptoms.safetyFlags },
    });
  } catch (err) {
    console.error("[triage] activation failed after saving answers", err);
    return { error: "Your answers were saved but we couldn't activate the kit. Please try again." };
  }

  redirect(`/portal/tests/${kit.id}?submitted=1`);
}
