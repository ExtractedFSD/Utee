"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logKitEvent } from "@/lib/events";

const CONSENT_TEXT =
  "I consent to my urine sample being tested by Utee's partner laboratory, and to my symptoms and results being reviewed by Utee's clinical team to produce my report.";

const triageSchema = z.object({
  selected: z.array(z.string()).min(1, "Select at least one symptom"),
  duration: z.string().min(1, "Tell us how long you've had symptoms"),
  previousUti: z.string(),
  pregnant: z.string(),
  currentAntibiotics: z.string(),
  notes: z.string().max(2000),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required" }) }),
});

export async function submitTriage(code: string, formData: FormData) {
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

  const parsed = triageSchema.safeParse({
    selected: formData.getAll("symptom").map(String),
    duration: String(formData.get("duration") ?? ""),
    previousUti: String(formData.get("previousUti") ?? "unsure"),
    pregnant: String(formData.get("pregnant") ?? "not_applicable"),
    currentAntibiotics: String(formData.get("currentAntibiotics") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    consent: formData.get("consent") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Please check the form" };
  }

  const { consent, ...symptoms } = parsed.data;

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
    return { error: "Could not save your answers — please try again." };
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
    });
  } catch (err) {
    console.error("[triage] activation failed after saving answers", err);
    return { error: "Your answers were saved but we couldn't activate the kit — please try again." };
  }

  redirect(`/portal/tests/${kit.id}?submitted=1`);
}
