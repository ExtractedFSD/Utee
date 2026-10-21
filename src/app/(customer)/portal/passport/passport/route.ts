import { NextResponse } from "next/server";
import { audit, loadAll, requireTracker } from "@/lib/tracker/data";
import { renderPassportPdf } from "@/lib/tracker/passport-pdf";
import { isoToday } from "@/lib/tracker/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The recurrent UTI summary as a PDF the patient keeps or hands over. */
export async function GET() {
  const { supabase, user, profile } = await requireTracker();
  const data = await loadAll(supabase, user.id);
  const today = isoToday();
  const pdf = await renderPassportPdf({
    patient: { name: user.fullName, email: user.email, dateOfBirth: user.dateOfBirth },
    profile,
    data,
    generatedOn: today,
  });
  await audit(supabase, user.id, "passport_downloaded", {});
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="utee-uti-passport-${today}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
