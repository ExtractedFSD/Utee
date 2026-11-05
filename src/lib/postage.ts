import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logKitEvent } from "@/lib/events";
import { sendEmail, emails } from "@/lib/email";
import { formatKitCode } from "@/lib/kit-code";
import { createReturnLabel, type PostalAddress } from "@/lib/royalmail";
import { registerShipment, trackshipEnabled } from "@/lib/trackship";

/*
 * Return postage, bought when the patient is ready to post. The kit must
 * have its symptom form in (status 'activated') and not yet be on its way,
 * so a label is never made for a sample that can't be processed or has
 * already gone. The label is stored, the return shipment row points at its
 * tracking number (so the tracking webhooks move the kit as usual), the
 * number is registered for tracking, and the patient gets an email with a
 * link back to the kit page where the QR lives.
 */
export const POSTAGE_STATUSES = ["activated"] as const;

export type ReturnLabelRow = {
  id: string;
  kit_id: string;
  tracking_number: string;
  service_code: string;
  provider: "click_and_drop" | "stub";
  customer_reference: string;
  qr_png: string | null;
  label_pdf: string | null;
  sender: PostalAddress;
  created_at: string;
  replaced_at: string | null;
};

export function returnPostageCostPence(): number {
  const n = Number(process.env.RETURN_POSTAGE_COST_PENCE ?? "0");
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/** The current (unreplaced) label for a kit, if any. */
export async function currentReturnLabel(client: SupabaseClient, kitId: string): Promise<ReturnLabelRow | null> {
  const { data } = await client
    .from("return_labels")
    .select("id, kit_id, tracking_number, service_code, provider, customer_reference, qr_png, label_pdf, sender, created_at, replaced_at")
    .eq("kit_id", kitId)
    .is("replaced_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ReturnLabelRow | null) ?? null;
}

/**
 * The patient's address for the label: the order's shipping address when
 * the kit came from an order, else the passport's contact details, else
 * nothing (the page then asks for it).
 */
export async function senderAddressFor(admin: SupabaseClient, kit: { order_id: string | null; customer_id: string | null }, fullName: string | null): Promise<PostalAddress | null> {
  const [first, ...rest] = (fullName ?? "").trim().split(/\s+/);
  const name = { firstName: first || "Utee", lastName: rest.join(" ") || "Patient" };
  if (kit.order_id) {
    const { data: order } = await admin.from("orders").select("raw").eq("id", kit.order_id).maybeSingle();
    const ship = (order?.raw as { shipping_address?: Record<string, string | null> } | null)?.shipping_address;
    if (ship?.address1 && ship.city && ship.zip) {
      return {
        firstName: ship.first_name?.trim() || name.firstName,
        lastName: ship.last_name?.trim() || name.lastName,
        addressLine1: ship.address1.trim(),
        addressLine2: ship.address2?.trim() || undefined,
        city: ship.city.trim(),
        postcode: ship.zip.trim().toUpperCase(),
      };
    }
  }
  if (kit.customer_id) {
    const { data: profile } = await admin.from("tracker_profiles").select("address_line1, address_line2, city, postcode").eq("user_id", kit.customer_id).maybeSingle();
    if (profile?.address_line1 && profile.city && profile.postcode) {
      return { ...name, addressLine1: profile.address_line1, addressLine2: profile.address_line2 || undefined, city: profile.city, postcode: String(profile.postcode).toUpperCase() };
    }
  }
  return null;
}

export type IssueResult = { label: ReturnLabelRow } | { error: string };

/**
 * Creates the label and records everything about it. `replace` marks the
 * kit's existing label as superseded first (an admin reissuing a lost one);
 * without it a kit that already has a label gets that label back.
 */
export async function issueReturnPostage(
  admin: SupabaseClient,
  kit: { id: string; code: string; status: string; customer_id: string | null },
  actor: { id: string; role: string; email: string | null },
  sender: PostalAddress,
  opts: { replace?: boolean; notify?: string | null } = {}
): Promise<IssueResult> {
  if (!(POSTAGE_STATUSES as readonly string[]).includes(kit.status)) {
    return { error: kit.status === "delivered" || kit.status === "shipped" || kit.status === "assigned" ? "Complete the symptom form first, then get your postage." : "This kit is past the point where postage can be issued." };
  }
  const existing = await currentReturnLabel(admin, kit.id);
  if (existing && !opts.replace) return { label: existing };

  const reference = `UTEE ${formatKitCode(kit.code)}`;
  let made: Awaited<ReturnType<typeof createReturnLabel>>;
  try {
    made = await createReturnLabel({ reference, sender });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Royal Mail did not answer.";
    await logKitEvent(admin, { kitId: kit.id, type: "fulfilment", label: "Return postage could not be created", detail: message, actorRole: actor.role as never, actorId: actor.id, visibleToCustomer: false, metadata: { provider: "royal_mail" } });
    return { error: "We couldn't create your postage just now. Please try again in a few minutes, or contact us." };
  }

  const { data: inserted, error } = await admin
    .from("return_labels")
    .insert({
      kit_id: kit.id,
      tracking_number: made.trackingNumber,
      unique_item_id: made.uniqueItemId,
      service_code: made.serviceCode,
      provider: made.provider,
      customer_reference: reference,
      qr_png: made.qrPng,
      label_pdf: made.labelPdf,
      sender,
      requested_by: actor.id,
      requested_role: actor.role,
      cost_pence: returnPostageCostPence(),
    })
    .select("id, kit_id, tracking_number, service_code, provider, customer_reference, qr_png, label_pdf, sender, created_at, replaced_at")
    .single();
  if (error || !inserted) throw new Error(`return_labels insert failed: ${error?.message}`);
  const label = inserted as ReturnLabelRow;

  if (existing) {
    await admin.from("return_labels").update({ replaced_at: new Date().toISOString(), replaced_by: label.id }).eq("id", existing.id);
  }
  // The return shipment row is what the tracking webhooks look up by number.
  await admin.from("shipments").upsert({ kit_id: kit.id, direction: "return", tracking_number: made.trackingNumber, status: "pending", last_event: null }, { onConflict: "kit_id,direction" });

  await logKitEvent(admin, {
    kitId: kit.id,
    type: "fulfilment",
    label: existing ? "New return postage issued" : "Return postage ready",
    detail: existing ? `Replaces ${existing.tracking_number}. New tracking number ${made.trackingNumber}.` : `Tracking number ${made.trackingNumber}. Show the QR code at a Post Office, or print the label.`,
    actorRole: actor.role as never,
    actorId: actor.id,
    metadata: { provider: made.provider, trackingNumber: made.trackingNumber, serviceCode: made.serviceCode, reference, replaced: existing?.tracking_number ?? null },
  });

  if (trackshipEnabled()) {
    const result = await registerShipment({ trackingNumber: made.trackingNumber, orderRef: formatKitCode(kit.code) });
    await logKitEvent(admin, {
      kitId: kit.id,
      type: "tracking",
      label: result.ok ? `Tracking registered: ${made.trackingNumber}` : `Tracking registration failed: ${made.trackingNumber}`,
      detail: result.ok ? "TrackShip will post status updates for this parcel." : result.error,
      visibleToCustomer: false,
      metadata: { provider: "trackship", trackingNumber: made.trackingNumber, ok: result.ok, raw: result.raw ?? null },
    });
  }

  const to = opts.notify === undefined ? actor.email : opts.notify;
  if (to) {
    await sendEmail({ to, kitId: kit.id, kind: "returnPostage", ...emails.returnPostage(formatKitCode(kit.code), made.trackingNumber, kit.id) });
  }
  return { label };
}
