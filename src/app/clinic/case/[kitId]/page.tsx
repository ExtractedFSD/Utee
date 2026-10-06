import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKitCode } from "@/lib/kit-code";
import { Card, CardTitle, PageHeader, StatusBadge, Pill } from "@/components/ui";
import { formatDateTime, type KitStatus } from "@/lib/status";
import { CaseActions } from "./CaseActions";
import { TriageSummary } from "@/components/TriageSummary";
import { RunHistory, runsFrom, type LabResultRow } from "@/components/RunHistory";
import { labUserNames } from "@/lib/lab-users";
import type { StoredTriage } from "@/lib/triage/questions";

export default async function CasePage({
  params,
}: {
  params: Promise<{ kitId: string }>;
}) {
  const { kitId } = await params;
  await requireRole(["clinic"]);
  const admin = createAdminClient();

  const { data: kit } = await admin
    .from("kits")
    .select("id, code, status, profiles:customer_id(full_name, email)")
    .eq("id", kitId)
    .maybeSingle();
  if (!kit) notFound();

  const [{ data: triage }, { data: labResult }, { data: report }] = await Promise.all([
    admin.from("triage_submissions").select("symptoms, consent_given, research_consent, submitted_at").eq("kit_id", kitId).maybeSingle(),
    admin
      .from("lab_results")
      .select("outcome, organism, colony_count, sensitivities, comments, report_path, uploaded_at, controls, previous_attempts, valid, lab_user_id")
      .eq("kit_id", kitId)
      .maybeSingle(),
    admin.from("clinic_reports").select("status, summary, completed_at, signatures").eq("kit_id", kitId).maybeSingle(),
  ]);

  let labPdfUrl: string | null = null;
  if (labResult?.report_path) {
    const { data: signed } = await admin.storage
      .from("lab-reports")
      .createSignedUrl(labResult.report_path, 600);
    labPdfUrl = signed?.signedUrl ?? null;
  }

  const patient = kit.profiles as unknown as {
    full_name: string | null;
    email: string;
  } | null;
  const symptoms = (triage?.symptoms ?? null) as StoredTriage | null;
  const status = kit.status as KitStatus;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Case ${formatKitCode(kit.code)}`}
        subtitle={patient ? `${patient.full_name ?? "Unnamed patient"} · ${patient.email}` : undefined}
        action={<StatusBadge status={status} />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Patient-reported symptoms</CardTitle>
          {symptoms ? (
            <div className="space-y-3">
              <TriageSummary answers={symptoms} audience="clinic" />
              <p className="text-xs text-slate-400">
                Consent {triage?.consent_given ? "given" : "NOT given"} · Research use{" "}
                {triage?.research_consent ? "agreed" : "not agreed"} · {formatDateTime(triage?.submitted_at)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No triage submission on file.</p>
          )}
        </Card>

        <Card>
          <CardTitle>Lab results</CardTitle>
          {labResult ? (
            <div className="space-y-2 text-sm text-slate-700">
              <p>
                Outcome:{" "}
                <Pill
                  tone={
                    labResult.outcome === "positive"
                      ? "red"
                      : labResult.outcome === "negative"
                        ? "green"
                        : "amber"
                  }
                >
                  {labResult.outcome}
                </Pill>
              </p>
              {labResult.organism && <p>Positive for: {labResult.organism}</p>}
              {labResult.controls && (
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer select-none">
                    Controls: positive {(labResult.controls as { positive?: boolean }).positive ? "passed" : "FAILED"},
                    negative {(labResult.controls as { negative?: boolean }).negative ? "passed" : "FAILED"},
                    error {(labResult.controls as { error?: boolean }).error ? "reported" : "none"}
                    {((labResult.previous_attempts as unknown[]) ?? []).length > 0 && ` · ${((labResult.previous_attempts as unknown[]) ?? []).length + 1} entries, see run history`}
                  </summary>
                  <div className="mt-3">
                    <RunHistory runs={runsFrom(labResult as unknown as LabResultRow, await labUserNames(admin, labResult as unknown as LabResultRow))} />
                  </div>
                </details>
              )}
              {labResult.colony_count && <p>Colony count: {labResult.colony_count}</p>}
              {(labResult.sensitivities as { text?: string } | null)?.text && (
                <p>Sensitivities: {(labResult.sensitivities as { text: string }).text}</p>
              )}
              {labResult.comments && <p>Comments: {labResult.comments}</p>}
              {labPdfUrl && (
                <p>
                  <a
                    href={labPdfUrl}
                    target="_blank"
                    className="font-medium text-brand-600 hover:text-brand-700"
                  >
                    View lab PDF →
                  </a>
                </p>
              )}
              <p className="text-xs text-slate-400">
                Uploaded {formatDateTime(labResult.uploaded_at)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Lab results not yet uploaded.</p>
          )}
        </Card>
      </div>

      <CaseActions
        kitId={kit.id}
        status={status}
        reportComplete={report?.status === "complete"}
        completedAt={report?.completed_at ?? null}
        signedBy={((report?.signatures as { name: string }[] | null) ?? []).map((s) => s.name)}
      />
    </div>
  );
}
