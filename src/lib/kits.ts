import { SupabaseClient } from "@supabase/supabase-js";
import { logKitEvent } from "@/lib/events";
import { sendEmail, emails } from "@/lib/email";

/** Printed kit code format: UT- plus six characters from the label alphabet. */
export const KIT_CODE_RE = /^UT-[A-HJKMNP-Z2-9]{6}$/;

export function normalizeKitCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return KIT_CODE_RE.test(code) ? code : null;
}

/** Extracts the kit code from a QR landing path such as "/k/UT-7K3F9Q". */
export function kitCodeFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const match = /^\/k\/([^/?#]+)/.exec(path);
  if (!match) return null;
  try {
    return normalizeKitCode(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

type ClaimableKit = { id: string; code: string; status: string; customer_id: string | null };

/**
 * A kit can be claimed by whoever scans it when it was never assigned to an
 * order — i.e. it was sold through a retailer or another marketplace rather
 * than the Utee store. Store kits are assigned at dispatch, so they can never
 * be claimed by a stranger.
 */
export function isClaimable(kit: ClaimableKit | null | undefined): kit is ClaimableKit {
  return !!kit && kit.status === "created" && kit.customer_id === null;
}

export async function findClaimableKit(admin: SupabaseClient, code: string) {
  const { data: kit } = await admin
    .from("kits")
    .select("id, code, status, customer_id")
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
    .eq("status", "created")
    .is("customer_id", null)
    .select("id");
  if (error) throw new Error(`kit claim failed: ${error.message}`);
  if (!claimed?.length) return false;

  await logKitEvent(admin, {
    kitId: kit.id,
    type: "fulfilment",
    label: "Kit linked to your account",
    detail: "Registered by scanning the QR code on the kit.",
    actorRole: "customer",
    actorId: customer.id,
    metadata: { channel: "retail_claim" },
  });

  await sendEmail({ to: customer.email, ...emails.kitClaimed(kit.code) });
  return true;
}
