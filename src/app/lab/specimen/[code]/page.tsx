import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKitCode } from "@/lib/kit-code";
import { Card, CardTitle, PageHeader, StatusBadge, Pill } from "@/components/ui";
import { formatDateTime, type KitStatus } from "@/lib/status";
import { LabQueryActions, SpecimenActions } from "./SpecimenActions";
import { judgeSheet, type Controls, type UropathogenKey } from "@/lib/lab-sheet";

/**
 * Lab specimen page, reached by scanning the QR on the urine pot. Shows the
 * specimen number and lab state only; no patient identity or symptoms.
 */
export default async function SpecimenPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  await requireRole(["lab"]);
  const admin = createAdminClient();

  const { data: kit } = await admin
    .from("kits")
    .select("id, code, status, received_by_lab_at")
    .eq("code", code)
    .maybeSingle();
  if (!kit) notFound();

  const { data: result } = await admin
    .from("lab_results")
    .select("outcome, organism, organisms, controls, valid, comments, uploaded_at, report_path, previous_attempts")
    .eq("kit_id", kit.id)
    .maybeSingle();

  const status = kit.status as KitStatus;
  const canReceive = ["activated", "in_transit_to_lab"].includes(status);
  const canRecord = status === "received_by_lab";
  const attempts = ((result?.previous_attempts as unknown[]) ?? []).length + (result ? 1 : 0);
  const reasons =
    result && !result.valid
      ? (() => {
          const v = judgeSheet({ organisms: (result.organisms as UropathogenKey[]) ?? [], controls: result.controls as Controls });
          return v.valid ? [] : v.reasons;
        })()
      : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={`Specimen ${formatKitCode(kit.code)}`}
        subtitle="Patient identity is not shown to the laboratory."
        action={<StatusBadge status={status} />}
      />

      {status === "lab_query" && <LabQueryActions code={kit.code} reasons={reasons} />}

      {result && !canRecord && status !== "lab_query" ? (
        <Card>
          <CardTitle>Results on file</CardTitle>
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              Outcome:{" "}
              <Pill tone={result.outcome === "positive" ? "red" : result.outcome === "negative" ? "green" : "amber"}>
                {result.outcome}
              </Pill>
            </p>
            {result.organism && <p>Positive for: {result.organism}</p>}
            {result.comments && <p>Comments: {result.comments}</p>}
            {result.report_path && <p>PDF attached.</p>}
            {attempts > 1 && <p className="text-xs text-slate-500">Run {attempts}; earlier runs are kept on file.</p>}
            <p className="text-xs text-slate-400">Recorded {formatDateTime(result.uploaded_at)}</p>
          </div>
        </Card>
      ) : (
        status !== "lab_query" && (
          <SpecimenActions code={kit.code} canReceive={canReceive} canRecord={canRecord} attempt={attempts + 1} />
        )
      )}
    </div>
  );
}
