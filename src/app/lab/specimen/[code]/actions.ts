"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logKitEvent } from "@/lib/events";

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
  return { ok: true };
}

const resultsSchema = z.object({
  outcome: z.enum(["positive", "negative", "inconclusive"]),
  organism: z.string().max(200),
  colonyCount: z.string().max(100),
  sensitivities: z.string().max(2000),
  comments: z.string().max(4000),
});

export async function uploadResults(code: string, formData: FormData) {
  const user = await requireRole(["lab"]);
  const admin = createAdminClient();

  const { data: kit } = await admin
    .from("kits")
    .select("id, status")
    .eq("code", code)
    .single();
  if (!kit) return { error: "Specimen not found" };
  if (kit.status !== "received_by_lab") {
    return { error: "Mark the specimen as received before uploading results" };
  }

  const parsed = resultsSchema.safeParse({
    outcome: String(formData.get("outcome") ?? ""),
    organism: String(formData.get("organism") ?? ""),
    colonyCount: String(formData.get("colonyCount") ?? ""),
    sensitivities: String(formData.get("sensitivities") ?? ""),
    comments: String(formData.get("comments") ?? ""),
  });
  if (!parsed.success) return { error: "Please complete the result fields" };

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

  const { error: insertError } = await admin.from("lab_results").insert({
    kit_id: kit.id,
    lab_user_id: user.id,
    outcome: parsed.data.outcome,
    organism: parsed.data.organism || null,
    colony_count: parsed.data.colonyCount || null,
    sensitivities: parsed.data.sensitivities ? { text: parsed.data.sensitivities } : null,
    comments: parsed.data.comments || null,
    report_path: reportPath,
  });
  if (insertError) {
    return { error: `Could not save results: ${insertError.message}` };
  }

  // Visible to the customer as "analysis complete" — never the result itself.
  await logKitEvent(admin, {
    kitId: kit.id,
    type: "lab",
    label: "Lab analysis complete",
    detail: "Results passed to the clinical team for review.",
    actorRole: "lab",
    actorId: user.id,
    newStatus: "lab_complete",
  });

  revalidatePath(`/lab/specimen/${code}`);
  revalidatePath("/lab");
  return { ok: true };
}
