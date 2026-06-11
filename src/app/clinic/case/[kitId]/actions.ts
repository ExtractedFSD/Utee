"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logKitEvent } from "@/lib/events";

export async function acknowledgeCase(kitId: string) {
  const user = await requireRole(["clinic"]);
  const admin = createAdminClient();

  const { data: kit } = await admin.from("kits").select("id, status").eq("id", kitId).single();
  if (!kit) return { error: "Case not found" };
  if (kit.status !== "lab_complete") {
    return { error: "This case isn't awaiting clinic acknowledgement" };
  }

  await admin.from("clinic_reports").upsert(
    { kit_id: kitId, clinic_user_id: user.id, status: "received" },
    { onConflict: "kit_id" }
  );

  await logKitEvent(admin, {
    kitId,
    type: "clinic",
    label: "With the clinical team",
    detail: "Your symptoms and lab results are being reviewed by a clinician.",
    actorRole: "clinic",
    actorId: user.id,
    newStatus: "clinic_received",
  });

  revalidatePath(`/clinic/case/${kitId}`);
  revalidatePath("/clinic");
  return { ok: true };
}

export async function uploadFinalReport(kitId: string, formData: FormData) {
  const user = await requireRole(["clinic"]);
  const admin = createAdminClient();

  const { data: kit } = await admin
    .from("kits")
    .select("id, code, status")
    .eq("id", kitId)
    .single();
  if (!kit) return { error: "Case not found" };
  if (kit.status !== "clinic_received") {
    return { error: "Acknowledge the case before uploading the final report" };
  }

  const file = formData.get("report");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Attach the final report PDF" };
  }
  if (file.type !== "application/pdf") return { error: "Report must be a PDF" };
  if (file.size > 10 * 1024 * 1024) return { error: "Report must be under 10 MB" };

  const summary = String(formData.get("summary") ?? "").slice(0, 4000);

  const reportPath = `${kit.code}/${Date.now()}-final-report.pdf`;
  const { error: uploadError } = await admin.storage
    .from("clinic-reports")
    .upload(reportPath, file, { contentType: "application/pdf" });
  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  const { error: updateError } = await admin
    .from("clinic_reports")
    .update({
      status: "complete",
      summary: summary || null,
      report_path: reportPath,
      clinic_user_id: user.id,
      completed_at: new Date().toISOString(),
    })
    .eq("kit_id", kitId);
  if (updateError) return { error: `Could not save report: ${updateError.message}` };

  await logKitEvent(admin, {
    kitId,
    type: "report",
    label: "Your report is ready",
    detail: "Download it from your portal to share with your GP or doctor.",
    actorRole: "clinic",
    actorId: user.id,
    newStatus: "report_ready",
  });

  revalidatePath(`/clinic/case/${kitId}`);
  revalidatePath("/clinic");
  return { ok: true };
}
