import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, PageHeader, StatusBadge, EmptyState, LinkButton, Callout, Notice } from "@/components/ui";
import { formatDate, formatMoney, type KitStatus } from "@/lib/status";

export default async function PortalHome({
  searchParams,
}: {
  searchParams: Promise<{ kit?: string; tracker?: string }>;
}) {
  const { kit: kitFlag, tracker: trackerFlag } = await searchParams;
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
        eyebrow="Your portal"
        title="Welcome back"
        subtitle="Track your tests, orders and subscriptions in one place."
      />

      {kitFlag === "not-yours" && (
        <Notice>
          That kit isn&apos;t linked to your account. If you believe this is a mistake,
          please contact us with your order number.
        </Notice>
      )}
      {kitFlag === "not-found" && (
        <Notice>We couldn&apos;t find that kit code. Please check the QR code or contact us.</Notice>
      )}
      {trackerFlag === "deleted" && <Notice tone="mint">Your tracker data has been deleted.</Notice>}

      <Callout className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-xl">
          <h3 className="font-display text-2xl font-light">UTI tracker</h3>
          <p className="text-sm text-white/85 mt-1 leading-relaxed">
            Keep a private record of your UTIs to show a GP or clinic, and spot your own patterns over time.
          </p>
        </div>
        <LinkButton href="/portal/tracker" variant="white">Open tracker</LinkButton>
      </Callout>

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
        <Callout>
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="relative aspect-square w-44 shrink-0 overflow-hidden rounded-2xl">
              <Image src="/images/urologist.jpg" alt="Consultant urologist" fill sizes="176px" className="object-cover object-[50%_25%]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-2xl font-light">Book a consultant urologist appointment</h3>
                <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.12em] text-white">£50</span>
              </div>
              <p className="text-sm text-white/85 mt-2 leading-relaxed">Discuss your Utee test result with a consultant urologist.</p>
              <p className="text-sm text-white/85 mt-2 leading-relaxed">
                During your telephone appointment, they’ll review your result alongside your symptoms, previous UTIs, antibiotic history and other relevant medical information to help determine the most appropriate next steps for you.
              </p>
              <p className="text-sm text-white/85 mt-2 mb-5 leading-relaxed">Where clinically appropriate, this may include a treatment plan and prescription.</p>
              <LinkButton href="#" variant="white">
                Coming soon
              </LinkButton>
            </div>
          </div>
        </Callout>
        <Callout>
          <div className="flex flex-col gap-5 sm:flex-row">
            {/* Placeholder until the product image is ready. */}
            <div className="flex aspect-square w-44 shrink-0 items-center justify-center rounded-2xl bg-white/15" aria-hidden>
              <Image src="/logo-white.png" alt="" width={96} height={40} className="opacity-70" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-2xl font-light">The Utee range</h3>
              <span className="mt-2 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.12em] text-white">From £19.99</span>
              <p className="text-sm font-semibold text-white mt-3 leading-relaxed">Urinary Tract Care, made for women.</p>
              <p className="text-sm text-white/85 mt-1 mb-5 leading-relaxed">D-Mannose sachets, Vaginal Probiotics and the On-The-Go pack.</p>
              <LinkButton href={storeUrl} variant="white" external>
                Shop supplements
              </LinkButton>
            </div>
          </div>
        </Callout>
      </div>
    </div>
  );
}
