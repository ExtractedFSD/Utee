import { NextResponse } from "next/server";
import { loadSharedPassport } from "@/lib/tracker/share-load";
import { toFhirBundle } from "@/lib/tracker/fhir";
import { isoToday } from "@/lib/tracker/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The shared passport as a FHIR R4 Bundle for other systems. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const shared = await loadSharedPassport(code);
  if (!shared) return new NextResponse("Not found", { status: 404 });
  const today = isoToday();
  const bundle = toFhirBundle({ patient: shared.patient, profile: shared.profile, data: shared.data, generatedOn: today });
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: { "content-type": "application/fhir+json", "content-disposition": `attachment; filename="uti-passport-${today}.fhir.json"`, "cache-control": "private, no-store" },
  });
}
