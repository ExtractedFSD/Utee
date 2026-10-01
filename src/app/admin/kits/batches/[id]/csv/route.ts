import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKitCode, kitQrUrl } from "@/lib/kit-code";

/**
 * The batch as the label printer wants it: one row per code in print order,
 * with the code as it should appear on the label and the URL for the QR.
 * Super admin only; voided codes are left out so they are never printed.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }
  const { id } = await params;
  const batchId = Number(id);
  if (!Number.isInteger(batchId)) return new NextResponse("Not found", { status: 404 });

  const admin = createAdminClient();
  const [{ data: batch }, { data: kits }] = await Promise.all([
    admin.from("kit_batches").select("id, quantity").eq("id", batchId).maybeSingle(),
    admin
      .from("kits")
      .select("code, sequence_number")
      .eq("batch_id", batchId)
      .neq("status", "voided")
      .order("sequence_number", { ascending: true }),
  ]);
  if (!batch) return new NextResponse("Not found", { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const lines = ["sequence,kit_code_display,qr_url"];
  for (const kit of kits ?? []) {
    lines.push(`${kit.sequence_number},${formatKitCode(kit.code)},${kitQrUrl(appUrl, kit.code)}`);
  }
  const filename = `utee-kit-codes-batch-${batch.id}-${batch.quantity}.csv`;
  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
