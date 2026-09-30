"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logKitEvent } from "@/lib/events";
import {
  CHANGE_MAX,
  CHANGE_MIN,
  SAFETY_QUESTIONS,
  SEVERITY_MAX,
  SEVERITY_MIN,
  SYMPTOM_QUESTIONS,
  safetyFlagsIn,
  selectedFrom,
  type SafetyKey,
  type SymptomKey,
  type TriageAnswers,
} from "@/lib/triage/questions";

const CONSENT_TEXT =
  "I consent to my urine sample being tested by Utee's partner laboratory, and to my symptoms and results being reviewed by Utee's clinical team to produce my report.";

const yesNo = z.enum(["yes", "no"]);
const count = z.number().int().min(0).max(999).nullable();

const triageSchema = z
  .object({
    safety: z.object(
      Object.fromEntries(SAFETY_QUESTIONS.map((q) => [q.key, yesNo])) as Record<SafetyKey, typeof yesNo>
    ),
    history: z.object({
      continuous: yesNo,
      episodes6m: count,
      episodes12m: count,
    }),
    severity: z.object(
      Object.fromEntries(
        SYMPTOM_QUESTIONS.map((q) => [q.key, z.number().int().min(SEVERITY_MIN).max(SEVERITY_MAX)])
      ) as Record<SymptomKey, z.ZodNumber>
    ),
    change24h: z.number().int().min(CHANGE_MIN).max(CHANGE_MAX),
    duration: z.string().min(1, "Tell us how long you've had symptoms"),
    previousUti: z.enum(["yes", "no", "unsure"]),
    pregnant: z.enum(["yes", "no", "not_applicable"]),
    currentAntibiotics: z.string().max(500),
    notes: z.string().max(2000),
    consent: z.literal(true, { errorMap: () => ({ message: "Consent is required" }) }),
  })
  .superRefine((value, ctx) => {
    if (value.history.continuous === "no") {
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

  const { consent: _consent, ...answers } = parsed.data;
  void _consent;
  const symptoms: TriageAnswers = {
    version: 2,
    ...answers,
    history: {
      continuous: answers.history.continuous,
      episodes6m: answers.history.continuous === "yes" ? null : answers.history.episodes6m,
      episodes12m: answers.history.continuous === "yes" ? null : answers.history.episodes12m,
    },
    safetyFlags: safetyFlagsIn(answers.safety),
    selected: selectedFrom(answers.severity),
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
