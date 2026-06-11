import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, PageHeader, StatusBadge, Pill } from "@/components/ui";
import { Timeline, type TimelineEvent } from "@/components/Timeline";
import { formatDateTime, type KitStatus } from "@/lib/status";
import { KitAdminControls } from "./KitAdminControls";

/** Full kit deep-dive for customer service: every event, hidden or not. */
export default async function AdminKitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole(["admin"]);
  const admin = createAdminClient();

  const { data: kit } = await admin
    .from("kits")
    .select(
      "id, code, status, created_at, profiles:customer_id(id, full_name, email), orders:order_id(id, order_number)"
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
        title={`Kit ${kit.code}`}
        subtitle={
          patient
            ? `${patient.full_name ?? patient.email}${order ? ` · Order ${order.order_number}` : ""}`
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
        {triage && <Pill tone="brand">Triage {formatDateTime(triage.submitted_at)}</Pill>}
        {labResult && <Pill tone="amber">Lab: {labResult.outcome}</Pill>}
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
        </div>
        <div className="space-y-6">
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
          />
        </div>
      </div>
    </div>
  );
}
