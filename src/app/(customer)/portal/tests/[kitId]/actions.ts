"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { releaseKit } from "@/lib/kits";
import { issueReturnPostage, senderAddressFor } from "@/lib/postage";
import type { PostalAddress } from "@/lib/royalmail-request";
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

const addressSchema = z.object({
  firstName: z.string().trim().min(1).max(150),
  lastName: z.string().trim().min(1).max(150),
  addressLine1: z.string().trim().min(1).max(250),
  addressLine2: z.string().trim().max(250).optional(),
  city: z.string().trim().min(1).max(100),
  postcode: z.string().trim().min(5).max(10).transform((v) => v.toUpperCase().replace(/\s+/g, " ")),
});

/**
 * The patient asks for their return postage. The address on the label is
 * the order's, or the passport's, or the one they type here when neither
 * is known. Returns { needAddress } when the page should ask.
 */
export async function requestReturnPostage(kitId: string, typed?: PostalAddress): Promise<{ ok: true } | { needAddress: true; suggested: Partial<PostalAddress> } | { error: string }> {
  const user = await requireRole(["customer"]);
  const admin = createAdminClient();
  const { data: kit } = await admin.from("kits").select("id, code, status, customer_id, order_id").eq("id", kitId).maybeSingle();
  if (!kit || kit.customer_id !== user.id) return { error: "That kit isn't on your account." };

  let sender: PostalAddress | null = null;
  if (typed) {
    const parsed = addressSchema.safeParse(typed);
    if (!parsed.success) return { error: "Check the address: name, first line, town and a UK postcode are needed." };
    sender = { ...parsed.data, addressLine2: parsed.data.addressLine2 || undefined };
  } else {
    sender = await senderAddressFor(admin, kit, user.fullName);
    if (!sender) {
      const [first, ...rest] = (user.fullName ?? "").trim().split(/\s+/);
      return { needAddress: true, suggested: { firstName: first || "", lastName: rest.join(" ") } };
    }
  }
  const result = await issueReturnPostage(admin, kit, { id: user.id, role: user.role, email: user.email }, sender);
  if ("error" in result) return result;
  revalidatePath(`/portal/tests/${kitId}`);
  revalidatePath("/portal");
  return { ok: true };
}
