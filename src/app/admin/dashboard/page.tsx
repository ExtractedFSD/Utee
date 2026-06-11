import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, PageHeader } from "@/components/ui";
import {
  KIT_PIPELINE,
  KIT_STATUS_ADMIN_LABELS,
  formatMoney,
  type KitStatus,
} from "@/lib/status";

/** Business dashboard — super admin only. */
export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") redirect("/admin");

  const admin = createAdminClient();
  const [{ count: customerCount }, { data: orders }, { data: kits }, { count: activeSubs }] =
    await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
      admin.from("orders").select("total_price, currency"),
      admin.from("kits").select("status").not("customer_id", "is", null),
      admin
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
    ]);

  const revenue = (orders ?? []).reduce((sum, o) => sum + Number(o.total_price), 0);
  const currency = orders?.[0]?.currency ?? "GBP";

  const stageCounts = new Map<KitStatus, number>();
  for (const kit of kits ?? []) {
    const s = kit.status as KitStatus;
    stageCounts.set(s, (stageCounts.get(s) ?? 0) + 1);
  }
  const totalKits = kits?.length ?? 0;
  const stages = KIT_PIPELINE.filter((s) => s !== "created");

  return (
    <div className="space-y-6">
      <PageHeader title="Business dashboard" subtitle="Visible to super admins only." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total customers", value: String(customerCount ?? 0) },
          { label: "Total revenue", value: formatMoney(revenue, currency) },
          { label: "Test kits sold", value: String(totalKits) },
          { label: "Active subscriptions", value: String(activeSubs ?? 0) },
        ].map((stat) => (
          <Card key={stat.label} className="text-center">
            <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>Customers by stage</CardTitle>
        <div className="space-y-3">
          {stages.map((stage) => {
            const count = stageCounts.get(stage) ?? 0;
            const pct = totalKits ? Math.round((count / totalKits) * 100) : 0;
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm text-slate-600">
                  {KIT_STATUS_ADMIN_LABELS[stage]}
                </span>
                <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm font-medium text-slate-700">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
