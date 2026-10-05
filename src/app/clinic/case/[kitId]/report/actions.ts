"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireRole, type SessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logKitEvent } from "@/lib/events";
import { contentSchema, differsFromSuggested, type ReportContent, type SheetSummary } from "@/lib/report/content";
import { REPORTS_BUCKET, loadReportCase, renderCaseReport, type ReportCase, type StoredSignature } from "@/lib/report/build";

type Result = { ok: true } | { error: string };

type Opened = { user: SessionUser; admin: SupabaseClient; c: ReportCase & { sheet: SheetSummary } };

async function openCase(kitId: string): Promise<Opened | { error: string }> {
  const user = await requireRole(["clinic"]);
  const admin = createAdminClient();
  const c = await loadReportCase(admin, kitId);
  if (!c) return { error: "Case not found" };
  if (c.kit.status !== "clinic_received") return { error: "This case is not open for a report. Acknowledge it first, or it has already been published." };
  if (!c.sheet) return { error: "There is no lab result on this case yet." };
  return { user, admin, c: { ...c, sheet: c.sheet } };
}

function cleanContent(raw: unknown, sheet: SheetSummary): { content: ReportContent } | { error: string } {
  const parsed = contentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Check the report wording" };
  return { content: { ...parsed.data, overridden: differsFromSuggested(parsed.data, sheet) } };
}

async function persistContent(admin: SupabaseClient, kitId: string, userId: string, content: ReportContent) {
  const { error } = await admin
    .from("clinic_reports")
    .upsert({ kit_id: kitId, clinic_user_id: userId, status: "in_review", content }, { onConflict: "kit_id" });
  return error ? `Could not save the draft: ${error.message}` : null;
}

/** Saves the wording so the preview and a later sign or publish use it. */
export async function saveReportDraft(kitId: string, raw: unknown): Promise<Result> {
  const opened = await openCase(kitId);
  if ("error" in opened) return opened;
  const { user, admin, c } = opened;
  const cleaned = cleanContent(raw, c.sheet);
  if ("error" in cleaned) return { error: cleaned.error };
  const err = await persistContent(admin, kitId, user.id, cleaned.content);
  if (err) return { error: err };
  revalidatePath(`/clinic/case/${kitId}/report`);
  return { ok: true };
}

/** Applies the signer's saved signature to the draft (replacing their earlier one, if any). */
export async function signReport(kitId: string, raw: unknown): Promise<Result> {
  const opened = await openCase(kitId);
  if ("error" in opened) return opened;
  const { user, admin, c } = opened;

  const cleaned = cleanContent(raw, c.sheet);
  if ("error" in cleaned) return { error: cleaned.error };
  const err = await persistContent(admin, kitId, user.id, cleaned.content);
  if (err) return { error: err };

  const { data: sig } = await admin
    .from("staff_signatures")
    .select("display_name, title, organisation, image_path")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sig) return { error: "Save your signature first." };

  const entry: StoredSignature = {
    user_id: user.id,
    name: sig.display_name,
    title: sig.title,
    organisation: sig.organisation,
    image_path: sig.image_path,
    signed_at: new Date().toISOString(),
  };
  const signatures = [...(c.report?.signatures ?? []).filter((s) => s.user_id !== user.id), entry];
  const { error } = await admin.from("clinic_reports").update({ signatures }).eq("kit_id", kitId);
  if (error) return { error: `Could not sign: ${error.message}` };

  await logKitEvent(admin, {
    kitId,
    type: "report",
    label: "Report signed",
    detail: `Signed by ${entry.name}.`,
    actorRole: user.role,
    actorId: user.id,
    visibleToCustomer: false,
  });
  revalidatePath(`/clinic/case/${kitId}/report`);
  return { ok: true };
}

/** Removes the caller's signature from the draft. Super admins can remove anyone's. */
export async function unsignReport(kitId: string, userId: string): Promise<Result> {
  const opened = await openCase(kitId);
  if ("error" in opened) return opened;
  const { user, admin, c } = opened;
  if (userId !== user.id && user.role !== "super_admin") return { error: "You can only remove your own signature." };
  const signatures = (c.report?.signatures ?? []).filter((s) => s.user_id !== userId);
  const { error } = await admin.from("clinic_reports").update({ signatures }).eq("kit_id", kitId);
  if (error) return { error: `Could not remove the signature: ${error.message}` };
  revalidatePath(`/clinic/case/${kitId}/report`);
  return { ok: true };
}

/**
 * Renders the final PDF with the signatures applied, stores it, and tells
 * the patient. The wording passed in is saved first so what was on screen
 * is what gets published.
 */
export async function publishReport(kitId: string, raw: unknown): Promise<Result> {
  const opened = await openCase(kitId);
  if ("error" in opened) return opened;
  const { user, admin, c } = opened;

  const cleaned = cleanContent(raw, c.sheet);
  if ("error" in cleaned) return { error: cleaned.error };
  const err = await persistContent(admin, kitId, user.id, cleaned.content);
  if (err) return { error: err };

  const signatures = c.report?.signatures ?? [];
  if (signatures.length === 0) return { error: "The report must be signed before it is published." };

  const now = new Date().toISOString();
  let pdf: Buffer;
  try {
    pdf = await renderCaseReport(admin, c, { content: cleaned.content, draft: false, reportDate: now });
  } catch (e) {
    console.error("[report] render failed", e);
    return { error: "The report could not be generated. Please try again." };
  }

  const reportPath = `${c.kit.code}/${Date.now()}-utee-test-results.pdf`;
  const { error: uploadError } = await admin.storage.from(REPORTS_BUCKET).upload(reportPath, pdf, { contentType: "application/pdf" });
  if (uploadError) return { error: `Could not store the report: ${uploadError.message}` };

  const { error: updateError } = await admin
    .from("clinic_reports")
    .update({
      status: "complete",
      report_path: reportPath,
      clinic_user_id: user.id,
      completed_at: now,
      generated_at: now,
      content: cleaned.content,
    })
    .eq("kit_id", kitId);
  if (updateError) return { error: `Could not save the report: ${updateError.message}` };

  await logKitEvent(admin, {
    kitId,
    type: "report",
    label: "Your report is ready",
    detail: "Download it from your portal to share with your GP or doctor.",
    actorRole: user.role,
    actorId: user.id,
    newStatus: "report_ready",
    metadata: { signedBy: signatures.map((s) => s.name), overridden: cleaned.content.overridden },
  });

  revalidatePath(`/clinic/case/${kitId}`);
  revalidatePath(`/clinic/case/${kitId}/report`);
  revalidatePath("/clinic");
  return { ok: true };
}
