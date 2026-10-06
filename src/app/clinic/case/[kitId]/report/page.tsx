import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKitCode } from "@/lib/kit-code";
import { PageHeader, StatusBadge } from "@/components/ui";
import type { KitStatus } from "@/lib/status";
import { effectiveContent, loadReportCase } from "@/lib/report/build";
import { detectedKeys, suggestedContent } from "@/lib/report/content";
import { PATHOGEN_PROFILES } from "@/lib/report/copy";
import { getMySignature } from "@/app/clinic/signature/actions";
import { ReportBuilder } from "./ReportBuilder";

export default async function ReportBuilderPage({ params }: { params: Promise<{ kitId: string }> }) {
  const { kitId } = await params;
  const user = await requireRole(["clinic"]);
  const admin = createAdminClient();

  const c = await loadReportCase(admin, kitId);
  if (!c) notFound();
  if (c.kit.status !== "clinic_received" || !c.sheet) redirect(`/clinic/case/${kitId}`);

  const mySignature = await getMySignature();
  const suggested = suggestedContent(c.sheet);
  const initial = effectiveContent(c);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Report for ${formatKitCode(c.kit.code)}`}
        subtitle={
          <>
            {c.patient.name ?? "Unnamed patient"} ·{" "}
            <Link href={`/clinic/case/${kitId}`} className="underline hover:text-midnight">
              Back to the case
            </Link>
          </>
        }
        action={<StatusBadge status={c.kit.status as KitStatus} />}
      />
      <ReportBuilder
        kitId={kitId}
        kitCode={formatKitCode(c.kit.code)}
        patientName={c.patient.name}
        detected={detectedKeys(c.sheet.organisms).map((k) => PATHOGEN_PROFILES[k].name)}
        initial={initial}
        suggested={suggested}
        signatures={c.report?.signatures ?? []}
        me={{ id: user.id, fullName: user.fullName, superAdmin: user.role === "super_admin" }}
        mySignature={mySignature}
      />
    </div>
  );
}
