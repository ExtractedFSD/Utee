"use server";

import { decideKitTransfer, transferRequestByToken } from "@/lib/kit-transfer";
import { createAdminClient } from "@/lib/supabase/admin";

/** The buyer's tap from the email page. The token is the credential; no sign-in. */
export async function decideByToken(token: string, approve: boolean) {
  const admin = createAdminClient();
  const found = await transferRequestByToken(admin, token);
  if (!found) return { outcome: "unavailable" as const, kitCode: "" };
  return decideKitTransfer(admin, found.request, approve, "email");
}
