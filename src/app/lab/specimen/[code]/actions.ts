"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKitCode, normalizeKitCode } from "@/lib/kit-code";
import { logKitEvent } from "@/lib/events";
import { emails, sendEmail } from "@/lib/email";
import { UROPATHOGENS, judgeSheet, organismNames, type UropathogenKey } from "@/lib/lab-sheet";

export async function markReceived(code: string) {
  const user = await requireRole(["lab"]);
  const admin = createAdminClient();

  const { data: kit } = await admin
    .from("kits")
    .select("id, status")
    .eq("code", code)
    .single();
  if (!kit) return { error: "Specimen not found" };
  if (!["activated", "in_transit_to_lab"].includes(kit.status)) {
    return { error: "This specimen can't be marked received from its current state" };
  }

  await logKitEvent(admin, {
    kitId: kit.id,
    type: "lab",
    label: "Received by lab",
    detail: "Specimen receipt confirmed by the laboratory.",
    actorRole: "lab",
    actorId: user.id,
    newStatus: "received_by_lab",
  });

  revalidatePath(`/lab/specimen/${code}`);
  revalidatePath("/lab");
  // Back to the queue: a technician receiving a batch scans the next bag
  // now and records each sheet when its run has finished.
  redirect(`/lab?received=${code}`);
}

const organismKeys = UROPATHOGENS.map((u) => u.key) as [UropathogenKey, ...UropathogenKey[]];

const sheetSchema = z.object({
  organisms: z.array(z.enum(organismKeys)),
  controls: z.object({ positive: z.boolean(), negative: z.boolean(), error: z.boolean() }),
  comments: z.string().max(4000),
});

/**
 * Records the Lodestar sheet for a specimen. A valid run (positive control
 * confirmed, negative control clear, no error) goes to the clinic as
 * positive or negative. An invalid run holds the kit in 'lab_query', keeps
 * the reading for the record, and emails Utee; the lab then re-runs or
 * escalates. A re-run overwrites the result and keeps the earlier attempt.
 */
