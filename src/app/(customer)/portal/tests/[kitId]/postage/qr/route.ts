import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { currentReturnLabel } from "@/lib/postage";

export const dynamic = "force-dynamic";

/** The QR for the Post Office counter, as a PNG. Row-level security keeps it to the kit's owner. */
export async function GET(_req: Request, { params }: { params: Promise<{ kitId: string }> }) {
  const { kitId } = await params;
  const supabase = await createClient();
  const label = await currentReturnLabel(supabase, kitId);
  if (!label?.qr_png) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Buffer.from(label.qr_png, "base64"), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" } });
}
