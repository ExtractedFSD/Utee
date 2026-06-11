import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, PageHeader, StatusBadge, LinkButton } from "@/components/ui";
import { Timeline, type TimelineEvent } from "@/components/Timeline";
import { royalMailTrackingUrl } from "@/lib/tracking";
import { formatDateTime, type KitStatus } from "@/lib/status";

const SYMPTOM_LABELS: Record<string, string> = {
  burning: "Pain or burning when urinating",
  frequency: "Needing to urinate more often than usual",
  urgency: "Sudden urges to urinate",
  lower_abdominal_pain: "Lower abdominal pain",
  blood_in_urine: "Blood in urine",
  cloudy_or_smelly: "Cloudy or strong-smelling urine",
  fever: "Fever or chills",
  back_pain: "Back or side (flank) pain",
  nausea: "Nausea or vomiting",
};

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ kitId: string }>;
}) {
  const { kitId } = await params;
  const supabase = await createClient();

  const { data: kit } = await supabase
    .from("kits")
    .select("id, code, status")
    .eq("id", kitId)
    .single();
  if (!kit) notFound();

  const [{ data: events }, { data: shipments }, { data: triage }, { data: report }] =
    await Promise.all([
      supabase
        .from("kit_events")
        .select("id, type, label, detail, created_at")
        .eq("kit_id", kitId)
        .order("created_at", { ascending: false }),
      supabase
        .from("shipments")
        .select("direction, tracking_number, status, last_event")
        .eq("kit_id", kitId),
      supabase.from("triage_submissions").select("symptoms, submitted_at").eq("kit_id", kitId).maybeSingle(),
      supabase
        .from("clinic_reports")
        .select("id, status, summary, report_path, completed_at")
        .eq("kit_id", kitId)
        .maybeSingle(),
    ]);

  const symptoms = (triage?.symptoms ?? null) as {
    selected?: string[];
    duration?: string;
    notes?: string;
  } | null;

  const status = kit.status as KitStatus;
  const needsTriage = ["assigned", "shipped", "delivered"].includes(status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Test kit ${kit.code}`}
        action={<StatusBadge status={status} />}
      />

      {needsTriage && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Before you take your sample
            </p>
            <p className="text-sm text-slate-600">
              Scan the QR code on your kit, or tap here, to record your symptoms first —
              your sample can&apos;t be processed without them.
            </p>
          </div>
          <LinkButton href={`/triage/${kit.code}`}>Complete symptom form</LinkButton>
        </div>
      )}

      {report?.status === "complete" && report.report_path && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Your report is ready</p>
            <p className="text-sm text-slate-600">
              Reviewed by our clinical team {formatDateTime(report.completed_at)}. Download
              it to share with your GP or doctor.
            </p>
          </div>
          <LinkButton href={`/portal/tests/${kit.id}/report`}>Download report (PDF)</LinkButton>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardTitle>Timeline</CardTitle>
            <Timeline events={(events ?? []) as TimelineEvent[]} />
          </Card>
        </div>

        <div className="space-y-6">
          {shipments?.map((shipment) => (
            <Card key={shipment.direction}>
              <CardTitle>
                {shipment.direction === "outbound" ? "Delivery to you" : "Return to lab"}
              </CardTitle>
              <p className="text-sm text-slate-600">{shipment.last_event ?? "Awaiting first scan"}</p>
              <p className="text-xs text-slate-400 mt-1">
                Royal Mail · {shipment.tracking_number}
              </p>
              <div className="pt-3">
                <Link
                  href={royalMailTrackingUrl(shipment.tracking_number)}
                  target="_blank"
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Track on Royal Mail →
                </Link>
              </div>
            </Card>
          ))}

          {symptoms && (
            <Card>
              <CardTitle>Your submitted symptoms</CardTitle>
              <ul className="space-y-1.5">
                {(symptoms.selected ?? []).map((key) => (
                  <li key={key} className="text-sm text-slate-600 flex gap-2">
                    <span className="text-brand-600">✓</span>
                    {SYMPTOM_LABELS[key] ?? key}
                  </li>
                ))}
              </ul>
              {symptoms.duration && (
                <p className="text-sm text-slate-600 mt-3">
                  <span className="font-medium text-slate-700">Duration:</span> {symptoms.duration}
                </p>
              )}
              {symptoms.notes && (
                <p className="text-sm text-slate-600 mt-1">
                  <span className="font-medium text-slate-700">Notes:</span> {symptoms.notes}
                </p>
              )}
              <p className="text-xs text-slate-400 mt-3">
                Submitted {formatDateTime(triage?.submitted_at)}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
