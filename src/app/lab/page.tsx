import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { formatDateTime, type KitStatus } from "@/lib/status";

/**
 * Lab work queue. Deliberately shows specimen codes only — never patient
 * names, emails or symptoms.
 */
export default async function LabHome() {
  await requireRole(["lab"]);
  const admin = createAdminClient();

  const { data: kits } = await admin
    .from("kits")
    .select("id, code, status, activated_at, received_by_lab_at")
    .in("status", ["activated", "in_transit_to_lab", "received_by_lab"])
    .order("activated_at", { ascending: true });

  const inbound = kits?.filter((k) => k.status !== "received_by_lab") ?? [];
  const awaitingResults = kits?.filter((k) => k.status === "received_by_lab") ?? [];

  const row = (kit: { id: string; code: string; status: string; activated_at: string | null }) => (
    <li key={kit.id}>
      <Link
        href={`/lab/specimen/${kit.code}`}
        className="flex items-center justify-between gap-4 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl"
      >
        <div>
          <p className="text-sm font-semibold text-slate-900 font-mono">{kit.code}</p>
          <p className="text-xs text-slate-400">Activated {formatDateTime(kit.activated_at)}</p>
        </div>
        <StatusBadge status={kit.status as KitStatus} />
      </Link>
    </li>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Specimens"
        subtitle="Scan the QR code on the pot, or select the specimen below."
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardTitle>Awaiting results ({awaitingResults.length})</CardTitle>
          {awaitingResults.length ? (
            <ul className="divide-y divide-slate-100">{awaitingResults.map(row)}</ul>
          ) : (
            <EmptyState title="No specimens awaiting results" />
          )}
        </Card>
        <Card>
          <CardTitle>Inbound ({inbound.length})</CardTitle>
          {inbound.length ? (
            <ul className="divide-y divide-slate-100">{inbound.map(row)}</ul>
          ) : (
            <EmptyState title="No specimens in transit" />
          )}
        </Card>
      </div>
    </div>
  );
}
