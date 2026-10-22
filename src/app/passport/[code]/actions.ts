"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSharedPassport } from "@/lib/tracker/share-load";
import { formatShareCode } from "@/lib/tracker/share";
import type { VerificationEntity } from "@/lib/tracker/verify";

/**
 * A signed-in clinician marks one patient-entered entry as checked against
 * the original report, from the shared view. Written with the service role
 * after the role check; the patient cannot write these rows.
 */
export async function verifyEntry(code: string, entity: VerificationEntity, entityId: string, on: boolean) {
  const user = await requireRole(["clinic"]);
  if (!z.string().uuid().safeParse(entityId).success || !["investigation", "culture"].includes(entity)) return { error: "Not found" };
  const shared = await loadSharedPassport(code);
  if (!shared) return { error: "This share is no longer open." };
  const exists = entity === "investigation" ? shared.data.investigations.some((i) => i.id === entityId) : shared.data.cultures.some((c) => c.id === entityId && c.source !== "utee");
  if (!exists) return { error: "Not found" };
  const admin = createAdminClient();
  const name = user.fullName?.trim() || user.email;
  if (on) {
    const { error } = await admin
      .from("tracker_verifications")
      .upsert({ user_id: shared.share.user_id, entity, entity_id: entityId, verified_by: user.id, verified_name: name, verified_at: new Date().toISOString(), share_id: shared.share.id }, { onConflict: "entity,entity_id" });
    if (error) return { error: "Could not save." };
  } else {
    await admin.from("tracker_verifications").delete().eq("user_id", shared.share.user_id).eq("entity", entity).eq("entity_id", entityId);
  }
  await admin.from("tracker_audit_log").insert({ user_id: shared.share.user_id, action: on ? "entry_verified" : "entry_unverified", detail: { entity, entity_id: entityId, by: user.id, share_id: shared.share.id }, actor: "system" });
  revalidatePath(`/passport/${formatShareCode(shared.share.code)}`);
  revalidatePath(`/passport/${shared.share.code}`);
  return { ok: true };
}
