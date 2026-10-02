import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKitCode, normalizeKitCode } from "@/lib/kit-code";
import { SAMPLE_FAULT_LABELS, judgeSheet, type Controls, type UropathogenKey } from "@/lib/lab-sheet";
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

  const [{ data: kits }, { data: completed }] = await Promise.all([
    admin
      .from("kits")
      .select("id, code, status, activated_at, received_by_lab_at")
      .in("status", ["activated", "in_transit_to_lab", "received_by_lab", "lab_query"])
      .order("activated_at", { ascending: true }),
    admin
      .from("kits")
      .select("id, code, status, lab_complete_at, lab_results(outcome, organism, uploaded_at)")
      .in("status", ["lab_complete", "clinic_received", "report_ready", "closed"])
      .not("lab_complete_at", "is", null)
      .order("lab_complete_at", { ascending: false })
      .limit(5),
  ]);

  const inbound = kits?.filter((k) => ["activated", "in_transit_to_lab"].includes(k.status)) ?? [];
  const atBench = kits?.filter((k) => k.status === "received_by_lab") ?? [];
  const queries = kits?.filter((k) => k.status === "lab_query") ?? [];
  // A received specimen with an invalid result on file is waiting for its re-run.
  const { data: invalidRuns } = atBench.length
    ? await admin.from("lab_results").select("kit_id, organisms, controls, previous_attempts").in("kit_id", atBench.map((k) => k.id)).eq("valid", false)
    : { data: [] as { kit_id: string; organisms: string[]; controls: Controls; previous_attempts: unknown[] }[] };
  const invalidFor = (kitId: string) => (invalidRuns ?? []).find((r) => r.kit_id === kitId);
  const awaitingResults = atBench.filter((k) => !invalidFor(k.id));
  const rerunNeeded = atBench.filter((k) => invalidFor(k.id));
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
        {kit.status !== "received_by_lab" && <StatusBadge status={kit.status as KitStatus} />}
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
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      {rerunNeeded.length > 0 && (
        <Card className="border-2 border-sun" data-testid="rerun-queue">
          <CardTitle>Re-run needed ({rerunNeeded.length})</CardTitle>
          <p className="text-sm text-slate-500 mb-2">The first run was invalid. Test again and record the sheet; the customer has not been told.</p>
          <ul className="divide-y divide-slate-100">
            {rerunNeeded.map((kit) => {
              const r = invalidFor(kit.id)!;
              const v = judgeSheet({ organisms: (r.organisms as UropathogenKey[]) ?? [], controls: r.controls as Controls });
              const runs = ((r.previous_attempts as unknown[]) ?? []).length + 1;
              return (
                <li key={kit.id}>
                  <Link href={`/lab/specimen/${kit.code}`} className="flex items-center justify-between gap-4 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 font-mono">{formatKitCode(kit.code)}</p>
                      <p className="text-xs text-amber-800">
                        Run {runs} invalid: {v.valid ? "" : v.reasons.join("; ")} · received {formatDateTime(kit.received_by_lab_at)}
                      </p>
                    </div>
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
      <Card data-testid="recent-completed">
        <CardTitle>Recently completed</CardTitle>
        <p className="text-sm text-slate-500 mb-2">The last five results sent to the clinic. A result can be amended until the clinic picks the case up.</p>
        {completed?.length ? (
          <ul className="divide-y divide-slate-100">
            {completed.map((kit) => {
              const r = (kit.lab_results as unknown as { outcome: string; organism: string | null; uploaded_at: string } | { outcome: string; organism: string | null; uploaded_at: string }[] | null);
              const result = Array.isArray(r) ? r[0] : r;
              return (
                <li key={kit.id}>
                  <Link href={`/lab/specimen/${kit.code}`} className="flex items-center justify-between gap-4 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 font-mono">{formatKitCode(kit.code)}</p>
                      <p className="text-xs text-slate-500">
                        {result ? `${result.outcome}${result.organism ? `: ${result.organism}` : ""}` : "Result on file"} · sent {formatDateTime(kit.lab_complete_at)}
                      </p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                      {kit.status === "lab_complete" ? "Amend" : "With clinic"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Nothing completed yet" />
        )}
      </Card>
    </div>
  );
}
