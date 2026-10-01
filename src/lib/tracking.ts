import { SupabaseClient } from "@supabase/supabase-js";
import { logKitEvent } from "@/lib/events";
import { emails, sendEmail } from "@/lib/email";
import { formatKitCode } from "@/lib/kit-code";

/**
 * Parcel tracking abstraction.
 *
 * Production: Royal Mail Tracked both ways. Point Royal Mail's Tracking API
 * push notifications (or an aggregator like AfterShip) at
 * POST /api/webhooks/tracking with the shared secret header, see
 * applyTrackingEvent below for the expected payload.
 *
 * Local dev: TRACKING_PROVIDER=mock lets admins advance shipments manually
 * from the admin kit page.
 */

export type TrackingEvent = {
  trackingNumber: string;
  status: "in_transit" | "out_for_delivery" | "delivered" | "exception";
  description: string;
  occurredAt: string; // ISO timestamp
  location?: string;
};

/**
 * Records a carrier event against the matching shipment and advances the kit
 * status when the milestone warrants it (outbound delivered / return moving).
 */
export async function applyTrackingEvent(
  admin: SupabaseClient,
  event: TrackingEvent
): Promise<{ matched: boolean; error?: string }> {
  // Tracking numbers are unique per shipment (enforced by the database), but
  // never use .single() here: a lookup error must be reported, not turned
  // into a silent "no match" that the carrier would never retry.
  const { data: shipments, error: lookupError } = await admin
    .from("shipments")
    .select("id, kit_id, direction, status, events, kits:kit_id(status, code)")
    .eq("tracking_number", event.trackingNumber)
    .limit(2);
  if (lookupError) {
    console.error("[tracking] shipment lookup failed", lookupError);
    return { matched: false, error: "shipment lookup failed" };
  }
  if (!shipments?.length) return { matched: false };
  if (shipments.length > 1) {
    console.error(`[tracking] tracking number ${event.trackingNumber} matches multiple shipments`);
    return { matched: false, error: "ambiguous tracking number" };
  }
  const shipment = shipments[0];

  const events = [...(shipment.events as unknown[]), event];
  const { error: updateError } = await admin
    .from("shipments")
    .update({
      status: event.status,
      last_event: event.description,
      events,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shipment.id);
  if (updateError) {
    console.error("[tracking] shipment update failed", updateError);
    return { matched: true, error: "shipment update failed" };
  }

  const kit = shipment.kits as unknown as { status: string; code: string } | null;
  const isOutbound = shipment.direction === "outbound";
  const alreadyDelivered = (shipment.events as { status?: string }[]).some((e) => e?.status === "delivered");

  if (isOutbound && event.status === "delivered" && kit?.status === "shipped") {
    await logKitEvent(admin, {
      kitId: shipment.kit_id,
      type: "tracking",
      label: "Kit delivered",
      detail: event.description,
      newStatus: "delivered",
    });
  } else if (!isOutbound && event.status === "in_transit" && kit?.status === "activated") {
    await logKitEvent(admin, {
      kitId: shipment.kit_id,
      type: "tracking",
      label: "Sample on its way to the lab",
      detail: event.description,
      newStatus: "in_transit_to_lab",
    });
  } else {
    // Intermediate scan: show it on the customer timeline without a status change.
    await logKitEvent(admin, {
      kitId: shipment.kit_id,
      type: "tracking",
      label: event.description,
      detail: event.location,
      metadata: { trackingNumber: event.trackingNumber, status: event.status },
    });
    // The sample has reached the lab's door; the lab still confirms by scanning.
    const labEmail = process.env.LAB_NOTIFICATION_EMAIL;
    if (!isOutbound && event.status === "delivered" && !alreadyDelivered && labEmail && kit &&
      ["activated", "in_transit_to_lab"].includes(kit.status)) {
      await sendEmail({ to: labEmail, kitId: shipment.kit_id, kind: "labSpecimenDelivered", ...emails.labSpecimenDelivered(formatKitCode(kit.code)) });
    }
  }

  return { matched: true };
}

export function royalMailTrackingUrl(trackingNumber: string) {
  return `https://www.royalmail.com/track-your-item#/tracking-results/${trackingNumber}`;
}
