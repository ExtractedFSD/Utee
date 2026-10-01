import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, PageHeader, EmptyState, Pill } from "@/components/ui";
import { formatDateTime } from "@/lib/status";
import { BatchForm } from "./BatchForm";

type BatchRow = {
  id: number;
  quantity: number;
  note: string | null;
  created_at: string;
  sent_to_printer_at: string | null;
  kits: { status: string }[] | null;
};

export default async function BatchesPage() {
  const user = await requireRole(["admin"]);
  if (user.role !== "super_admin") redirect("/admin/kits");
  const admin = createAdminClient();

  const { data: batches } = await admin
    .from("kit_batches")
    .select("id, quantity, note, created_at, sent_to_printer_at, kits(status)")
    .order("id", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kit code batches"
        subtitle="Generate a print run of kit codes, download it for the label printer, then mark it as sent once the labels are back."
      />

      <BatchForm />

      <Card>
        <CardTitle>Batches ({batches?.length ?? 0})</CardTitle>
        {batches?.length ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-semibold uppercase tracking-[.12em] text-slate-400">
              <tr>
                <th className="py-2 pr-3">Batch</th>
                <th className="py-2 pr-3">Note</th>
                <th className="py-2 pr-3 text-right">Codes</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {(batches as BatchRow[]).map((b) => {
                const counts = { generated: 0, printed: 0, voided: 0, used: 0 };
                for (const k of b.kits ?? []) {
                  if (k.status === "generated") counts.generated++;
                  else if (k.status === "printed") counts.printed++;
                  else if (k.status === "voided") counts.voided++;
                  else counts.used++;
                }
                return (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="py-2 pr-3">
                      <Link href={`/admin/kits/batches/${b.id}`} className="font-semibold text-maroon hover:underline">
                        Batch {b.id}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{b.note ?? ""}</td>
                    <td className="py-2 pr-3 text-right">{b.quantity}</td>
                    <td className="py-2 pr-3">
                      {b.sent_to_printer_at ? (
                        <span className="space-x-1">
                          <Pill tone="green">Printed</Pill>
                          {counts.used > 0 && <Pill tone="slate">{counts.used} used</Pill>}
                          {counts.voided > 0 && <Pill tone="red">{counts.voided} voided</Pill>}
                        </span>
                      ) : (
                        <Pill tone="amber">Not yet printed</Pill>
                      )}
                    </td>
                    <td className="py-2 text-slate-500">{formatDateTime(b.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState title="No batches yet" body="Generate the first print run above." />
        )}
      </Card>
    </div>
  );
}
