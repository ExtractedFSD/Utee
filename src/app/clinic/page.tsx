import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { formatDateTime, type KitStatus } from "@/lib/status";

export default async function ClinicHome() {
  await requireRole(["clinic"]);
  const admin = createAdminClient();

  const { data: kits } = await admin
    .from("kits")
    .select("id, code, status, lab_complete_at, profiles:customer_id(full_name)")
    .in("status", ["lab_complete", "clinic_received"])
    .order("lab_complete_at", { ascending: true });

  const { data: recent } = await admin
    .from("kits")
    .select("id, code, status, report_ready_at")
    .eq("status", "report_ready")
    .order("report_ready_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical cases"
        subtitle="Cases with lab results awaiting review and final report."
      />

      <Card>
        <CardTitle>Awaiting review ({kits?.length ?? 0})</CardTitle>
        {kits?.length ? (
          <ul className="divide-y divide-slate-100">
            {kits.map((kit) => {
              const patient = kit.profiles as unknown as { full_name: string | null } | null;
              return (
                <li key={kit.id}>
                  <Link
                    href={`/clinic/case/${kit.id}`}
                    className="flex items-center justify-between gap-4 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        <span className="font-mono">{kit.code}</span>
                        {patient?.full_name && (
                          <span className="font-normal text-slate-500"> — {patient.full_name}</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        Lab completed {formatDateTime(kit.lab_complete_at)}
                      </p>
                    </div>
                    <StatusBadge status={kit.status as KitStatus} />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No cases awaiting review" />
        )}
      </Card>

      <Card>
        <CardTitle>Recently completed</CardTitle>
        {recent?.length ? (
          <ul className="divide-y divide-slate-100">
            {recent.map((kit) => (
              <li key={kit.id}>
                <Link
                  href={`/clinic/case/${kit.id}`}
                  className="flex items-center justify-between gap-4 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl"
                >
                  <p className="text-sm font-mono text-slate-700">{kit.code}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(kit.report_ready_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No completed reports yet" />
        )}
      </Card>
    </div>
  );
}
