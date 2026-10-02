import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { formatKitCode, normalizeKitCode } from "@/lib/kit-code";
import { KitTools } from "@/app/admin/kits/KitTools";

/**
 * What a fulfilment user sees: dispatch, retail prep, and a one-line stock
 * count. Orders appear as number and email only; no patient pages, no
 * symptoms, no results.
 */
export default async function FulfilmentPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code: scanned } = await searchParams;
  await requireRole(["fulfilment"]);
  const admin = createAdminClient();

  const [{ data: stock }, { data: pendingOrders }] = await Promise.all([
    admin.from("kits").select("id, shipments(direction)").eq("status", "printed"),
    admin
      .from("orders")
      .select("id, order_number, email, placed_at, kits(id)")
      .eq("contains_test_kit", true)
      .or("fulfillment_status.is.null,fulfillment_status.neq.fulfilled")
      .order("placed_at", { ascending: true })
      .limit(200),
  ]);

  const printed = stock?.length ?? 0;
  const retail = (stock ?? []).filter((k) =>
    ((k.shipments as unknown as { direction: string }[] | null) ?? []).some((s) => s.direction === "return")
  ).length;

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
      <p className="text-sm text-slate-500" data-testid="stock-line">
        {printed === 0
          ? "No printed kits in stock. Ask a super admin to mark a batch as printed."
          : `${printed} printed ${printed === 1 ? "kit" : "kits"} in stock${retail ? `, ${retail} prepared for retail` : ""}.`}
      </p>
    </div>
  );
}
