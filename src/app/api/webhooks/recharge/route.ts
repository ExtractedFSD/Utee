import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Recharge webhooks — register subscription/created, subscription/updated,
 * subscription/cancelled and charge/upcoming pointing here. Keeps the local
 * subscriptions cache in sync so the portal renders instantly without
 * calling Recharge on every page view.
 */

/** Constant-time comparison that never throws on a malformed header. */
function signatureMatches(expectedHex: string, providedHex: string | null): boolean {
  if (!providedHex) return false;
  const expected = Buffer.from(expectedHex, "utf8");
  const provided = Buffer.from(providedHex.trim(), "utf8");
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Recharge signs webhooks with HMAC-SHA256 of the raw body using the webhook
  // client secret (Recharge admin > API tokens > webhooks), which is a
  // different value from the API access token — hence its own env var, with a
  // fallback so deployments that only set RECHARGE_API_TOKEN keep working.
  // An unsigned request is never trusted: this endpoint can write subscription
  // rows and link them to a customer by email.
  const secret = process.env.RECHARGE_WEBHOOK_SECRET || process.env.RECHARGE_API_TOKEN;
  if (!secret) {
    console.error("[recharge webhook] no RECHARGE_WEBHOOK_SECRET configured — rejecting");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (!signatureMatches(digest, req.headers.get("x-recharge-hmac-sha256"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
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

  const { error: upsertError } = await admin.from("subscriptions").upsert(
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
  // Fail loudly so Recharge retries — a silent 200 would leave the local
  // subscriptions cache permanently out of step with Recharge.
  if (upsertError) {
    console.error("[recharge webhook] subscription upsert failed", upsertError);
    return NextResponse.json({ error: "subscription upsert failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
