import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, PageHeader, StatusBadge, Pill, EmptyState } from "@/components/ui";
import { formatDate, formatMoney, type KitStatus } from "@/lib/status";

/** Customer-service deep dive: everything we know about one patient. */
export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole(["admin"]);
  const admin = createAdminClient();

  const { data: patient } = await admin
    .from("profiles")
    .select("id, full_name, email, shopify_customer_id, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!patient) notFound();

  const [{ data: orders }, { data: kits }, { data: subscriptions }] = await Promise.all([
    admin
      .from("orders")
      .select("id, order_number, total_price, currency, placed_at, fulfillment_status")
      .eq("customer_id", id)
      .order("placed_at", { ascending: false }),
    admin
      .from("kits")
      .select("id, code, status, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("subscriptions")
      .select("id, product_title, status, next_charge_scheduled_at, price, currency")
      .eq("customer_id", id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={patient.full_name ?? patient.email}
        subtitle={`${patient.email} · customer since ${formatDate(patient.created_at)}${
          patient.shopify_customer_id ? ` · Shopify #${patient.shopify_customer_id}` : ""
        }`}
      />

      <Card>
        <CardTitle>Test kits</CardTitle>
        {kits?.length ? (
          <ul className="divide-y divide-slate-100">
            {kits.map((kit) => (
              <li key={kit.id}>
                <Link
                  href={`/admin/kits/${kit.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl"
                >
                  <p className="text-sm font-mono font-medium text-slate-900">{kit.code}</p>
                  <StatusBadge status={kit.status as KitStatus} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No test kits" />
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardTitle>Orders</CardTitle>
          {orders?.length ? (
            <ul className="divide-y divide-slate-100">
              {orders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{order.order_number}</p>
                    <p className="text-xs text-slate-400">{formatDate(order.placed_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill tone={order.fulfillment_status === "fulfilled" ? "green" : "amber"}>
                      {order.fulfillment_status ?? "processing"}
                    </Pill>
                    <span className="text-sm text-slate-600">
                      {formatMoney(order.total_price, order.currency)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No orders" />
          )}
        </Card>

        <Card>
          <CardTitle>Subscriptions</CardTitle>
          {subscriptions?.length ? (
            <ul className="divide-y divide-slate-100">
              {subscriptions.map((sub) => (
                <li key={sub.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{sub.product_title}</p>
                    <p className="text-xs text-slate-400">
                      Next: {formatDate(sub.next_charge_scheduled_at)}
                    </p>
                  </div>
                  <Pill tone={sub.status === "active" ? "green" : "slate"}>{sub.status}</Pill>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No subscriptions" />
          )}
        </Card>
      </div>
    </div>
  );
}
