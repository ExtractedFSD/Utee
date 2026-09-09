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
      .select("id, code, status, created_at, shipments(direction)")
      .eq("status", "created")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("orders")
      .select("id, order_number, email, placed_at")
      .eq("contains_test_kit", true)
      // NULL-safe: new orders have fulfillment_status = null, not "unfulfilled"
      .or("fulfillment_status.is.null,fulfillment_status.neq.fulfilled")
      .order("placed_at", { ascending: true })
      .limit(50),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kit fulfilment"
        subtitle="Create QR labels, then link a kit to an order when you pack it — or attach a return label for retail stock."
        action={<LinkButton href="/admin/kits/print" variant="secondary">Print labels</LinkButton>}
      />

      <KitTools pendingOrders={pendingOrders ?? []} />

      <Card>
        <CardTitle>Unassigned kit stock ({stock?.length ?? 0})</CardTitle>
        {stock?.length ? (
          <div className="flex flex-wrap gap-2">
            {stock.map((kit) => {
              const retail = ((kit.shipments as unknown as { direction: string }[] | null) ?? [])
                .some((s) => s.direction === "return");
              return (
                <Link
                  key={kit.id}
                  href={`/admin/kits/${kit.id}`}
                  className={`rounded-full px-3 py-1 text-sm font-mono hover:bg-slate-200 ${
                    retail ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-700"
                  }`}
                  title={retail ? "Prepared for retail — awaiting registration by the buyer" : undefined}
                >
                  {kit.code}
                  {retail && <span className="ml-1.5 font-sans text-xs">retail</span>}
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No unassigned kits" body="Create a batch above to print QR labels." />
        )}
      </Card>
    </div>
  );
}
