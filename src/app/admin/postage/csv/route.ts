import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKitCode } from "@/lib/kit-code";

export const dynamic = "force-dynamic";

/** The month's return labels as CSV, for reconciling against the Royal Mail invoice. */
export async function GET(req: NextRequest) {
  await requireRole(["super_admin"]);
  const month = req.nextUrl.searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) return new NextResponse("month=YYYY-MM required", { status: 400 });
  const [y, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const to = new Date(Date.UTC(y, m, 1)).toISOString();
  const admin = createAdminClient();
  const { data } = await admin
    .from("return_labels")
    .select("created_at, tracking_number, service_code, provider, customer_reference, cost_pence, replaced_at, requested_role, kits:kit_id(code)")
    .gte("created_at", from)
    .lt("created_at", to)
    .order("created_at", { ascending: true });
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["created_at", "kit", "tracking_number", "service", "provider", "reference", "requested_by", "state", "cost_gbp"].join(",")];
  for (const r of data ?? []) {
    const kit = r.kits as unknown as { code: string } | null;
    lines.push([r.created_at, kit ? formatKitCode(kit.code) : "", r.tracking_number, r.service_code, r.provider, r.customer_reference, r.requested_role ?? "", r.replaced_at ? "replaced" : "current", ((r.cost_pence ?? 0) / 100).toFixed(2)].map(esc).join(","));
  }
  return new NextResponse(lines.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="utee-return-postage-${month}.csv"` } });
}
