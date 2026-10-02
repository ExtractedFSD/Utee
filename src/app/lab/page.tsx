import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKitCode, normalizeKitCode } from "@/lib/kit-code";
import { SAMPLE_FAULT_LABELS } from "@/lib/lab-sheet";
import { Card, CardTitle, PageHeader, StatusBadge, EmptyState, Notice } from "@/components/ui";
import { formatDateTime, type KitStatus } from "@/lib/status";

/** "3 min ago", "1 hr 12 min ago", for the bench timer on waiting specimens. */
function minutesAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} hr${h === 1 ? "" : "s"}${m ? ` ${m} min` : ""} ago`;
}

/**
 * Lab work queue. Deliberately shows specimen codes only, never patient
 * names, emails or symptoms.
 */
export default async function LabHome({ searchParams }: { searchParams: Promise<{ kit?: string; received?: string; problem?: string }> }) {
  const { kit: kitFlag, received, problem } = await searchParams;
  const justReceived = normalizeKitCode(received);
  const justParked = normalizeKitCode(problem);
  await requireRole(["lab"]);
  const admin = createAdminClient();

  const { data: kits } = await admin
    .from("kits")
    .select("id, code, status, activated_at, received_by_lab_at")
    .in("status", ["activated", "in_transit_to_lab", "received_by_lab", "lab_query"])
    .order("activated_at", { ascending: true });

  const inbound = kits?.filter((k) => ["activated", "in_transit_to_lab"].includes(k.status)) ?? [];
  const awaitingResults = kits?.filter((k) => k.status === "received_by_lab") ?? [];
  const queries = kits?.filter((k) => k.status === "lab_query") ?? [];
  const { data: issues } = queries.length
    ? await admin.from("lab_issues").select("kit_id, kind, fault, created_at").in("kit_id", queries.map((k) => k.id)).is("resolved_at", null)
    : { data: [] as { kit_id: string; kind: string; fault: string | null; created_at: string }[] };
  const issueFor = (kitId: string) => (issues ?? []).find((i) => i.kit_id === kitId);

  const row = (kit: { id: string; code: string; status: string; activated_at: string | null; received_by_lab_at: string | null }) => (
    <li key={kit.id}>
      <Link
        href={`/lab/specimen/${kit.code}`}
        className={`flex items-center justify-between gap-4 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl ${kit.code === justReceived ? "bg-mint-50" : ""}`}
      >
        <div>
          <p className="text-sm font-semibold text-slate-900 font-mono">{formatKitCode(kit.code)}</p>
          <p className="text-xs text-slate-400">
            {kit.received_by_lab_at
              ? `Received ${formatDateTime(kit.received_by_lab_at)} (${minutesAgo(kit.received_by_lab_at)})`
              : `Activated ${formatDateTime(kit.activated_at)}`}
          </p>
        </div>
        <StatusBadge status={kit.status as KitStatus} />
      </Link>
    </li>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Specimens"
        subtitle="Scan the QR code on the bag, or select the specimen below."
      />
      {justReceived && (
        <Notice tone="mint">
          Specimen <span className="font-mono font-semibold">{formatKitCode(justReceived)}</span> received and moved to Awaiting
          results. Scan the next bag, or open the specimen below when its run has finished to record the sheet.
        </Notice>
      )}
      {kitFlag === "voided" && (
        <Notice>That kit code has been cancelled by Utee. Do not process the sample; set it aside and contact Utee.</Notice>
      )}
      {justParked && (
        <Notice>
          Specimen <span className="font-mono font-semibold">{formatKitCode(justParked)}</span> is parked in the error queue. Utee and the
          customer have been told.
        </Notice>
      )}
      {queries.length > 0 && (
        <Card className="border-2 border-maroon/30" data-testid="error-queue">
          <CardTitle>Error queue ({queries.length})</CardTitle>
          <p className="text-sm text-slate-500 mb-2">Waiting on Utee. Open one to add a note, or to test it again when Utee asks.</p>
          <ul className="divide-y divide-slate-100">
            {queries.map((kit) => {
              const issue = issueFor(kit.id);
              return (
                <li key={kit.id}>
                  <Link href={`/lab/specimen/${kit.code}`} className="flex items-center justify-between gap-4 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 font-mono">{formatKitCode(kit.code)}</p>
                      <p className="text-xs text-slate-500">
                        {issue?.kind === "sample_problem"
                          ? `Sample problem: ${SAMPLE_FAULT_LABELS[issue.fault ?? ""] ?? issue.fault}`
                          : issue?.kind === "failed_runs"
                            ? "Test failed twice"
                            : "Parked"}
                        {issue ? ` · ${formatDateTime(issue.created_at)}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={kit.status as KitStatus} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
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
