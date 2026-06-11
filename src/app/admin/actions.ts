"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logKitEvent, generateKitCode } from "@/lib/events";
import { applyTrackingEvent } from "@/lib/tracking";
import { sendEmail, emails } from "@/lib/email";

/** Pre-print a batch of kit QR labels (status 'created', unassigned stock). */
export async function createKitBatch(count: number) {
  await requireRole(["admin"]);
  if (!Number.isInteger(count) || count < 1 || count > 200) {
    return { error: "Choose between 1 and 200 kits" };
  }
  const admin = createAdminClient();
  const rows = Array.from({ length: count }, () => ({ code: generateKitCode() }));
  const { error } = await admin.from("kits").insert(rows);
  if (error) return { error: error.message };
  revalidatePath("/admin/kits");
  return { ok: true, codes: rows.map((r) => r.code) };
}

/**
 * Fulfilment step: link a pre-printed kit to an order, record both tracking
 * numbers, mark it dispatched and email the patient their instructions.
 */
export async function dispatchKit(input: {
  kitCode: string;
  orderNumber: string;
  outboundTracking: string;
  returnTracking: string;
}) {
  const user = await requireRole(["admin"]);
  const admin = createAdminClient();

  const kitCode = input.kitCode.trim().toUpperCase();
  const { data: kit } = await admin
    .from("kits")
    .select("id, status")
    .eq("code", kitCode)
    .maybeSingle();
  if (!kit) return { error: `Kit ${kitCode} not found — create a batch first` };
  if (kit.status !== "created") return { error: `Kit ${kitCode} is already assigned` };

  const { data: order } = await admin
    .from("orders")
    .select("id, order_number, customer_id, email, contains_test_kit")
    .eq("order_number", input.orderNumber.trim())
    .maybeSingle();
  if (!order) return { error: `Order ${input.orderNumber} not found` };
  if (!order.customer_id) return { error: "Order has no linked customer account" };

  const outbound = input.outboundTracking.trim();
  const returnTrk = input.returnTracking.trim();
  if (!outbound || !returnTrk) return { error: "Both tracking numbers are required" };

  const { error: updateError } = await admin
    .from("kits")
    .update({
      order_id: order.id,
      customer_id: order.customer_id,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", kit.id);
  if (updateError) return { error: updateError.message };

  const { error: shipmentError } = await admin.from("shipments").insert([
    { kit_id: kit.id, direction: "outbound", tracking_number: outbound },
    { kit_id: kit.id, direction: "return", tracking_number: returnTrk },
  ]);
  if (shipmentError) return { error: shipmentError.message };

  await logKitEvent(admin, {
    kitId: kit.id,
    type: "fulfilment",
    label: `Kit assigned to order ${order.order_number}`,
    actorRole: "admin",
    actorId: user.id,
    visibleToCustomer: false,
    newStatus: "assigned",
  });
  await logKitEvent(admin, {
    kitId: kit.id,
    type: "fulfilment",
    label: "Your test kit has been dispatched",
    detail: "Sent via Royal Mail Tracked. Scan the QR code inside before taking your sample.",
    actorRole: "admin",
    actorId: user.id,
    newStatus: "shipped",
  });

  await sendEmail({ to: order.email, ...emails.kitShipped(kitCode, outbound) });

  revalidatePath("/admin/kits");
  return { ok: true };
}

/** Close a kit (e.g. lost in post, customer support resolution). */
export async function closeKit(kitId: string, reason: string) {
  const user = await requireRole(["admin"]);
  const admin = createAdminClient();
  await logKitEvent(admin, {
    kitId,
    type: "system",
    label: "Case closed",
    detail: reason || undefined,
    actorRole: "admin",
    actorId: user.id,
    visibleToCustomer: false,
    newStatus: "closed",
  });
  revalidatePath(`/admin/kits/${kitId}`);
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Dev helper: simulate the next carrier scan when TRACKING_PROVIDER=mock,
 * so the whole journey can be demoed without Royal Mail integration.
 */
export async function simulateTracking(
  kitId: string,
  direction: "outbound" | "return",
  milestone: "in_transit" | "delivered"
) {
  await requireRole(["admin"]);
  if (process.env.TRACKING_PROVIDER !== "mock") {
    return { error: "Simulation only available when TRACKING_PROVIDER=mock" };
  }
  const admin = createAdminClient();
  const { data: shipment } = await admin
    .from("shipments")
    .select("tracking_number")
    .eq("kit_id", kitId)
    .eq("direction", direction)
    .single();
  if (!shipment) return { error: "No shipment found" };

  await applyTrackingEvent(admin, {
    trackingNumber: shipment.tracking_number,
    status: milestone,
    description:
      milestone === "delivered"
        ? direction === "outbound"
          ? "Delivered to your address"
          : "Delivered to laboratory"
        : direction === "outbound"
          ? "Item in transit"
          : "Return parcel accepted at Post Office",
    occurredAt: new Date().toISOString(),
    location: "Royal Mail network (simulated)",
  });
  revalidatePath(`/admin/kits/${kitId}`);
  return { ok: true };
}
