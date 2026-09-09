import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyShopifyWebhook, isTestKitLineItem } from "@/lib/shopify";
import { sendEmail, emails } from "@/lib/email";

/**
 * Shopify webhooks. Register these topics pointing at this endpoint:
 *   - orders/create  → upserts the order, auto-creates the customer account,
 *                      sends the portal welcome email
 *   - orders/updated → keeps financial/fulfilment status in sync
 */
const HANDLED_TOPICS = new Set(["orders/create", "orders/updated"]);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  if (!verifyShopifyWebhook(rawBody, hmac)) {
    return NextResponse.json({ error: "invalid hmac" }, { status: 401 });
  }

  // Only order topics carry an order payload. Anything else registered
  // against this URL (refunds, the mandatory GDPR redact topics, ...) must be
  // acknowledged and ignored, not upserted as a junk order.
  const topic = req.headers.get("x-shopify-topic") ?? "";
  if (!HANDLED_TOPICS.has(topic)) {
    return NextResponse.json({ ok: true, skipped: `unhandled topic ${topic || "(none)"}` });
  }

  const order = JSON.parse(rawBody);
  const admin = createAdminClient();

  const email: string | undefined = order.email ?? order.customer?.email;
  if (!email) return NextResponse.json({ ok: true, skipped: "no email" });

  // 1. Ensure a portal account exists for this customer.
  let customerId: string | null = null;
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (existing) {
    customerId = existing.id;
  } else {
    const fullName = [order.customer?.first_name, order.customer?.last_name]
      .filter(Boolean)
      .join(" ");
    const { data: created, error } = await admin.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: true,
      user_metadata: {
        role: "customer",
        full_name: fullName || null,
        shopify_customer_id: order.customer?.id ? String(order.customer.id) : null,
      },
    });
    if (error || !created.user) {
      console.error("[shopify webhook] createUser failed", error);
      return NextResponse.json({ error: "user creation failed" }, { status: 500 });
    }
    customerId = created.user.id;
  }

  // 2. Upsert the order + line items.
  const lineItems: Array<{
    id: number;
    title: string;
    sku: string | null;
    quantity: number;
    price: string;
  }> = order.line_items ?? [];
  const containsTestKit = lineItems.some(isTestKitLineItem);

  const { data: savedOrder, error: orderError } = await admin
    .from("orders")
    .upsert(
      {
        shopify_order_id: String(order.id),
        order_number: String(order.name ?? order.order_number ?? order.id),
        customer_id: customerId,
        email: email.toLowerCase(),
        total_price: Number(order.total_price ?? 0),
        currency: order.currency ?? "GBP",
        financial_status: order.financial_status ?? null,
        fulfillment_status: order.fulfillment_status ?? null,
        contains_test_kit: containsTestKit,
        placed_at: order.created_at ?? new Date().toISOString(),
        raw: order,
      },
      { onConflict: "shopify_order_id" }
    )
    .select("id")
    .single();
  if (orderError || !savedOrder) {
    console.error("[shopify webhook] order upsert failed", orderError);
    return NextResponse.json({ error: "order upsert failed" }, { status: 500 });
  }

  if (topic === "orders/create") {
    await admin.from("order_items").delete().eq("order_id", savedOrder.id);
    if (lineItems.length) {
      await admin.from("order_items").insert(
        lineItems.map((item) => ({
          order_id: savedOrder.id,
          shopify_line_item_id: String(item.id),
          title: item.title,
          sku: item.sku ?? null,
          quantity: item.quantity,
          price: Number(item.price ?? 0),
          is_test_kit: isTestKitLineItem(item),
        }))
      );
    }

    // 3. Welcome the customer into the portal on their first order. Decided
    //    from the orders table rather than "did we just create the account":
    //    if the order upsert failed after the account was created, Shopify's
    //    retry finds an existing profile but must still send the welcome.
    const { count: otherOrders } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .neq("id", savedOrder.id);
    if (otherOrders === 0) {
      await sendEmail({
        to: email,
        ...emails.portalWelcome(String(order.name ?? order.id)),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
