import QRCode from "react-qr-code";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Logo } from "@/components/ui";
import { PrintButton } from "./PrintButton";

/** Printable sheet of QR labels for all unassigned kits. */
export default async function PrintLabelsPage() {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  const { data: kits } = await admin
    .from("kits")
    .select("id, code")
    .eq("status", "created")
    .order("created_at", { ascending: false });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title="Print kit labels"
          subtitle="One label per unassigned kit. Stick one on the box and one on the urine pot."
          action={<PrintButton />}
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {kits?.map((kit) => (
          <div
            key={kit.id}
            className="border border-slate-300 rounded-card p-4 flex flex-col items-center gap-2 bg-white break-inside-avoid"
          >
            <QRCode value={`${appUrl}/k/${kit.code}`} size={112} />
            <p className="font-mono text-sm font-semibold text-midnight">{kit.code}</p>
            <p className="text-[10px] text-slate-500 text-center leading-snug">
              Scan before taking your sample
            </p>
            <Logo className="h-4 w-auto text-maroon" />
          </div>
        ))}
      </div>
    </div>
  );
}
