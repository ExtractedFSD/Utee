import { SupabaseClient } from "@supabase/supabase-js";
import { logKitEvent } from "@/lib/events";
import { sendEmail, emails } from "@/lib/email";
import { formatKitCode } from "@/lib/kit-code";

export { formatKitCode, generateKitCode, kitCodeFromPath, normalizeKitCode } from "@/lib/kit-code";

/** Statuses a kit can hold before it is assigned to anyone. */
export const UNASSIGNED_STATUSES = ["generated", "printed", "voided"] as const;

type ClaimableKit = { status: string; customer_id: string | null; released_at?: string | null };

/** Where a kit can be before anyone has used it: the buyer can still hand it on. */
export const PRE_TRIAGE_STATUSES = ["assigned", "shipped", "delivered"] as const;

/**
 * A kit can be claimed by whoever scans it when nobody owns it: either it
 * was never assigned to an order (sold through a retailer or another
 * marketplace rather than the Utee store), or the buyer released it for
 * someone else. Store kits are assigned at dispatch, so they can never be
 * claimed by a stranger unless the buyer lets go of them.
 */
export function isClaimable<T extends ClaimableKit>(kit: T | null | undefined): kit is T {
  if (!kit || kit.customer_id !== null) return false;
  return kit.status === "printed" || (!!kit.released_at && (PRE_TRIAGE_STATUSES as readonly string[]).includes(kit.status));
}

export async function findClaimableKit(admin: SupabaseClient, code: string) {
  const { data: kit } = await admin
    .from("kits")
    .select("id, code, status, customer_id, released_at")
    .eq("code", code)
    .maybeSingle();
  return isClaimable(kit) ? kit : null;
}

/**
 * Links an unassigned kit to the customer who scanned it. The update is
 * guarded on the kit still being unclaimed, so two people scanning the same
 * code can't both win. Returns false when the kit was claimed in the meantime.
 *
 * The kit is already in the customer's hands, so it goes straight to
 * 'delivered' (the state a store kit reaches after the outbound parcel is
 * delivered) and the normal triage → lab → clinic journey continues from there.
 */
export async function claimKit(
  admin: SupabaseClient,
  kit: { id: string; code: string },
  customer: { id: string; email: string }
): Promise<boolean> {
  const { data: claimed, error } = await admin
    .from("kits")
    .update({
      customer_id: customer.id,
      status: "delivered",
      assigned_at: new Date().toISOString(),
    })
    .eq("id", kit.id)
    .in("status", ["printed", ...PRE_TRIAGE_STATUSES])
    .is("customer_id", null)
    .select("id, released_at");
  if (error) throw new Error(`kit claim failed: ${error.message}`);
  if (!claimed?.length) return false;

  const released = !!claimed[0].released_at;
  await logKitEvent(admin, {
    kitId: kit.id,
    type: "fulfilment",
    label: "Kit linked to your account",
    detail: released ? "Passed on by the person who ordered it, and registered by scanning the QR code." : "Registered by scanning the QR code on the kit.",
    actorRole: "customer",
    actorId: customer.id,
    metadata: { channel: released ? "released_claim" : "retail_claim" },
  });

  await sendEmail({ to: customer.email, kitId: kit.id, kind: "kitClaimed", ...emails.kitClaimed(formatKitCode(kit.code)) });
  return true;
}

/**
 * The buyer hands an unused online kit to someone else. The kit loses its
 * owner (so it drops out of the buyer's portal and nothing they do can reach
 * it) and becomes claimable by the next person to scan it. Guarded on the
 * buyer still owning it and no symptom form having been submitted, so a
 * half-done test can't change hands. Returns the reason when it can't.
 */
export async function releaseKit(
  admin: SupabaseClient,
  kitId: string,
  buyer: { id: string; email: string },
  recipientEmail: string | null
): Promise<{ code: string } | { error: string }> {
  const { data: kit } = await admin.from("kits").select("id, code, status, customer_id").eq("id", kitId).maybeSingle();
  if (!kit || kit.customer_id !== buyer.id) return { error: "That kit isn't on your account." };
  if (!(PRE_TRIAGE_STATUSES as readonly string[]).includes(kit.status)) return { error: "This kit has already been used, so it can't be passed on." };
  const { data: triage } = await admin.from("triage_submissions").select("id").eq("kit_id", kit.id).maybeSingle();
  if (triage) return { error: "A symptom form has already been submitted for this kit, so it can't be passed on." };

  const { data: released, error } = await admin
    .from("kits")
    .update({ customer_id: null, released_at: new Date().toISOString(), released_by: buyer.id })
    .eq("id", kit.id)
    .eq("customer_id", buyer.id)
    .in("status", [...PRE_TRIAGE_STATUSES])
    .select("id");
  if (error) throw new Error(`kit release failed: ${error.message}`);
  if (!released?.length) return { error: "That kit isn't on your account." };

  await logKitEvent(admin, {
    kitId: kit.id,
    type: "fulfilment",
    label: "Kit passed on by the person who ordered it",
    detail: recipientEmail ? `The code was emailed to ${recipientEmail}.` : "They will give the code to the person taking the test.",
    actorRole: "customer",
    actorId: buyer.id,
    visibleToCustomer: false,
    metadata: { channel: "release", recipient_email: recipientEmail },
  });

  const shown = formatKitCode(kit.code);
  if (recipientEmail) {
    await sendEmail({ to: recipientEmail, kitId: kit.id, kind: "kitPassedOn", ...emails.kitPassedOn(shown, kit.code) });
  }
  await sendEmail({ to: buyer.email, kitId: kit.id, kind: "kitReleased", ...emails.kitReleased(shown, recipientEmail) });
  return { code: kit.code };
}
