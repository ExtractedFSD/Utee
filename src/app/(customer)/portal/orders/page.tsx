import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, Pill, EmptyState } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/status";

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, total_price, currency, placed_at, fulfillment_status, contains_test_kit")
    .order("placed_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader title="Your orders" />
      <Card>
        {orders?.length ? (
          <ul className="divide-y divide-slate-100">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/portal/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-slate-50 -mx-2 px-2 rounded-xl"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{order.order_number}</p>
                    <p className="text-xs text-slate-400">{formatDate(order.placed_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {order.contains_test_kit && <Pill tone="brand">Test kit</Pill>}
                    <Pill tone={order.fulfillment_status === "fulfilled" ? "green" : "amber"}>
                      {order.fulfillment_status ?? "processing"}
                    </Pill>
                    <span className="text-sm text-slate-600">
                      {formatMoney(order.total_price, order.currency)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No orders yet" />
        )}
      </Card>
    </div>
  );
}
