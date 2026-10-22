import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { formatShareCode, formatUntil, shareState, shareUrl } from "@/lib/tracker/share";
import { audit, requireTracker } from "@/lib/tracker/data";
import { loadAllWithUtee } from "@/lib/tracker/load";
import { renderPassportPdf } from "@/lib/tracker/passport-pdf";
import { isoToday } from "@/lib/tracker/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The recurrent UTI summary as a PDF the patient keeps or hands over. */
export async function GET(req: NextRequest) {
  const { supabase, user, profile } = await requireTracker();
  const data = await loadAllWithUtee(supabase, user.id);
  const today = isoToday();
  // ?share=<id>: the printable copy carries that share's code and QR, so the paper leads back to the live passport.
  let share: Parameters<typeof renderPassportPdf>[0]["share"];
  const shareId = req.nextUrl.searchParams.get("share");
  if (shareId && /^[0-9a-f-]{36}$/i.test(shareId)) {
    const { data: row } = await supabase.from("tracker_shares").select("code, expires_at, revoked_at").eq("id", shareId).eq("user_id", user.id).maybeSingle();
    if (row && shareState(row) === "active") {
      const url = shareUrl(process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin, row.code);
      share = { url, code: formatShareCode(row.code), until: formatUntil(row.expires_at), qr: await QRCode.toBuffer(url, { type: "png", margin: 1, width: 360 }) };
    }
  }
  const pdf = await renderPassportPdf({
    patient: { name: user.fullName, email: user.email, dateOfBirth: user.dateOfBirth },
    profile,
    data,
    generatedOn: today,
    share,
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
