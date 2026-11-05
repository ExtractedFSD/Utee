import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { currentReturnLabel } from "@/lib/postage";

export const dynamic = "force-dynamic";

/** The printable label as a PDF. Row-level security keeps it to the kit's owner. */
export async function GET(_req: Request, { params }: { params: Promise<{ kitId: string }> }) {
  const { kitId } = await params;
  const supabase = await createClient();
  const label = await currentReturnLabel(supabase, kitId);
  if (!label?.label_pdf) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Buffer.from(label.label_pdf, "base64"), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="utee-return-label-${label.tracking_number}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
