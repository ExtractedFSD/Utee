import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { formatKitCode } from "@/lib/kit-code";
import { TriageForm } from "./TriageForm";

export default async function TriagePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await requireRole(["customer"]);

  const admin = createAdminClient();
  const { data: kit } = await admin
    .from("kits")
    .select("id, code, status, customer_id, received_at")
    .eq("code", code)
    .maybeSingle();

  if (!kit || kit.customer_id !== user.id) notFound();
  // Already used, or not yet in their hands (scanning the box, or the button
  // on the kit page, records that): the kit page says what to do instead.
  if (!["assigned", "shipped", "delivered"].includes(kit.status) || !kit.received_at) {
    redirect(`/portal/tests/${kit.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Before you take your sample"
        subtitle={`Kit ${formatKitCode(kit.code)}. Please answer these questions now, then take your sample straight afterwards so your symptoms and sample arrive together.`}
      />
      <TriageForm code={kit.code} kitId={kit.id} account={{ name: user.fullName, dateOfBirth: user.dateOfBirth }} />
    </div>
  );
}
