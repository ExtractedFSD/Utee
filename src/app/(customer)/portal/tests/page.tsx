import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumb, Card, CardTitle, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { formatKitCode } from "@/lib/kit-code";
import { kitStage } from "@/lib/kit-stage";
import { formatDate, type KitStatus } from "@/lib/status";

/*
 * Every test kit on the account: the ones in progress first, then closed
 * and cancelled ones under "Past tests". The home page shows only the two
 * most recent and links here.
 */
export default async function TestsPage() {
  const supabase = await createClient();
  const { data: kits } = await supabase
    .from("kits")
    .select("id, code, status, created_at, report_ready_at")
    .order("created_at", { ascending: false });
  const all = kits ?? [];
  const past = all.filter((k) => k.status === "closed" || k.status === "voided");
  const current = all.filter((k) => !past.includes(k));
  const storeUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "#";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader breadcrumb={<Breadcrumb href="/portal" label="Portal" />} title="Your test kits" />
      <Card data-testid="all-kits">
        {current.length ? (
          <KitList kits={current} />
        ) : (
          <div className="text-center py-6">
            <EmptyState title="No tests in progress" body="When you order a Utee test it will appear here once it is on its way." />
            <LinkButton href={storeUrl} variant="secondary" external>Order a Utee test</LinkButton>
          </div>
        )}
      </Card>
      {past.length > 0 && (
        <Card data-testid="past-kits">
          <CardTitle>Past tests</CardTitle>
          <KitList kits={past} />
        </Card>
      )}
    </div>
  );
}

function KitList({ kits }: { kits: { id: string; code: string; status: string; created_at: string; report_ready_at: string | null }[] }) {
  return (
    <ul className="divide-y divide-[rgba(29,0,58,.08)]">
      {kits.map((kit) => {
        const stage = kitStage(kit.status as KitStatus);
        return (
          <li key={kit.id}>
            <Link href={`/portal/tests/${kit.id}`} className="block py-3 -mx-2 px-2 rounded-xl hover:bg-pink-25">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold text-midnight whitespace-nowrap">Kit {formatKitCode(kit.code)}</p>
                <p className="text-xs text-[#8a7a9c] whitespace-nowrap">{kit.report_ready_at ? `Result ${formatDate(kit.report_ready_at)}` : `Started ${formatDate(kit.created_at)}`}</p>
              </div>
              <span className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[.1em] ${stage.tone}`}>{stage.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
