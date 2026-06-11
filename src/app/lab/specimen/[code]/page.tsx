import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, PageHeader, StatusBadge, Pill } from "@/components/ui";
import { formatDateTime, type KitStatus } from "@/lib/status";
import { SpecimenActions } from "./SpecimenActions";

/**
 * Lab specimen page — reached by scanning the QR on the urine pot. Shows the
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
    .select("outcome, organism, colony_count, comments, uploaded_at, report_path")
    .eq("kit_id", kit.id)
    .maybeSingle();

  const status = kit.status as KitStatus;
  const canReceive = ["activated", "in_transit_to_lab"].includes(status);
  const canUpload = status === "received_by_lab" && !result;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={`Specimen ${kit.code}`}
        subtitle="Patient identity is not shown to the laboratory."
        action={<StatusBadge status={status} />}
      />

      {result ? (
        <Card>
          <CardTitle>Results on file</CardTitle>
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              Outcome:{" "}
              <Pill tone={result.outcome === "positive" ? "red" : result.outcome === "negative" ? "green" : "amber"}>
                {result.outcome}
              </Pill>
            </p>
            {result.organism && <p>Organism: {result.organism}</p>}
            {result.colony_count && <p>Colony count: {result.colony_count}</p>}
            {result.comments && <p>Comments: {result.comments}</p>}
            {result.report_path && <p>PDF report attached.</p>}
            <p className="text-xs text-slate-400">Uploaded {formatDateTime(result.uploaded_at)}</p>
          </div>
        </Card>
      ) : (
        <SpecimenActions code={kit.code} canReceive={canReceive} canUpload={canUpload} />
      )}
    </div>
  );
}
