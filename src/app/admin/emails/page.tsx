import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, PageHeader } from "@/components/ui";
import { EmailLogTable, type EmailLogRow } from "@/components/EmailLogTable";
import { formatKitCode } from "@/lib/kit-code";
import { TestEmailButton } from "./TestEmailButton";

/** Every email the portal has sent, newest first. Super admin only. */
export default async function EmailsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireRole(["admin"]);
  if (user.role !== "super_admin") redirect("/admin");
  const { status } = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from("email_log")
    .select("id, to_email, subject, kind, status, error, created_at, kits:kit_id(code)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status === "problems") query = query.in("status", ["failed", "bounced", "complained", "skipped"]);
  const { data } = await query;
  const rows: EmailLogRow[] = (data ?? []).map((r) => ({
    ...r,
    kit_code: (r.kits as unknown as { code: string } | null)?.code ? formatKitCode((r.kits as unknown as { code: string }).code) : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email log"
        subtitle="Every email the portal sends is recorded here with its delivery status. Resend's delivery webhook updates the status after sending."
        action={
          <div className="flex gap-2 text-sm">
            <a href="/admin/emails" className={`rounded-full px-3 py-1.5 ${status !== "problems" ? "bg-midnight text-white" : "bg-white text-midnight border border-midnight/15"}`}>
              All
            </a>
            <a href="/admin/emails?status=problems" className={`rounded-full px-3 py-1.5 ${status === "problems" ? "bg-midnight text-white" : "bg-white text-midnight border border-midnight/15"}`}>
              Problems
            </a>
          </div>
        }
      />
      <Card>
        <p className="text-sm text-slate-600 mb-3">
          Sends a sample lab-query email to the admin notification address, through the same code every real email uses.
        </p>
        <TestEmailButton />
      </Card>
      <Card>
        <EmailLogTable rows={rows} showKit />
      </Card>
    </div>
  );
}
