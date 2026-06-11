import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Streams the customer a short-lived signed URL for their final clinic report. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kitId: string }> }
) {
  const { kitId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // RLS-scoped read proves ownership and report completeness.
  const { data: report } = await supabase
    .from("clinic_reports")
    .select("report_path, status")
    .eq("kit_id", kitId)
    .maybeSingle();
  if (!report?.report_path || report.status !== "complete") {
    return NextResponse.json({ error: "report not available" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("clinic-reports")
    .createSignedUrl(report.report_path, 60);
  if (error || !signed) {
    return NextResponse.json({ error: "could not sign url" }, { status: 500 });
  }
  return NextResponse.redirect(signed.signedUrl);
}
