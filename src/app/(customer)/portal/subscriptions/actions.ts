"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { skipNextCharge, setNextChargeDate, cancelSubscription } from "@/lib/recharge";
import { sendEmail, emails } from "@/lib/email";
import { formatDate } from "@/lib/status";

async function ownedSubscription(subscriptionId: string) {
  const user = await requireRole(["customer"]);
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, recharge_subscription_id, product_title, customer_id, next_charge_scheduled_at")
    .eq("id", subscriptionId)
    .single();
  if (!sub || sub.customer_id !== user.id) throw new Error("Subscription not found");
  return { user, admin, sub };
}

export async function skipDelivery(subscriptionId: string) {
  const { user, admin, sub } = await ownedSubscription(subscriptionId);
  try {
    await skipNextCharge(sub.recharge_subscription_id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not skip delivery" };
  }
  await admin
    .from("subscriptions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sub.id);
  await sendEmail({
    to: user.email,
    ...emails.subscriptionChanged(
      "skipped",
      sub.product_title,
      "Your next delivery has been skipped. The following delivery will go ahead as scheduled."
    ),
  });
  revalidatePath("/portal/subscriptions");
  return { ok: true };
}

export async function delayDelivery(subscriptionId: string, newDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return { error: "Pick a valid date" };
  if (new Date(newDate) <= new Date()) return { error: "Choose a date in the future" };

  const { user, admin, sub } = await ownedSubscription(subscriptionId);
  try {
    await setNextChargeDate(sub.recharge_subscription_id, newDate);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not delay delivery" };
  }
  await admin
    .from("subscriptions")
    .update({ next_charge_scheduled_at: newDate, updated_at: new Date().toISOString() })
    .eq("id", sub.id);
  await sendEmail({
    to: user.email,
    ...emails.subscriptionChanged(
      "delayed",
      sub.product_title,
      `Your next delivery is now scheduled for ${formatDate(newDate)}.`
    ),
  });
  revalidatePath("/portal/subscriptions");
  return { ok: true };
}

export async function cancelSub(subscriptionId: string, reason: string) {
  const { user, admin, sub } = await ownedSubscription(subscriptionId);
  try {
    await cancelSubscription(sub.recharge_subscription_id, reason);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not cancel subscription" };
  }
  await admin
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", sub.id);
  await sendEmail({
    to: user.email,
    ...emails.subscriptionChanged(
      "cancelled",
      sub.product_title,
      "Your subscription has been cancelled and you won't be charged again. You can restart any time from your portal."
    ),
  });
  revalidatePath("/portal/subscriptions");
  return { ok: true };
}
