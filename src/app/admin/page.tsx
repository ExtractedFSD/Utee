import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import {
  KIT_PIPELINE,
  KIT_STATUS_ADMIN_LABELS,
  formatDateTime,
  type KitStatus,
} from "@/lib/status";

/** Admin home: live pipeline + every active patient kit for support deep-dives. */
export default async function AdminHome() {
  await requireRole(["admin"]);
  const admin = createAdminClient();

  const [{ data: kits }, { data: customers }] = await Promise.all([
    admin
      .from("kits")
      .select("id, code, status, created_at, profiles:customer_id(id, full_name, email)")
      .not("customer_id", "is", null)
      .order("created_at", { ascending: false }),
    admin
      .from("profiles")
      .select("id, full_name, email, created_at")
      .eq("role", "customer")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const stageCounts = new Map<KitStatus, number>();
  for (const kit of kits ?? []) {
    const s = kit.status as KitStatus;
    stageCounts.set(s, (stageCounts.get(s) ?? 0) + 1);
  }
  const activeKits = (kits ?? []).filter((k) => k.status !== "closed");

  return (
    <div className="space-y-6">
      <PageHeader title="Patients" subtitle="Live view of every test kit in flight." />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {KIT_PIPELINE.filter((s) => !["created", "closed"].includes(s)).map((stage) => (
          <Card key={stage} className="!p-4 text-center">
            <p className="text-2xl font-semibold text-slate-900">{stageCounts.get(stage) ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">{KIT_STATUS_ADMIN_LABELS[stage]}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>Active kits ({activeKits.length})</CardTitle>
        {activeKits.length ? (
          <ul className="divide-y divide-slate-100">
            {activeKits.map((kit) => {
              const patient = kit.profiles as unknown as {
                id: string;
                full_name: string | null;
                email: string;
              } | null;
              return (
                <li key={kit.id}>
                  <Link
                    href={`/admin/kits/${kit.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        <span className="font-mono">{kit.code}</span>
                        {patient && (
                          <span className="text-slate-500 font-normal">
                            {" "}
                            — {patient.full_name ?? patient.email}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        Started {formatDateTime(kit.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={kit.status as KitStatus} />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No kits in flight" />
        )}
      </Card>

      <Card>
        <CardTitle>Recent customers</CardTitle>
        {customers?.length ? (
          <ul className="divide-y divide-slate-100">
            {customers.map((customer) => (
              <li key={customer.id}>
                <Link
                  href={`/admin/patients/${customer.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {customer.full_name ?? "—"}
                    </p>
                    <p className="text-xs text-slate-400">{customer.email}</p>
                  </div>
                  <span className="text-xs text-slate-400">
                    Joined {formatDateTime(customer.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No customers yet" />
        )}
      </Card>
    </div>
  );
}
