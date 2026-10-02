"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKitCode, normalizeKitCode } from "@/lib/kit-code";
import { logKitEvent } from "@/lib/events";
import { emails, sendEmail } from "@/lib/email";
import {
  FAILED_RUNS_BEFORE_ISSUE,
  SAMPLE_FAULTS,
  SAMPLE_FAULT_LABELS,
  UROPATHOGENS,
  judgeSheet,
  organismNames,
  type SampleFaultKey,
  type UropathogenKey,
} from "@/lib/lab-sheet";

async function loadKit(code: string) {
  const admin = createAdminClient();
  const { data: kit } = await admin
    .from("kits")
    .select("id, status, profiles:customer_id(email)")
    .eq("code", code)
    .single();
  const email = (kit?.profiles as unknown as { email: string } | null)?.email ?? null;
  return { admin, kit: kit ? { id: kit.id as string, status: kit.status as string, email } : null };
}

export async function markReceived(code: string) {
  const user = await requireRole(["lab"]);
  const { admin, kit } = await loadKit(code);
  if (!kit) return { error: "Specimen not found" };
  if (!["activated", "in_transit_to_lab"].includes(kit.status)) {
    return { error: "This specimen can't be marked received from its current state" };
  }

  await logKitEvent(admin, {
    kitId: kit.id,
    type: "lab",
    label: "Sample received. Lab testing in progress.",
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

/**
 * Parks a kit as a problem Utee has to act on, tells the customer there
 * is a problem, and tells Utee what it is.
 */
async function raiseIssue(
  admin: ReturnType<typeof createAdminClient>,
  kit: { id: string; email: string | null },
  code: string,
  user: { id: string },
  issue: { kind: "sample_problem" | "failed_runs"; fault?: string; note?: string; summary: string; reasons: string[] }
) {
  await admin.from("lab_issues").insert({
    kit_id: kit.id,
    kind: issue.kind,
    fault: issue.fault ?? null,
    note: issue.note || null,
    reported_by: user.id,
  });
  await logKitEvent(admin, {
    kitId: kit.id,
    type: "lab",
    label: "We're looking into a problem with your test",
    detail: "The laboratory has reported a problem. The Utee team will be in touch about what happens next.",
    actorRole: "lab",
    actorId: user.id,
    newStatus: "lab_query",
    metadata: { issue: issue.kind, fault: issue.fault ?? null, reasons: issue.reasons },
  });
  await logKitEvent(admin, {
    kitId: kit.id,
    type: "lab",
    label: issue.summary,
    detail: [...issue.reasons, issue.note].filter(Boolean).join(". ") || undefined,
    actorRole: "lab",
    actorId: user.id,
    visibleToCustomer: false,
  });
  const shown = formatKitCode(code);
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    await sendEmail({ to: adminEmail, kitId: kit.id, kind: "adminLabIssue", ...emails.adminLabIssue(shown, issue.summary, issue.reasons, issue.note) });
  }
  if (kit.email) {
    await sendEmail({ to: kit.email, kitId: kit.id, kind: "customerLabProblem", ...emails.customerLabProblem(shown) });
  }
}

const faultKeys = SAMPLE_FAULTS.map((f) => f.key) as [SampleFaultKey, ...SampleFaultKey[]];

/**
 * The bag was opened and the sample can't be tested: leaked, empty,
 * damaged, or something else. Recorded as a problem for Utee to resolve.
 */
export async function reportSampleProblem(code: string, input: { fault: string; note: string }) {
  const user = await requireRole(["lab"]);
  const parsed = z.object({ fault: z.enum(faultKeys), note: z.string().max(1000) }).safeParse({ fault: input.fault, note: input.note.trim() });
  if (!parsed.success) return { error: "Choose what is wrong with the sample" };
  if (parsed.data.fault === "other" && !parsed.data.note) return { error: "Describe what is wrong with the sample" };

  const { admin, kit } = await loadKit(code);
  if (!kit) return { error: "Specimen not found" };
  if (!["activated", "in_transit_to_lab", "received_by_lab"].includes(kit.status)) {
    return { error: "A problem can only be reported on a specimen that has arrived at the lab" };
  }

  await raiseIssue(admin, kit, code, user, {
    kind: "sample_problem",
    fault: parsed.data.fault,
    note: parsed.data.note,
    summary: `Sample problem: ${SAMPLE_FAULT_LABELS[parsed.data.fault]}`,
    reasons: [SAMPLE_FAULT_LABELS[parsed.data.fault]],
  });

  revalidatePath(`/lab/specimen/${code}`);
  revalidatePath("/lab");
  redirect(`/lab?problem=${code}`);
}

const organismKeys = UROPATHOGENS.map((u) => u.key) as [UropathogenKey, ...UropathogenKey[]];

const sheetSchema = z.object({
  organisms: z.array(z.enum(organismKeys)),
  controls: z.object({ positive: z.boolean(), negative: z.boolean(), error: z.boolean() }),
  comments: z.string().max(4000),
});

/**
 * Records the Lodestar sheet for a specimen. A valid run (both controls
 * passed, no error) goes to the clinic as positive or negative. The first
 * invalid run stays with the lab: the attempt is kept and the sheet is
 * offered again, with nothing said to the customer. A second invalid run
 * is a problem: the kit is parked for Utee and the customer is told.
 */
export async function recordSheet(code: string, formData: FormData) {
  const user = await requireRole(["lab"]);
  const { admin, kit } = await loadKit(code);
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

  // Earlier attempts on this specimen are kept, not lost.
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
  const attempt = previous.length + 1;

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
      metadata: { attempt },
    });
    revalidatePath(`/lab/specimen/${code}`);
    revalidatePath("/lab");
    return { ok: true, valid: true as const };
  }

  // Internal note only: the customer sees nothing for a first failure.
  await logKitEvent(admin, {
    kitId: kit.id,
    type: "lab",
    label: `Run ${attempt} invalid`,
    detail: verdict.reasons.join(". "),
    actorRole: "lab",
    actorId: user.id,
    visibleToCustomer: false,
    metadata: { reasons: verdict.reasons, controls: reading.controls, attempt },
  });

  if (attempt >= FAILED_RUNS_BEFORE_ISSUE) {
    await raiseIssue(admin, kit, code, user, {
      kind: "failed_runs",
      note: reading.comments,
      summary: `Test failed ${attempt} times`,
      reasons: verdict.reasons,
    });
  }

  revalidatePath(`/lab/specimen/${code}`);
  revalidatePath("/lab");
  return { ok: true, valid: false as const, attempt, reasons: verdict.reasons, parked: attempt >= FAILED_RUNS_BEFORE_ISSUE };
}

/** Utee has asked the lab to try again: back to awaiting results. */
export async function rerunTest(code: string) {
  const user = await requireRole(["lab"]);
  const { admin, kit } = await loadKit(code);
  if (!kit) return { error: "Specimen not found" };
  if (kit.status !== "lab_query") return { error: "Only a parked specimen can be sent for another run" };

  await admin.from("lab_issues").update({ resolved_at: new Date().toISOString(), resolved_by: user.id, resolution: "rerun" }).eq("kit_id", kit.id).is("resolved_at", null);
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

/** Adds a note to a parked specimen for Utee. */
export async function escalateToUtee(code: string, note: string) {
  const user = await requireRole(["lab"]);
  const why = note.trim().slice(0, 1000);
  if (!why) return { error: "Tell Utee what you need" };
  const { admin, kit } = await loadKit(code);
  if (!kit) return { error: "Specimen not found" };
  if (kit.status !== "lab_query") return { error: "Only a parked specimen can be escalated" };

  await logKitEvent(admin, {
    kitId: kit.id,
    type: "lab",
    label: "Note from the lab",
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
