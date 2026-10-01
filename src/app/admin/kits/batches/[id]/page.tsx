import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, PageHeader, StatusBadge, LinkButton } from "@/components/ui";
import { formatDateTime, type KitStatus } from "@/lib/status";
import { formatKitCode } from "@/lib/kit-code";
import { BatchActions, VoidKitButton } from "./BatchActions";

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(["admin"]);
  if (user.role !== "super_admin") redirect("/admin/kits");
  const batchId = Number(id);
  if (!Number.isInteger(batchId)) notFound();
  const admin = createAdminClient();

  const [{ data: batch }, { data: kits }] = await Promise.all([
    admin
      .from("kit_batches")
      .select("id, quantity, note, created_at, sent_to_printer_at, creator:created_by(email), sender:sent_to_printer_by(email)")
      .eq("id", batchId)
      .maybeSingle(),
    admin
      .from("kits")
      .select("id, code, status, sequence_number, void_reason, voided_at")
      .eq("batch_id", batchId)
      .order("sequence_number", { ascending: true }),
  ]);
  if (!batch) notFound();

  const creator = batch.creator as unknown as { email: string } | null;
  const sender = batch.sender as unknown as { email: string } | null;
  const voidable = (status: string) => status === "generated" || status === "printed";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Batch ${batch.id}`}
        subtitle={[
          `${batch.quantity} codes`,
          batch.note,
          `created ${formatDateTime(batch.created_at)}${creator ? ` by ${creator.email}` : ""}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          <LinkButton href="/admin/kits/batches" variant="secondary">
            All batches
          </LinkButton>
        }
      />

      <Card>
        <CardTitle>Print run</CardTitle>
        <p className="text-sm text-slate-600 mb-4">
          {batch.sent_to_printer_at
            ? `Marked as sent to the printer ${formatDateTime(batch.sent_to_printer_at)}${sender ? ` by ${sender.email}` : ""}. Its codes are usable stock.`
            : "Download the CSV for the label printer. Once the labels are back, mark the batch as sent so its codes become usable stock."}
        </p>
        <BatchActions batchId={batch.id} quantity={batch.quantity} sent={!!batch.sent_to_printer_at} />
      </Card>

      <Card>
        <CardTitle>Codes ({kits?.length ?? 0})</CardTitle>
        <table className="w-full text-sm">
          <thead className="text-left text-xs font-semibold uppercase tracking-[.12em] text-slate-400">
            <tr>
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Code</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {(kits ?? []).map((kit) => (
              <tr key={kit.id} className="border-t border-slate-100">
                <td className="py-1.5 pr-3 text-slate-500">{kit.sequence_number}</td>
                <td className="py-1.5 pr-3 font-mono">
                  <Link href={`/admin/kits/${kit.id}`} className="hover:underline">
                    {formatKitCode(kit.code)}
                  </Link>
                </td>
                <td className="py-1.5 pr-3">
                  <StatusBadge status={kit.status as KitStatus} />
                  {kit.status === "voided" && kit.void_reason && (
                    <span className="ml-2 text-xs text-slate-500">{kit.void_reason}</span>
                  )}
                </td>
                <td className="py-1.5 text-right">
                  {voidable(kit.status) && <VoidKitButton kitId={kit.id} code={formatKitCode(kit.code)} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
