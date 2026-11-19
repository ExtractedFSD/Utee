import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { Breadcrumb, Notice, PageHeader } from "@/components/ui";
import { formatKitCode } from "@/lib/kit-code";
import { PRE_TRIAGE_STATUSES } from "@/lib/kits";
import { pendingTransferRequests } from "@/lib/kit-transfer";
import { createAdminClient } from "@/lib/supabase/admin";
import { PassOnKit } from "../PassOnKit";

/*
 * Passing a kit to someone else, on its own page: reached from the kit
 * page and from the symptom form's "another adult" answer. Only while the
 * kit is unused; afterwards it sends the person back to the kit.
 */
export default async function PassOnPage({ params }: { params: Promise<{ kitId: string }> }) {
  const { kitId } = await params;
  const user = await requireRole(["customer"]);
  const admin = createAdminClient();
  const { data: kit } = await admin.from("kits").select("id, code, status, customer_id").eq("id", kitId).maybeSingle();
  if (!kit || kit.customer_id !== user.id) notFound();
  const { data: triage } = await admin.from("triage_submissions").select("id").eq("kit_id", kit.id).maybeSingle();
  const unused = (PRE_TRIAGE_STATUSES as readonly string[]).includes(kit.status) && !triage;
  if (!unused) redirect(`/portal/tests/${kit.id}`);
  const asks = await pendingTransferRequests(admin, kit.id);
  const code = formatKitCode(kit.code);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb href={`/portal/tests/${kit.id}`} label={`Kit ${code}`} />}
        title="Pass this kit on"
        subtitle={`Kit ${code} will move to the other person's account. They sign in with their own email, answer the symptom questions themselves, and the result and anything prescribed from it are in their name. You won't see it on your account afterwards.`}
      />
      {asks.length > 0 && (
        <Notice tone="mint">
          {asks.length === 1 ? `${asks[0].name} has scanned this kit and asked to use it. Pass it to them below and it goes straight to their account.` : `${asks.length} people have scanned this kit and asked to use it. Pass it to the right one below.`}
        </Notice>
      )}
      <PassOnKit kitId={kit.id} kitCode={code} asks={asks} standalone />
    </div>
  );
}
