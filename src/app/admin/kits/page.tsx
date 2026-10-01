import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, PageHeader, EmptyState, LinkButton } from "@/components/ui";
import { formatKitCode } from "@/lib/kit-code";
import { KitTools } from "./KitTools";

export default async function KitsPage() {
  const user = await requireRole(["admin"]);
  const admin = createAdminClient();

  const [{ data: stock }, { data: pendingOrders }, { count: generated }] = await Promise.all([
    admin
      .from("kits")
      .select("id, code, status, created_at, batch_id, sequence_number, shipments(direction)")
      .eq("status", "printed")
      .order("batch_id", { ascending: false })
      .order("sequence_number", { ascending: true })
      .limit(100),
    admin
      .from("orders")
      .select("id, order_number, email, placed_at, kits(id)")
      .eq("contains_test_kit", true)
      // NULL-safe: new orders have fulfillment_status = null, not "unfulfilled"
      .or("fulfillment_status.is.null,fulfillment_status.neq.fulfilled")
      .order("placed_at", { ascending: true })
      .limit(200),
    admin.from("kits").select("id", { count: "exact", head: true }).eq("status", "generated"),
  ]);

  // Only orders that don't have a kit linked yet can be dispatched against.
  const ordersWithoutKit = (pendingOrders ?? [])
    .filter((o) => !((o.kits as unknown as { id: string }[] | null) ?? []).length)
    .map(({ kits: _kits, ...o }) => {
      void _kits;
      return o;
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kit fulfilment"
        subtitle="Link a printed kit to an order when you pack it, or attach a return label for retail stock."
        action={
          user.role === "super_admin" ? (
            <LinkButton href="/admin/kits/batches" variant="secondary">
              Kit code batches
            </LinkButton>
          ) : undefined
        }
      />

      <KitTools pendingOrders={ordersWithoutKit} />

      <Card>
        <CardTitle>Unassigned kit stock ({stock?.length ?? 0})</CardTitle>
        {generated ? (
          <p className="text-sm text-slate-500 mb-3">
            {generated} more {generated === 1 ? "code is" : "codes are"} generated but not yet marked as printed.
          </p>
        ) : null}
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
                  title={
                    retail
                      ? "Prepared for retail. Awaiting registration by the buyer"
                      : kit.batch_id
                        ? `Batch ${kit.batch_id}, label ${kit.sequence_number}`
                        : undefined
                  }
                >
                  {formatKitCode(kit.code)}
                  {retail && <span className="ml-1.5 font-sans text-xs">retail</span>}
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No unassigned kits"
            body="A super admin generates kit codes in batches and marks each batch as printed once the labels are back."
          />
        )}
      </Card>
    </div>
  );
}
