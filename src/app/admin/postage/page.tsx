import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, PageHeader, Pill } from "@/components/ui";
import { formatKitCode } from "@/lib/kit-code";
import { formatDateTime, formatMoney } from "@/lib/status";
import { returnPostageCostPence } from "@/lib/postage";
import { returnServiceCode, royalMailEnabled } from "@/lib/royalmail";

/*
 * Every return label the portal has bought, month by month, with a CSV for
 * whoever reconciles the Royal Mail invoice. Labels run on the fulfilment
 * partner's account, so this is the shared record of what Utee used.
 */
export default async function PostageStatementPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireRole(["super_admin"]);
  const admin = createAdminClient();
  const { month } = await searchParams;
  const now = new Date();
  const ym = /^\d{4}-\d{2}$/.test(month ?? "") ? (month as string) : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const [y, m] = ym.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const to = new Date(Date.UTC(y, m, 1)).toISOString();

  const [{ data: rows }, { data: months }] = await Promise.all([
    admin
      .from("return_labels")
      .select("id, tracking_number, service_code, provider, customer_reference, cost_pence, created_at, replaced_at, requested_role, kits:kit_id(id, code)")
      .gte("created_at", from)
      .lt("created_at", to)
      .order("created_at", { ascending: false }),
    admin.from("return_labels").select("created_at").order("created_at", { ascending: false }).limit(2000),
  ]);
  const labels = rows ?? [];
  const total = labels.reduce((n, r) => n + (r.cost_pence ?? 0), 0);
  const seen = [...new Set((months ?? []).map((r) => r.created_at.slice(0, 7)))];
  if (!seen.includes(ym)) seen.unshift(ym);
  const rate = returnPostageCostPence();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super admin"
        title="Return postage"
        subtitle={royalMailEnabled() ? `Live on Royal Mail Click & Drop, service ${returnServiceCode()}.` : "Stub mode: no Royal Mail key is set, so these are test labels, not real postage."}
        action={<a href={`/admin/postage/csv?month=${ym}`} className="text-sm font-semibold text-maroon">Download CSV</a>}
      />
      <div className="flex flex-wrap gap-2">
        {seen.slice(0, 12).map((k) => (
          <Link key={k} href={`/admin/postage?month=${k}`} className={`rounded-full px-4 py-2 text-sm font-semibold ${k === ym ? "bg-maroon text-white" : "bg-white text-midnight border border-midnight/15"}`}>{k}</Link>
        ))}
      </div>
      <Card>
        <CardTitle>{ym}: {labels.length} label{labels.length === 1 ? "" : "s"}{rate ? ` · ${formatMoney(total / 100)}` : ""}</CardTitle>
        {labels.length === 0 ? (
          <p className="text-sm text-slate-500">No return postage created this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[.1em] text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Created</th>
                  <th className="py-2 pr-3 font-semibold">Kit</th>
                  <th className="py-2 pr-3 font-semibold">Tracking</th>
                  <th className="py-2 pr-3 font-semibold">Service</th>
                  <th className="py-2 pr-3 font-semibold">By</th>
                  <th className="py-2 pr-3 font-semibold">State</th>
                  <th className="py-2 font-semibold text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {labels.map((r) => {
                  const kit = r.kits as unknown as { id: string; code: string } | null;
                  return (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{kit ? <Link href={`/admin/kits/${kit.id}`} className="font-semibold text-maroon">{formatKitCode(kit.code)}</Link> : "-"}</td>
                      <td className="py-2 pr-3 font-mono whitespace-nowrap">{r.tracking_number}</td>
                      <td className="py-2 pr-3">{r.service_code}{r.provider === "stub" ? " (stub)" : ""}</td>
                      <td className="py-2 pr-3">{r.requested_role ?? "-"}</td>
                      <td className="py-2 pr-3">{r.replaced_at ? <Pill tone="slate">Replaced</Pill> : <Pill tone="green">Current</Pill>}</td>
                      <td className="py-2 text-right whitespace-nowrap">{r.cost_pence ? formatMoney(r.cost_pence / 100) : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500">Every label carries the reference <span className="font-mono">UTEE UT-XXXX-XXXX</span>, which is how it shows in Click &amp; Drop and on the Royal Mail invoice. Set RETURN_POSTAGE_COST_PENCE to price the statement.</p>
      </Card>
    </div>
  );
}
