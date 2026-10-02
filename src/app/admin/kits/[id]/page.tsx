import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, PageHeader, StatusBadge, Pill } from "@/components/ui";
import { Timeline, type TimelineEvent } from "@/components/Timeline";
import { formatDateTime, KIT_REVERT_MAP, type KitStatus } from "@/lib/status";
import { formatKitCode } from "@/lib/kit-code";
import { SAMPLE_FAULT_LABELS } from "@/lib/lab-sheet";
import { LabIssueControls } from "./LabIssueControls";
import { EmailLogTable } from "@/components/EmailLogTable";
import { KitAdminControls } from "./KitAdminControls";

/** Full kit deep-dive for customer service: every event, hidden or not. */
export default async function AdminKitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(["admin"]);
  const admin = createAdminClient();

  const { data: kit } = await admin
    .from("kits")
    .select(
      "id, code, status, created_at, batch_id, sequence_number, voided_at, void_reason, profiles:customer_id(id, full_name, email), orders:order_id(id, order_number)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!kit) notFound();

  const [{ data: events }, { data: shipments }, { data: triage }, { data: labResult }, { data: report }] =
    await Promise.all([
      admin
        .from("kit_events")
        .select("id, type, label, detail, created_at, visible_to_customer, actor_role")
        .eq("kit_id", id)
        .order("created_at", { ascending: false }),
      admin
        .from("shipments")
        .select("direction, tracking_number, status, last_event, updated_at")
        .eq("kit_id", id),
      admin.from("triage_submissions").select("submitted_at").eq("kit_id", id).maybeSingle(),
      admin.from("lab_results").select("outcome, uploaded_at").eq("kit_id", id).maybeSingle(),
      admin.from("clinic_reports").select("status, completed_at").eq("kit_id", id).maybeSingle(),
    ]);
  const { data: labIssue } =
    kit.status === "lab_query"
      ? await admin
          .from("lab_issues")
          .select("kind, fault, note, created_at")
          .eq("kit_id", id)
          .is("resolved_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };
  const { data: emailLog } =
    user.role === "super_admin"
      ? await admin
          .from("email_log")
          .select("id, to_email, subject, kind, status, error, created_at")
          .eq("kit_id", id)
          .order("created_at", { ascending: false })
          .limit(50)
      : { data: null };

  const patient = kit.profiles as unknown as {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
  const order = kit.orders as unknown as { id: string; order_number: string } | null;
  const status = kit.status as KitStatus;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Kit ${formatKitCode(kit.code)}`}
        subtitle={
          patient
            ? `${patient.full_name ?? patient.email}${order ? ` · Order ${order.order_number}` : ""}`
            : status === "voided"
              ? `Voided ${formatDateTime(kit.voided_at)}${kit.void_reason ? `: ${kit.void_reason}` : ""}`
              : status === "generated"
                ? "Generated, not yet marked as printed"
                : "Unassigned stock"
        }
        action={<StatusBadge status={status} />}
      />

      <div className="flex flex-wrap gap-2 text-sm">
        {patient && (
          <Link
            href={`/admin/patients/${patient.id}`}
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            View patient →
          </Link>
        )}
        {kit.batch_id && (
          <Link href={`/admin/kits/batches/${kit.batch_id}`} className="font-medium text-brand-600 hover:text-brand-700">
            Batch {kit.batch_id}, label {kit.sequence_number} →
          </Link>
        )}
        {triage && <Pill tone="brand">Triage {formatDateTime(triage.submitted_at)}</Pill>}
        {labResult && status !== "lab_query" && <Pill tone="amber">Lab: {labResult.outcome}</Pill>}
        {status === "lab_query" && (
          <Pill tone="red">
            Lab problem: {labIssue?.kind === "sample_problem" ? SAMPLE_FAULT_LABELS[labIssue.fault ?? ""] ?? labIssue.fault : "test failed twice"}
          </Pill>
        )}
        {report && <Pill tone={report.status === "complete" ? "green" : "slate"}>Report {report.status}</Pill>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardTitle>Full event log</CardTitle>
            <Timeline
              events={(events ?? []).map((e) => ({
                ...e,
                label: e.visible_to_customer ? e.label : `${e.label} (internal)`,
              })) as TimelineEvent[]}
            />
          </Card>
          {emailLog && (
            <Card className="mt-6">
              <CardTitle>Emails sent ({emailLog.length})</CardTitle>
              <EmailLogTable rows={emailLog} />
            </Card>
          )}
        </div>
        <div className="space-y-6">
          {status === "lab_query" && (
            <Card className="border-2 border-maroon/30">
              <CardTitle>Lab problem</CardTitle>
              <p className="text-sm text-slate-700">
                {labIssue?.kind === "sample_problem"
                  ? `The sample arrived unusable: ${SAMPLE_FAULT_LABELS[labIssue.fault ?? ""] ?? labIssue.fault}.`
                  : "The test failed twice."}
                {labIssue?.note && <span className="block mt-1 text-slate-600">Lab note: {labIssue.note}</span>}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                The customer has been told we are looking into a problem. Decide what happens next: ask the lab to test again, or close the
                kit below and arrange a replacement.
              </p>
              <div className="mt-3">
                <LabIssueControls kitId={kit.id} />
              </div>
            </Card>
          )}
          {shipments?.map((shipment) => (
            <Card key={shipment.direction}>
              <CardTitle>{shipment.direction === "outbound" ? "Outbound" : "Return"}</CardTitle>
              <p className="text-sm text-slate-600">{shipment.last_event ?? "No scans yet"}</p>
              <p className="text-xs text-slate-400 mt-1">
                {shipment.tracking_number} · {shipment.status}
              </p>
            </Card>
          ))}
          <KitAdminControls
            kitId={kit.id}
            status={status}
            mockTracking={process.env.TRACKING_PROVIDER === "mock"}
            trackship={process.env.TRACKING_PROVIDER === "trackship" && !!process.env.TRACKSHIP_API_KEY}
            canRevert={user.role === "super_admin" && status in KIT_REVERT_MAP}
          />
        </div>
      </div>
    </div>
  );
}