export async function recordSheet(code: string, formData: FormData) {
  const user = await requireRole(["lab"]);
  const admin = createAdminClient();

  const { data: kit } = await admin
    .from("kits")
    .select("id, status")
    .eq("code", code)
    .single();
  if (!kit) return { error: "Specimen not found" };
  if (kit.status !== "received_by_lab") {
    return { error: "Mark the specimen as received before recording results" };
  }

  // Anti-mix-up guard: the tech must re-type the code printed on the tube.
  // A stale browser tab for a different specimen fails loudly here.
  const typed = String(formData.get("confirmCode") ?? "");
  const confirmCode = normalizeKitCode(typed);
  if (confirmCode !== code) {
    return {
      error: `The code you entered (${typed.trim() || "blank"}) doesn't match this specimen (${formatKitCode(code)}). Check you're holding the right tube and are on the right page.`,
    };
  }

  const parsed = sheetSchema.safeParse({
    organisms: formData.getAll("organism").map(String),
    controls: {
      positive: formData.get("control_positive") === "on",
      negative: formData.get("control_negative") === "on",
      error: formData.get("control_error") === "on",
    },
    comments: String(formData.get("comments") ?? ""),
  });
  if (!parsed.success) return { error: "Please check the sheet" };
  const reading = parsed.data;
  const verdict = judgeSheet(reading);

  // Optional PDF attachment.
  let reportPath: string | null = null;
  const file = formData.get("report");
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf") return { error: "Report must be a PDF" };
    if (file.size > 10 * 1024 * 1024) return { error: "Report must be under 10 MB" };
    reportPath = `${code}/${Date.now()}-lab-report.pdf`;
    const { error: uploadError } = await admin.storage
      .from("lab-reports")
      .upload(reportPath, file, { contentType: "application/pdf" });
    if (uploadError) return { error: `Upload failed: ${uploadError.message}` };
  }

  // An earlier attempt on this specimen (a re-run) is kept, not lost.
  const { data: existing } = await admin
    .from("lab_results")
    .select("outcome, organisms, controls, valid, comments, uploaded_at, lab_user_id, previous_attempts")
    .eq("kit_id", kit.id)
    .maybeSingle();
  const previous = existing
    ? [
        ...((existing.previous_attempts as unknown[]) ?? []),
        {
          outcome: existing.outcome,
          organisms: existing.organisms,
          controls: existing.controls,
          valid: existing.valid,
          comments: existing.comments,
          uploaded_at: existing.uploaded_at,
          lab_user_id: existing.lab_user_id,
        },
      ]
    : [];

  const { error: saveError } = await admin.from("lab_results").upsert(
    {
      kit_id: kit.id,
      lab_user_id: user.id,
      outcome: verdict.outcome,
      organism: organismNames(reading.organisms).join(", ") || null,
      organisms: reading.organisms,
      controls: reading.controls,
      valid: verdict.valid,
      colony_count: null,
      sensitivities: null,
      comments: reading.comments || null,
      report_path: reportPath,
      previous_attempts: previous,
      uploaded_at: new Date().toISOString(),
    },
    { onConflict: "kit_id" }
  );
  if (saveError) return { error: `Could not save results: ${saveError.message}` };

  if (verdict.valid) {
    // Visible to the customer as "analysis complete", never the result itself.
    await logKitEvent(admin, {
      kitId: kit.id,
      type: "lab",
      label: "Lab analysis complete",
      detail: "Results passed to the clinical team for review.",
      actorRole: "lab",
      actorId: user.id,
      newStatus: "lab_complete",
      metadata: { attempt: previous.length + 1 },
    });
  } else {
    await logKitEvent(admin, {
      kitId: kit.id,
      type: "lab",
      label: "Lab is checking your sample",
      detail: "The laboratory is repeating a check before results can be confirmed.",
      actorRole: "lab",
      actorId: user.id,
      newStatus: "lab_query",
      metadata: { reasons: verdict.reasons, controls: reading.controls, attempt: previous.length + 1 },
    });
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        kitId: kit.id,
        kind: "adminLabQuery",
        ...emails.adminLabQuery(formatKitCode(code), verdict.reasons, reading.comments || undefined),
      });
    }
  }

  revalidatePath(`/lab/specimen/${code}`);
  revalidatePath("/lab");
  return { ok: true, valid: verdict.valid };
}

/** The lab repeats the test on the same sample: back to awaiting results. */
export async function rerunTest(code: string) {
  const user = await requireRole(["lab"]);
  const admin = createAdminClient();
  const { data: kit } = await admin.from("kits").select("id, status").eq("code", code).single();
  if (!kit) return { error: "Specimen not found" };
  if (kit.status !== "lab_query") return { error: "Only a specimen with a lab query can be re-run" };

  await logKitEvent(admin, {
    kitId: kit.id,
    type: "lab",
    label: "Test being repeated",
    detail: "The laboratory is running the test again on the same sample.",
    actorRole: "lab",
    actorId: user.id,
    visibleToCustomer: false,
    newStatus: "received_by_lab",
  });
  revalidatePath(`/lab/specimen/${code}`);
  revalidatePath("/lab");
  return { ok: true };
}

/** The lab can't complete the test: Utee decides what happens next. */
export async function escalateToUtee(code: string, note: string) {
  const user = await requireRole(["lab"]);
  const why = note.trim().slice(0, 1000);
  if (!why) return { error: "Tell Utee what went wrong" };
  const admin = createAdminClient();
  const { data: kit } = await admin.from("kits").select("id, status").eq("code", code).single();
  if (!kit) return { error: "Specimen not found" };
  if (kit.status !== "lab_query") return { error: "Only a specimen with a lab query can be escalated" };

  await logKitEvent(admin, {
    kitId: kit.id,
    type: "lab",
    label: "Escalated to Utee by the lab",
    detail: why,
    actorRole: "lab",
    actorId: user.id,
    visibleToCustomer: false,
  });
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    await sendEmail({ to: adminEmail, kitId: kit.id, kind: "adminLabEscalation", ...emails.adminLabEscalation(formatKitCode(code), why) });
  }
  revalidatePath(`/lab/specimen/${code}`);
  return { ok: true };
}
