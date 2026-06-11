import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
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
    .select("id, code, status, customer_id")
    .eq("code", code)
    .maybeSingle();

  if (!kit || kit.customer_id !== user.id) notFound();
  if (!["assigned", "shipped", "delivered"].includes(kit.status)) {
    redirect(`/portal/tests/${kit.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Before you take your sample"
        subtitle={`Kit ${kit.code} — please answer these questions now, then take your sample straight afterwards so your symptoms and sample arrive together.`}
      />
      <TriageForm code={kit.code} />
    </div>
  );
}
