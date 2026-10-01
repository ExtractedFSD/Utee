import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, PageHeader, EmptyState } from "@/components/ui";
import { formatKitCode, normalizeKitCode } from "@/lib/kit-code";
import { KitTools } from "@/app/admin/kits/KitTools";

/**
 * What a fulfilment user sees: dispatch, retail prep, and the codes in
 * stock. Orders appear as number and email only; no patient pages, no
 * symptoms, no results.
 */
export default async function FulfilmentPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code: scanned } = await searchParams;
  await requireRole(["fulfilment"]);
  const admin = createAdminClient();

  const [{ data: stock }, { data: pendingOrders }] = await Promise.all([
    admin
      .from("kits")
      .select("id, code, shipments(direction)")
      .eq("status", "printed")
      .order("batch_id", { ascending: false })
      .order("sequence_number", { ascending: true })
      .limit(100),
    admin
      .from("orders")
      .select("id, order_number, email, placed_at, kits(id)")
      .eq("contains_test_kit", true)
      .or("fulfillment_status.is.null,fulfillment_status.neq.fulfilled")
      .order("placed_at", { ascending: true })
      .limit(200),
  ]);

  const ordersWithoutKit = (pendingOrders ?? [])
    .filter((o) => !((o.kits as unknown as { id: string }[] | null) ?? []).length)
    .map(({ kits: _kits, ...o }) => {
      void _kits;
      return o;
    });
  const initialCode = normalizeKitCode(scanned);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kit fulfilment"
        subtitle="Scan or type the kit code, pick the order, enter the tracking numbers. For retail stock, attach the return label only."
      />
      <KitTools pendingOrders={ordersWithoutKit} initialCode={initialCode ? formatKitCode(initialCode) : undefined} />
      <Card>
        <CardTitle>Unassigned kit stock ({stock?.length ?? 0})</CardTitle>
        {stock?.length ? (
          <div className="flex flex-wrap gap-2">
            {stock.map((kit) => {
              const retail = ((kit.shipments as unknown as { direction: string }[] | null) ?? []).some((s) => s.direction === "return");
              return (
                <span
                  key={kit.id}
                  className={`rounded-full px-3 py-1 text-sm font-mono ${
                    retail ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {formatKitCode(kit.code)}
                  {retail && <span className="ml-1.5 font-sans text-xs">retail</span>}
                </span>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No unassigned kits" body="Ask a super admin to mark a batch as printed." />
        )}
      </Card>
    </div>
  );
}
