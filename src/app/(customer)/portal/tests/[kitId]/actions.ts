"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { releaseKit } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The buyer passes an unused kit to the person who will take the test. The
 * kit leaves their account; the recipient registers it by scanning, under
 * their own email, so the symptoms and result are theirs alone.
 */
export async function passOnKit(kitId: string, recipientEmail: string): Promise<{ code: string } | { error: string }> {
  const user = await requireRole(["customer"]);
  const trimmed = recipientEmail.trim().toLowerCase();
  let recipient: string | null = null;
  if (trimmed) {
    const parsed = z.string().email().safeParse(trimmed);
    if (!parsed.success) return { error: "That email address doesn't look right." };
    if (parsed.data === (user.email ?? "").toLowerCase()) return { error: "That's your own email. Enter the address of the person taking the test, or leave it blank and give them the code." };
    recipient = parsed.data;
  }
  const result = await releaseKit(createAdminClient(), kitId, { id: user.id, email: user.email ?? "" }, recipient);
  if ("code" in result) {
    revalidatePath("/portal");
    revalidatePath(`/portal/tests/${kitId}`);
  }
  return result;
}
