"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/tracker/data";
import { copy } from "@/lib/tracker/copy";
import { SHARE_DURATIONS, expiresAtFor, makeShareCode } from "@/lib/tracker/share";

function revalidate() {
  revalidatePath("/portal/passport/share");
  revalidatePath("/portal/passport");
}

/** A new share code. Consent is given at the moment of sharing and kept with the share. */
export async function createShare(input: { label: string; days: number; consent: boolean }) {
  const user = await requireRole(["customer"]);
  const supabase = await createClient();
  const parsed = z.object({ label: z.string().trim().max(80), days: z.number().int(), consent: z.boolean() }).safeParse(input);
  if (!parsed.success) return { error: "Please check the form" };
  if (!parsed.data.consent) return { error: copy.share.consentRequired };
  if (!SHARE_DURATIONS.some((d) => d.days === parsed.data.days)) return { error: "Choose how long" };
  // The code is unique; on the vanishingly rare clash, try again.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = makeShareCode((n) => randomBytes(n));
    const { data, error } = await supabase
      .from("tracker_shares")
      .insert({ user_id: user.id, code, label: parsed.data.label || null, consent_text: copy.share.consentLabel, expires_at: expiresAtFor(parsed.data.days) })
      .select("id, code, expires_at")
      .maybeSingle();
    if (data) {
      await audit(supabase, user.id, "passport_shared", { share_id: data.id, days: parsed.data.days, label: parsed.data.label || null });
      revalidate();
      return { ok: true, id: data.id as string, code: data.code as string, expiresAt: data.expires_at as string };
    }
    if (error && !/duplicate|unique/i.test(error.message)) return { error: "Could not create the code. Please try again." };
  }
  return { error: "Could not create the code. Please try again." };
}

export async function revokeShare(id: string) {
  const user = await requireRole(["customer"]);
  const supabase = await createClient();
  if (!z.string().uuid().safeParse(id).success) return { error: "Not found" };
  const { error } = await supabase.from("tracker_shares").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).is("revoked_at", null);
  if (error) return { error: "Could not remove the code." };
  await audit(supabase, user.id, "passport_share_revoked", { share_id: id });
  revalidate();
  return { ok: true };
}
