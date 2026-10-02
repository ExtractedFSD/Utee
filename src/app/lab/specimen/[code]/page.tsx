import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKitCode } from "@/lib/kit-code";
import { Card, CardTitle, PageHeader, StatusBadge } from "@/components/ui";
import { formatDateTime, type KitStatus } from "@/lib/status";
import { SAMPLE_FAULT_LABELS, judgeSheet, type Controls, type UropathogenKey } from "@/lib/lab-sheet";
import { CompletedResults, ParkedActions, ReceiveActions, SheetForm } from "./SpecimenActions";
import { RunHistory, runsFrom, type LabResultRow } from "@/components/RunHistory";
import { labUserNames } from "@/lib/lab-users";

/**
 * One specimen as the lab sees it: code, state, the sheet or the problem.
 * Patient identity and symptoms are never shown here.
 */
export default async function SpecimenPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  await requireRole(["lab"]);
  const admin = createAdminClient();

  const { data: kit } = await admin
    .from("kits")
    .select("id, code, status, received_by_lab_at")
    .eq("code", code)
    .maybeSingle();
  if (!kit) notFound();

  const [{ data: result }, { data: issue }] = await Promise.all([
    admin
      .from("lab_results")
      .select("outcome, organism, organisms, controls, valid, comments, uploaded_at, report_path, previous_attempts, lab_user_id")
      .eq("kit_id", kit.id)
      .maybeSingle(),
    admin
      .from("lab_issues")
      .select("kind, fault, note, created_at")
      .eq("kit_id", kit.id)
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const runs = result ? runsFrom(result as LabResultRow, await labUserNames(admin, result as LabResultRow)) : [];

  const status = kit.status as KitStatus;
  const canReceive = ["activated", "in_transit_to_lab"].includes(status);
  const attempts = ((result?.previous_attempts as unknown[]) ?? []).length + (result ? 1 : 0);
  const lastReasons =
    result && !result.valid
      ? (() => {
          const v = judgeSheet({ organisms: (result.organisms as UropathogenKey[]) ?? [], controls: result.controls as Controls });
          return v.valid ? [] : v.reasons;
        })()
      : null;

  let body: React.ReactNode;
  if (status === "lab_query") {
    const summary =
      issue?.kind === "sample_problem"
        ? `Sample problem: ${SAMPLE_FAULT_LABELS[issue.fault ?? ""] ?? issue.fault ?? "see note"}`
        : `Test failed ${attempts} times`;
    const details = issue?.kind === "sample_problem" ? [issue.note].filter((x): x is string => !!x) : [...(lastReasons ?? []), result?.comments].filter((x): x is string => !!x);
    body = <ParkedActions code={kit.code} summary={summary} details={details} />;
  } else if (canReceive) {
    body = <ReceiveActions code={kit.code} canReceive />;
  } else if (status === "received_by_lab") {
    body = (
      <>
        <SheetForm code={kit.code} attempt={attempts + 1} lastInvalid={lastReasons} />
        <ReceiveActions code={kit.code} canReceive={false} />
      </>
    );
  } else if (result) {
    body = (
      <CompletedResults
        code={kit.code}
        outcome={result.outcome}
        organism={result.organism}
        comments={result.comments}
        recordedAt={formatDateTime(result.uploaded_at)}
        runs={attempts}
        canAmend={status === "lab_complete"}
        initial={{
          organisms: (result.organisms as string[]) ?? [],
          controls: (result.controls as { positive: boolean; negative: boolean; error: boolean }) ?? { positive: false, negative: false, error: false },
          comments: result.comments,
        }}
      />
    );
  } else {
    body = (
      <Card className="text-center py-10">
        <p className="text-sm text-slate-500">No lab action required for this specimen.</p>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={`Specimen ${formatKitCode(kit.code)}`}
        subtitle="Patient identity is not shown to the laboratory."
        action={<StatusBadge status={status} />}
      />
      {body}
      {runs.length > 0 && (
        <Card>
          <CardTitle>Run history ({runs.filter((r) => r.verdict !== "amended").length})</CardTitle>
          <RunHistory runs={runs} />
        </Card>
      )}
    </div>
  );
}
