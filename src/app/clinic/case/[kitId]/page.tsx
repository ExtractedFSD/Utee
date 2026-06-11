import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, PageHeader, StatusBadge, Pill } from "@/components/ui";
import { formatDateTime, type KitStatus } from "@/lib/status";
import { CaseActions } from "./CaseActions";

const SYMPTOM_LABELS: Record<string, string> = {
  burning: "Pain/burning on urination",
  frequency: "Increased frequency",
  urgency: "Urgency",
  lower_abdominal_pain: "Lower abdominal pain",
  blood_in_urine: "Haematuria",
  cloudy_or_smelly: "Cloudy/odorous urine",
  fever: "Fever/chills",
  back_pain: "Flank pain",
  nausea: "Nausea/vomiting",
};

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
    admin.from("triage_submissions").select("symptoms, consent_given, submitted_at").eq("kit_id", kitId).maybeSingle(),
    admin
      .from("lab_results")
      .select("outcome, organism, colony_count, sensitivities, comments, report_path, uploaded_at")
      .eq("kit_id", kitId)
      .maybeSingle(),
    admin.from("clinic_reports").select("status, summary, completed_at").eq("kit_id", kitId).maybeSingle(),
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
  const symptoms = (triage?.symptoms ?? null) as {
    selected?: string[];
    duration?: string;
    previousUti?: string;
    pregnant?: string;
    currentAntibiotics?: string;
    notes?: string;
  } | null;
  const status = kit.status as KitStatus;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Case ${kit.code}`}
        subtitle={patient ? `${patient.full_name ?? "Unnamed patient"} · ${patient.email}` : undefined}
        action={<StatusBadge status={status} />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Patient-reported symptoms</CardTitle>
          {symptoms ? (
            <div className="space-y-3 text-sm text-slate-700">
              <ul className="space-y-1">
                {(symptoms.selected ?? []).map((key) => (
                  <li key={key} className="flex gap-2">
                    <span className="text-brand-600">✓</span>
                    {SYMPTOM_LABELS[key] ?? key}
                  </li>
                ))}
              </ul>
              <dl className="space-y-1 border-t border-slate-100 pt-3">
                <div className="flex gap-2">
                  <dt className="font-medium text-slate-600">Duration:</dt>
                  <dd>{symptoms.duration ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium text-slate-600">Previous UTI:</dt>
                  <dd>{symptoms.previousUti ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium text-slate-600">Pregnant:</dt>
                  <dd>{symptoms.pregnant ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium text-slate-600">Current antibiotics:</dt>
                  <dd>{symptoms.currentAntibiotics || "None reported"}</dd>
                </div>
                {symptoms.notes && (
                  <div className="flex gap-2">
                    <dt className="font-medium text-slate-600">Notes:</dt>
                    <dd>{symptoms.notes}</dd>
                  </div>
                )}
              </dl>
              <p className="text-xs text-slate-400">
                Consent {triage?.consent_given ? "given" : "NOT given"} ·{" "}
                {formatDateTime(triage?.submitted_at)}
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
              {labResult.organism && <p>Organism: {labResult.organism}</p>}
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
      />
    </div>
  );
}
