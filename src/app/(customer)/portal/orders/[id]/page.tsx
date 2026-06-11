import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, PageHeader, Pill, StatusBadge } from "@/components/ui";
import { formatDate, formatMoney, type KitStatus } from "@/lib/status";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .single();
  if (!order) notFound();

  const { data: kits } = await supabase
    .from("kits")
    .select("id, code, status")
    .eq("order_id", id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Order ${order.order_number}`}
        subtitle={`Placed ${formatDate(order.placed_at)}`}
      />

      <Card>
        <CardTitle>Items</CardTitle>
        <ul className="divide-y divide-slate-100">
          {order.order_items.map(
            (item: {
              id: string;
              title: string;
              quantity: number;
              price: number;
              is_test_kit: boolean;
            }) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-900">
                    {item.title} <span className="text-slate-400">× {item.quantity}</span>
                  </p>
                  {item.is_test_kit && <Pill tone="brand">Test kit</Pill>}
                </div>
                <span className="text-sm text-slate-600">
                  {formatMoney(item.price, order.currency)}
                </span>
              </li>
            )
          )}
        </ul>
        <div className="flex justify-between border-t border-slate-200 pt-3 mt-2">
          <span className="text-sm font-medium text-slate-900">Total</span>
          <span className="text-sm font-semibold text-slate-900">
            {formatMoney(order.total_price, order.currency)}
          </span>
        </div>
      </Card>

      {kits && kits.length > 0 && (
        <Card>
          <CardTitle>Test kits in this order</CardTitle>
          <ul className="divide-y divide-slate-100">
            {kits.map((kit) => (
              <li key={kit.id}>
                <Link
                  href={`/portal/tests/${kit.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl"
                >
                  <p className="text-sm font-medium text-slate-900">Kit {kit.code}</p>
                  <StatusBadge status={kit.status as KitStatus} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
