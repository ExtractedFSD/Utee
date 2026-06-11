const RECHARGE_API = "https://api.rechargeapps.com";

async function rechargeFetch(path: string, init?: RequestInit) {
  const token = process.env.RECHARGE_API_TOKEN;
  if (!token) throw new Error("RECHARGE_API_TOKEN is not configured");

  const res = await fetch(`${RECHARGE_API}${path}`, {
    ...init,
    headers: {
      "X-Recharge-Access-Token": token,
      "X-Recharge-Version": "2021-11",
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Recharge ${init?.method ?? "GET"} ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}

export type RechargeSubscription = {
  id: number;
  customer_id: number;
  email?: string;
  product_title: string;
  variant_title: string | null;
  price: string;
  presentment_currency?: string;
  status: string;
  order_interval_unit: string;
  order_interval_frequency: number;
  next_charge_scheduled_at: string | null;
};

export async function getSubscriptionsByEmail(email: string): Promise<RechargeSubscription[]> {
  const { customers } = await rechargeFetch(
    `/customers?email=${encodeURIComponent(email)}`
  );
  if (!customers?.length) return [];
  const { subscriptions } = await rechargeFetch(
    `/subscriptions?customer_id=${customers[0].id}&limit=250`
  );
  return subscriptions ?? [];
}

/** Skip the next upcoming charge for a subscription. */
export async function skipNextCharge(subscriptionId: string) {
  const { charges } = await rechargeFetch(
    `/charges?subscription_id=${subscriptionId}&status=queued&sort_by=scheduled_at-asc&limit=1`
  );
  if (!charges?.length) throw new Error("No upcoming charge found to skip");
  return rechargeFetch(`/charges/${charges[0].id}/skip`, {
    method: "POST",
    body: JSON.stringify({ purchase_item_ids: [Number(subscriptionId)] }),
  });
}

/** Delay: move the next charge date (YYYY-MM-DD). */
export async function setNextChargeDate(subscriptionId: string, date: string) {
  return rechargeFetch(`/subscriptions/${subscriptionId}/set_next_charge_date`, {
    method: "POST",
    body: JSON.stringify({ date }),
  });
}

export async function cancelSubscription(subscriptionId: string, reason: string) {
  return rechargeFetch(`/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    body: JSON.stringify({
      cancellation_reason: reason || "Cancelled via Utee portal",
    }),
  });
}

export async function reactivateSubscription(subscriptionId: string) {
  return rechargeFetch(`/subscriptions/${subscriptionId}/activate`, { method: "POST" });
}
