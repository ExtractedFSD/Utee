import { NextRequest, NextResponse } from "next/server";
import { audit, loadAll, ownKits, requireTracker } from "@/lib/tracker/data";
import { renderSummaryPdf } from "@/lib/tracker/pdf";
import { isoDaysAgo, isoToday } from "@/lib/tracker/stats";

export const runtime = "nodejs";

/** One-page GP summary. ?from=YYYY-MM-DD&to=YYYY-MM-DD&notes=1 */
export async function GET(req: NextRequest) {
  const { supabase, user } = await requireTracker();
  const q = req.nextUrl.searchParams;
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const today = isoToday();
  const from = iso.test(q.get("from") ?? "") ? q.get("from")! : isoDaysAgo(365);
  const to = iso.test(q.get("to") ?? "") ? q.get("to")! : today;
  const includeNotes = q.get("notes") === "1";

  const [data, kits] = await Promise.all([loadAll(supabase, user.id), ownKits(supabase)]);
  const kitByEpisodeTest: Record<string, { code: string; status: string; reportReady: boolean }> = {};
  for (const t of data.tests) {
    const kit = t.kit_id ? kits.find((k) => k.id === t.kit_id) : null;
    if (kit) kitByEpisodeTest[t.id] = { code: kit.code, status: kit.status, reportReady: kit.reportReady };
  }
  const pdf = await renderSummaryPdf(data, {
    fullName: user.fullName,
    dateOfBirth: user.dateOfBirth,
    from,
    to,
    includeNotes,
    kitByEpisodeTest,
    generatedOn: today,
  });
  await audit(supabase, user.id, "summary_downloaded", { from, to, includeNotes });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="utee-uti-history-${today}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
