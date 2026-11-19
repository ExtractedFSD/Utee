"use server";

import { requireRole } from "@/lib/auth";
import { normalizeKitCode } from "@/lib/kit-code";
import { requestKitTransfer } from "@/lib/kit-transfer";
import { createAdminClient } from "@/lib/supabase/admin";

/** A signed-in customer asks the owner of a kit they scanned to pass it to them. */
export async function requestKitAccess(rawCode: string): Promise<{ ok: true } | { error: string }> {
  const user = await requireRole(["customer"]);
  const code = normalizeKitCode(rawCode);
  if (!code) return { error: "That kit code isn't valid." };
  const result = await requestKitTransfer(createAdminClient(), code, { id: user.id, email: user.email, full_name: user.fullName });
  return "error" in result ? result : { ok: true };
}
