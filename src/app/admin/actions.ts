"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logKitEvent, generateKitCode } from "@/lib/events";
import { applyTrackingEvent } from "@/lib/tracking";
import { sendEmail, emails } from "@/lib/email";
import { KIT_REVERT_MAP, type KitStatus } from "@/lib/status";

/** Pre-print a batch of kit QR labels (status 'created', unassigned stock). */
export async function createKitBatch(count: number) {
  await requireRole(["admin"]);
  if (!Number.isInteger(count) || count < 1 || count > 200) {
    return { error: "Choose between 1 and 200 kits" };
  }
  const admin = createAdminClient();

  // Codes are random, so a batch can collide with itself or with stock already
  // printed. Codes are unique in the database, which would otherwise fail the
  // whole insert — so de-duplicate within the batch and retry on a clash.
  let lastError = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const codes = new Set<string>();
    while (codes.size < count) codes.add(generateKitCode());
    const rows = [...codes].map((code) => ({ code }));

    const { error } = await admin.from("kits").insert(rows);
    if (!error) {
      revalidatePath("/admin/kits");
      return { ok: true, codes: rows.map((r) => r.code) };
    }
    // 23505 = unique_violation: a code already exists, so draw a fresh batch.
    if (error.code !== "23505") return { error: error.message };
    lastError = error.message;
  }
  return { error: `Could not generate unique kit codes — please try again (${lastError})` };
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

/**
 * Recovery tool for process mistakes (e.g. a lab pot mix-up): rolls a kit
 * back exactly one stage, voiding whatever data that stage produced. Super
 * admin only. Deliberately bypasses logKitEvent's status notifications so the
 * customer doesn't get re-sent stage emails when the kit moves forward again.
 */
export async function revertKitStage(kitId: string, reason: string) {
  const user = await requireRole(["admin"]);
  if (user.role !== "super_admin") {
    return { error: "Only a super admin can roll back a kit" };
  }
  if (!reason.trim()) return { error: "A reason is required for the audit log" };

  const admin = createAdminClient();
  const { data: kit } = await admin
    .from("kits")
    .select("id, code, status")
    .eq("id", kitId)
    .single();
  if (!kit) return { error: "Kit not found" };

  const from = kit.status as KitStatus;
  const target = KIT_REVERT_MAP[from];
  if (!target) return { error: `Status "${from}" can't be rolled back` };

  // Void the data the reverted stage produced.
  if (from === "report_ready") {
    // Patient may already have downloaded the report — unlink it and reopen.
    await admin
      .from("clinic_reports")
      .update({ status: "received", report_path: null, completed_at: null })
      .eq("kit_id", kitId);
  } else if (from === "clinic_received") {
    await admin.from("clinic_reports").delete().eq("kit_id", kitId);
  } else if (from === "lab_complete") {
    const { data: result } = await admin
      .from("lab_results")
      .select("report_path")
      .eq("kit_id", kitId)
      .maybeSingle();
    if (result?.report_path) {
      await admin.storage.from("lab-reports").remove([result.report_path]);
    }
    await admin.from("lab_results").delete().eq("kit_id", kitId);
  }

  const clearTimestamp: Partial<Record<KitStatus, string>> = {
    report_ready: "report_ready_at",
    lab_complete: "lab_complete_at",
    received_by_lab: "received_by_lab_at",
  };
  const update: Record<string, unknown> = { status: target };
  const tsColumn = clearTimestamp[from];
  if (tsColumn) update[tsColumn] = null;
  const { error: updateError } = await admin.from("kits").update(update).eq("id", kitId);
  if (updateError) return { error: updateError.message };

  await logKitEvent(admin, {
    kitId,
    type: "system",
    label: `Rolled back: ${from} → ${target}`,
    detail: `Reason: ${reason.trim()}. Data from the reverted stage was voided. Note: the customer may have received emails for the reverted stage.`,
    actorRole: user.role,
    actorId: user.id,
    visibleToCustomer: false,
  });

  revalidatePath(`/admin/kits/${kitId}`);
  revalidatePath("/admin");
  revalidatePath("/lab");
  revalidatePath("/clinic");
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
