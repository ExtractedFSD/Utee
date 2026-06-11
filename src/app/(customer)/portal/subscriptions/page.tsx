import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, EmptyState, LinkButton } from "@/components/ui";
import { SubscriptionCard, type SubscriptionRow } from "./SubscriptionCard";

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select(
      "id, product_title, variant_title, price, currency, status, order_interval_unit, order_interval_frequency, next_charge_scheduled_at"
    )
    .order("created_at", { ascending: false });

  const storeUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "#";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your subscriptions"
        subtitle="Skip a delivery, change the date, or cancel — no need to contact us."
      />
      {subscriptions?.length ? (
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <SubscriptionCard key={sub.id} subscription={sub as SubscriptionRow} />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="No subscriptions yet"
            body="Subscribe to our supplements for ongoing preventative urinary tract care."
          />
          <div className="text-center pb-4">
            <LinkButton href={storeUrl} external>
              Shop supplements
            </LinkButton>
          </div>
        </Card>
      )}
    </div>
  );
}
