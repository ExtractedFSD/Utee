import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { REPORTS_BUCKET, loadReportCase, renderCaseReport, reportFileName } from "@/lib/report/build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The report as it stands: the published PDF once there is one, otherwise a
 * watermarked draft rendered from the saved wording and signatures.
 * Shown inline so the clinic can read it beside the editor.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ kitId: string }> }) {
  const { kitId } = await params;
  await requireRole(["clinic"]);
  const admin = createAdminClient();

  const c = await loadReportCase(admin, kitId);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  const headers = {
    "content-type": "application/pdf",
    "content-disposition": `inline; filename="${reportFileName(c.kit.code)}"`,
    "cache-control": "private, no-store",
  };

  if (c.report?.status === "complete" && c.report.report_path) {
    const { data, error } = await admin.storage.from(REPORTS_BUCKET).download(c.report.report_path);
    if (error || !data) return NextResponse.json({ error: "report file missing" }, { status: 404 });
    return new NextResponse(new Uint8Array(await data.arrayBuffer()), { headers });
  }

  if (!c.sheet) return NextResponse.json({ error: "no lab result yet" }, { status: 409 });
  const pdf = await renderCaseReport(admin, c, { draft: true });
  return new NextResponse(new Uint8Array(pdf), { headers });
}
