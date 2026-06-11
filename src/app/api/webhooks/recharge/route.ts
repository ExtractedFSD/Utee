import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Recharge webhooks — register subscription/created, subscription/updated,
 * subscription/cancelled and charge/upcoming pointing here. Keeps the local
 * subscriptions cache in sync so the portal renders instantly without
 * calling Recharge on every page view.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Recharge signs webhooks with HMAC-SHA256 of the body using your API client secret.
  const signature = req.headers.get("x-recharge-hmac-sha256");
  const secret = process.env.RECHARGE_API_TOKEN;
  if (secret && signature) {
    const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (digest !== signature) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  const payload = JSON.parse(rawBody);
  const subscription = payload.subscription;
  if (!subscription?.id) return NextResponse.json({ ok: true, skipped: true });

  const admin = createAdminClient();

  const email: string | undefined = subscription.email;
  let customerId: string | null = null;
  if (email) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    customerId = profile?.id ?? null;
  }

  await admin.from("subscriptions").upsert(
    {
      recharge_subscription_id: String(subscription.id),
      recharge_customer_id: subscription.customer_id ? String(subscription.customer_id) : null,
      customer_id: customerId,
      email: email?.toLowerCase() ?? null,
      product_title: subscription.product_title ?? "Subscription",
      variant_title: subscription.variant_title ?? null,
      price: subscription.price ? Number(subscription.price) : null,
      currency: subscription.presentment_currency ?? "GBP",
      status: subscription.status?.toLowerCase() ?? "active",
      order_interval_unit: subscription.order_interval_unit ?? null,
      order_interval_frequency: subscription.order_interval_frequency
        ? Number(subscription.order_interval_frequency)
        : null,
      next_charge_scheduled_at: subscription.next_charge_scheduled_at
        ? String(subscription.next_charge_scheduled_at).slice(0, 10)
        : null,
      raw: subscription,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "recharge_subscription_id" }
  );

  return NextResponse.json({ ok: true });
}
