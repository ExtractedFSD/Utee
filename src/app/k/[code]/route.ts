import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimKit, isClaimable } from "@/lib/kits";

/**
 * QR code entry point — the QR on the kit box and urine pot encodes
 * {APP_URL}/k/{code}. Where it leads depends on who scanned it:
 *   - signed-out            → login, then back here
 *   - lab (or admin)        → lab specimen page (specimen number only)
 *   - the owning customer   → triage form (or their timeline once activated)
 *   - a customer scanning an unassigned kit (bought outside the Utee store)
 *                           → the kit is claimed for them, then the triage form
 *   - clinic                → clinic case page
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const url = (path: string) => new URL(path, req.nextUrl.origin);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(url(`/login?next=/k/${encodeURIComponent(code)}`));
  }

  const admin = createAdminClient();
  const [{ data: profile }, { data: kit }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", user.id).single(),
    admin.from("kits").select("id, code, status, customer_id").eq("code", code).maybeSingle(),
  ]);

  if (!kit) return NextResponse.redirect(url(`/portal?kit=not-found`));

  switch (profile?.role) {
    case "lab":
      return NextResponse.redirect(url(`/lab/specimen/${kit.code}`));
    case "clinic":
      return NextResponse.redirect(url(`/clinic/case/${kit.id}`));
    case "admin":
    case "super_admin":
      return NextResponse.redirect(url(`/admin/kits/${kit.id}`));
    default: {
      if (isClaimable(kit)) {
        const email = user.email ?? "";
        const claimed = await claimKit(admin, kit, { id: user.id, email });
        if (claimed) return NextResponse.redirect(url(`/triage/${kit.code}`));
        // Someone else claimed it between our read and the update: re-read and
        // fall through to the ordinary ownership check.
        const { data: latest } = await admin
          .from("kits")
          .select("customer_id")
          .eq("id", kit.id)
          .single();
        kit.customer_id = latest?.customer_id ?? kit.customer_id;
      }
      if (kit.customer_id !== user.id) {
        // Kit not linked to this customer — don't leak whose it is.
        return NextResponse.redirect(url(`/portal?kit=not-yours`));
      }
      const preTriage = ["assigned", "shipped", "delivered"].includes(kit.status);
      return NextResponse.redirect(
        url(preTriage ? `/triage/${kit.code}` : `/portal/tests/${kit.id}`)
      );
    }
  }
}
