import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, PageHeader, StatusBadge, LinkButton, Callout, Notice } from "@/components/ui";
import { Timeline, type TimelineEvent } from "@/components/Timeline";
import { royalMailTrackingUrl } from "@/lib/tracking";
import { formatDateTime, type KitStatus } from "@/lib/status";
import { TriageSummary } from "@/components/TriageSummary";
import type { StoredTriage } from "@/lib/triage/questions";

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

  const symptoms = (triage?.symptoms ?? null) as StoredTriage | null;

  const status = kit.status as KitStatus;
  const needsTriage = ["assigned", "shipped", "delivered"].includes(status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Test kit ${kit.code}`}
        action={<StatusBadge status={status} />}
      />

      {needsTriage && (
        <Callout className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <p className="font-display text-2xl font-light">Before you take your sample</p>
            <p className="text-sm text-white/85 mt-1 leading-relaxed">
              Scan the QR code on your kit, or tap here, to record your symptoms first.
              Your sample can&apos;t be processed without them.
            </p>
          </div>
          <LinkButton href={`/triage/${kit.code}`} variant="white">Complete symptom form</LinkButton>
        </Callout>
      )}

      {report?.status === "complete" && report.report_path && (
        <Notice tone="mint">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-display text-2xl font-light text-midnight">Your report is ready</p>
              <p className="text-sm text-slate-700 mt-1">
                Reviewed by our clinical team {formatDateTime(report.completed_at)}. Download
                it to share with your GP or doctor.
              </p>
            </div>
            <LinkButton href={`/portal/tests/${kit.id}/report`}>Download report (PDF)</LinkButton>
          </div>
        </Notice>
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
              <TriageSummary answers={symptoms} audience="patient" />
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
