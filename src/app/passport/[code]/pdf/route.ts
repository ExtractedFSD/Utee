import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { loadSharedPassport } from "@/lib/tracker/share-load";
import { renderPassportPdf } from "@/lib/tracker/passport-pdf";
import { formatShareCode, formatUntil, shareUrl } from "@/lib/tracker/share";
import { isoToday } from "@/lib/tracker/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The shared passport as a PDF, carrying the code it was opened with. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const shared = await loadSharedPassport(code);
  if (!shared) return new NextResponse("Not found", { status: 404 });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.myutee.co.uk";
  const url = shareUrl(appUrl, shared.share.code);
  const today = isoToday();
  const pdf = await renderPassportPdf({
    patient: shared.patient,
    profile: shared.profile,
    data: shared.data,
    generatedOn: today,
    share: { url, code: formatShareCode(shared.share.code), until: formatUntil(shared.share.expires_at), qr: await QRCode.toBuffer(url, { type: "png", margin: 1, width: 360 }) },
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="uti-passport-${today}.pdf"`, "cache-control": "private, no-store" },
  });
}
