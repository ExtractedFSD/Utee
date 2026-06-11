import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, PageHeader, StatusBadge, EmptyState, LinkButton } from "@/components/ui";
import { formatDate, formatMoney, type KitStatus } from "@/lib/status";

export default async function PortalHome({
  searchParams,
}: {
  searchParams: Promise<{ kit?: string }>;
}) {
  const { kit: kitFlag } = await searchParams;
  const supabase = await createClient();

  const [{ data: kits }, { data: orders }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("kits")
      .select("id, code, status, created_at")
      .neq("status", "closed")
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("id, order_number, total_price, currency, placed_at, fulfillment_status")
      .order("placed_at", { ascending: false })
      .limit(3),
    supabase
      .from("subscriptions")
      .select("id, product_title, status, next_charge_scheduled_at")
      .eq("status", "active"),
  ]);

  const storeUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "#";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Welcome back"
        subtitle="Track your tests, orders and subscriptions in one place."
      />

      {kitFlag === "not-yours" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          That kit isn&apos;t linked to your account. If you believe this is a mistake,
          please contact us with your order number.
        </div>
      )}
      {kitFlag === "not-found" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          We couldn&apos;t find that kit code. Please check the QR code or contact us.
        </div>
      )}

      <Card>
        <CardTitle>Your test kits</CardTitle>
        {kits?.length ? (
          <ul className="divide-y divide-slate-100">
            {kits.map((kit) => (
              <li key={kit.id}>
                <Link
                  href={`/portal/tests/${kit.id}`}
                  className="flex items-center justify-between gap-4 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">Kit {kit.code}</p>
                    <p className="text-xs text-slate-400">Started {formatDate(kit.created_at)}</p>
                  </div>
                  <StatusBadge status={kit.status as KitStatus} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No active test kits"
            body="When you order a UTI test kit it will appear here once dispatched."
          />
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardTitle>Recent orders</CardTitle>
          {orders?.length ? (
            <ul className="divide-y divide-slate-100">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/portal/orders/${order.id}`}
                    className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{order.order_number}</p>
                      <p className="text-xs text-slate-400">{formatDate(order.placed_at)}</p>
                    </div>
                    <span className="text-sm text-slate-600">
                      {formatMoney(order.total_price, order.currency)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No orders yet" />
          )}
          <div className="pt-3">
            <Link href="/portal/orders" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View all orders →
            </Link>
          </div>
        </Card>

        <Card>
          <CardTitle>Subscriptions</CardTitle>
          {subscriptions?.length ? (
            <ul className="divide-y divide-slate-100">
              {subscriptions.map((sub) => (
                <li key={sub.id} className="py-3">
                  <p className="text-sm font-medium text-slate-900">{sub.product_title}</p>
                  <p className="text-xs text-slate-400">
                    Next delivery {formatDate(sub.next_charge_scheduled_at)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No active subscriptions"
              body="Subscribe to our supplements for ongoing preventative care."
            />
          )}
          <div className="pt-3">
            <Link
              href="/portal/subscriptions"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Manage subscriptions →
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-brand-50 border-brand-100">
          <h3 className="text-base font-semibold text-slate-900">Speak to a urologist</h3>
          <p className="text-sm text-slate-600 mt-1 mb-4">
            Book a 5-minute consultation to discuss your results or symptoms with a specialist.
          </p>
          <LinkButton href="#" variant="secondary">
            Coming soon
          </LinkButton>
        </Card>
        <Card className="bg-brand-50 border-brand-100">
          <h3 className="text-base font-semibold text-slate-900">Preventative care</h3>
          <p className="text-sm text-slate-600 mt-1 mb-4">
            Our supplements support urinary tract health and help prevent recurrence.
          </p>
          <LinkButton href={storeUrl} external>
            Shop supplements
          </LinkButton>
        </Card>
      </div>
    </div>
  );
}
