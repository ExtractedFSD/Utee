import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, PageHeader, StatusBadge, EmptyState, LinkButton } from "@/components/ui";
import { type KitStatus } from "@/lib/status";
import { KitTools } from "./KitTools";

export default async function KitsPage() {
  await requireRole(["admin"]);
  const admin = createAdminClient();

  const [{ data: stock }, { data: pendingOrders }] = await Promise.all([
    admin
      .from("kits")
      .select("id, code, status, created_at")
      .eq("status", "created")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("orders")
      .select("id, order_number, email, placed_at")
      .eq("contains_test_kit", true)
      .neq("fulfillment_status", "fulfilled")
      .order("placed_at", { ascending: true })
      .limit(50),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kit fulfilment"
        subtitle="Create QR labels, then link a kit to an order when you pack it."
        action={<LinkButton href="/admin/kits/print" variant="secondary">Print labels</LinkButton>}
      />

      <KitTools pendingOrders={pendingOrders ?? []} />

      <Card>
        <CardTitle>Unassigned kit stock ({stock?.length ?? 0})</CardTitle>
        {stock?.length ? (
          <div className="flex flex-wrap gap-2">
            {stock.map((kit) => (
              <Link
                key={kit.id}
                href={`/admin/kits/${kit.id}`}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm font-mono text-slate-700 hover:bg-slate-200"
              >
                {kit.code}
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No unassigned kits" body="Create a batch above to print QR labels." />
        )}
      </Card>
    </div>
  );
}
